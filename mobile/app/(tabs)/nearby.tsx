import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { DEMO_COORDS, fuzzLatLng } from '@/lib/locationPrivacy';
import { primaryPhotoUrl } from '@/lib/mediaUrl';
import {
  NEARBY_FETCH_LIMIT,
  NEARBY_RADIUS_MILES,
  buildNearbyGridRows,
  type NearbyGridRow,
} from '@/lib/nearbyGrid';
import {
  readCachedCoords,
  writeCachedCoords,
} from '@/lib/nearbyCoordsCache';
import { AdPlaceholderBand } from '@/components/AdPlaceholderBand';
import { LOOKING_FOR_OPTIONS, type LookingFor, type NearbyCard } from '@/lib/types';

type NearbyResponse = {
  results: NearbyCard[];
  mode?: string;
  note?: string;
};

type Coords = { latitude: number; longitude: number; accuracyM?: number };

/** Show the green privacy line once per app session (not every refresh). */
let privacyFuzzNoteShown = false;

/** Tab refocus: skip full reload if we fetched recently. */
const NEARBY_LIST_STALE_MS = 90_000;

type LoadNearbyMode = 'initial' | 'refresh' | 'silent';

async function resolveConsentedCoords(): Promise<{
  coords: Coords;
  source: 'gps' | 'demo';
  permissionDenied: boolean;
}> {
  const current = await Location.getForegroundPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Location.requestForegroundPermissionsAsync();
    status = asked.status;
  }

  if (status !== 'granted') {
    return {
      coords: { ...DEMO_COORDS },
      source: 'demo',
      permissionDenied: true,
    };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      coords: {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracyM:
          typeof pos.coords.accuracy === 'number' &&
          Number.isFinite(pos.coords.accuracy)
            ? pos.coords.accuracy
            : undefined,
      },
      source: 'gps',
      permissionDenied: false,
    };
  } catch {
    return {
      coords: { ...DEMO_COORDS },
      source: 'demo',
      permissionDenied: false,
    };
  }
}

const NearbyCardCell = memo(function NearbyCardCell({
  item,
  onToggleFavorite,
}: {
  item: NearbyCard;
  onToggleFavorite: (item: NearbyCard) => void;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push('/user/' + item.userId)}
    >
      <View style={styles.photo}>
        <NearbyPhoto item={item} />
        {item.online ? <View style={styles.onlineDot} /> : null}
        <Pressable
          style={styles.favBtn}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite(item);
          }}
          hitSlop={8}
        >
          <Text style={styles.favIcon}>
            {item.isFavorite ? '★' : '☆'}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.displayName}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {item.freeToMeet ? 'Free to meet · ' : ''}
        {item.age != null ? item.age + ' | ' : ''}
        {item.distanceLabel}
      </Text>
    </Pressable>
  );
});

const NearbyPhoto = memo(function NearbyPhoto({ item }: { item: NearbyCard }) {
  const uri = primaryPhotoUrl(item.photoUrls);
  const [failed, setFailed] = useState(false);
  const initial = (item.displayName?.[0] || '?').toUpperCase();

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={styles.photoImage}
        onError={() => setFailed(true)}
      />
    );
  }
  return <Text style={styles.initial}>{initial}</Text>;
});

export default function NearbyScreen() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState<NearbyCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [freeToMeetOnly, setFreeToMeetOnly] = useState(false);
  const [lookingForFilter, setLookingForFilter] = useState<LookingFor[]>([]);

  const lastFetchedAtRef = useRef(0);
  const hasGridDataRef = useRef(false);
  const loadInFlightRef = useRef<Promise<void> | null>(null);
  const loadNearbyRef = useRef<
    (mode?: LoadNearbyMode, forceGps?: boolean) => Promise<void>
  >(() => Promise.resolve());
  const skipFilterEffectRef = useRef(true);

  const loadNearby = useCallback(
    async (mode: LoadNearbyMode = 'initial', forceGps = false) => {
      if (!accessToken) {
        setError('Sign in to see people nearby.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (
        mode === 'silent' &&
        hasGridDataRef.current &&
        Date.now() - lastFetchedAtRef.current < NEARBY_LIST_STALE_MS
      ) {
        return;
      }

      if (loadInFlightRef.current) {
        return loadInFlightRef.current;
      }

      const run = async () => {
        if (mode === 'refresh') setRefreshing(true);
        else if (mode !== 'silent' && !hasGridDataRef.current) setLoading(true);
        setError(null);

      try {
        let coords: Coords;
        let source: 'gps' | 'demo' | 'cached';
        let permissionDenied = false;

        const cached = !forceGps ? readCachedCoords() : null;
        if (cached) {
          coords = cached;
          source = 'cached';
        } else {
          const resolved = await resolveConsentedCoords();
          coords = resolved.coords;
          source = resolved.source;
          permissionDenied = resolved.permissionDenied;
          writeCachedCoords(coords);
        }

        const fuzzed = fuzzLatLng(coords.latitude, coords.longitude);

        const body: {
          latitude: number;
          longitude: number;
          accuracyM?: number;
        } = {
          latitude: fuzzed.latitude,
          longitude: fuzzed.longitude,
        };
        if (coords.accuracyM != null && Number.isFinite(coords.accuracyM)) {
          body.accuracyM = coords.accuracyM;
        }

        const qs = new URLSearchParams({
          radiusMiles: String(NEARBY_RADIUS_MILES),
          limit: String(NEARBY_FETCH_LIMIT),
        });
        if (onlineOnly) qs.set('onlineOnly', 'true');
        if (favoritesOnly) qs.set('favoritesOnly', 'true');
        if (freeToMeetOnly) qs.set('freeToMeetOnly', 'true');
        if (lookingForFilter.length > 0) {
          qs.set('lookingFor', lookingForFilter.join(','));
        }
        qs.set('latitude', String(fuzzed.latitude));
        qs.set('longitude', String(fuzzed.longitude));

        const [data] = await Promise.all([
          apiFetch<NearbyResponse>(`/geo/nearby?${qs.toString()}`, {
            token: accessToken,
          }),
          apiFetch('/geo/location', {
            method: 'POST',
            token: accessToken,
            body: JSON.stringify(body),
          }).catch(() => undefined),
        ]);
        const next = data.results || [];
        setItems(next);
        hasGridDataRef.current = next.length > 0;
        lastFetchedAtRef.current = Date.now();

        const notes: string[] = [];
        if (permissionDenied) {
          notes.push(
            'Location permission off - using demo area so you can still browse Nearby.',
          );
        } else if (source === 'demo') {
          notes.push('GPS unavailable - using demo area.');
        } else if (source === 'cached') {
          // No extra note — avoids re-rendering header every refocus.
        } else if (!privacyFuzzNoteShown) {
          privacyFuzzNoteShown = true;
          notes.push('Approximate location on.');
        }
        if (data.mode === 'memory') {
          notes.push(
            data.note ||
              'Demo geo (in-memory). Samples reset if the API restarts.',
          );
        }
        setModeNote(notes.length ? notes.join(' ') : null);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not load nearby profiles';
        setError(message);
        setItems([]);
        hasGridDataRef.current = false;
        setModeNote(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialLoad(false);
      }
      };

      loadInFlightRef.current = run().finally(() => {
        loadInFlightRef.current = null;
      });
      return loadInFlightRef.current;
    },
    [accessToken, favoritesOnly, freeToMeetOnly, lookingForFilter, onlineOnly],
  );

  loadNearbyRef.current = loadNearby;

  const toggleFavorite = async (item: NearbyCard) => {
    if (!accessToken) return;
    const isFav = Boolean(item.isFavorite);
    try {
      await apiFetch(`/geo/favorites/${item.userId}`, {
        method: isFav ? 'DELETE' : 'POST',
        token: accessToken,
      });
      setItems((prev) =>
        prev.map((row) =>
          row.userId === item.userId
            ? { ...row, isFavorite: !isFav }
            : row,
        ),
      );
    } catch {
      // ignore transient errors
    }
  };

  useFocusEffect(
    useCallback(() => {
      const stale =
        Date.now() - lastFetchedAtRef.current > NEARBY_LIST_STALE_MS;
      if (!hasGridDataRef.current) {
        void loadNearbyRef.current('initial');
      } else if (stale) {
        void loadNearbyRef.current('silent');
      }
    }, [accessToken]),
  );

  useEffect(() => {
    if (!accessToken) return;
    if (skipFilterEffectRef.current) {
      skipFilterEffectRef.current = false;
      return;
    }
    void loadNearby('refresh');
  }, [onlineOnly, favoritesOnly, freeToMeetOnly, lookingForFilter, accessToken, loadNearby]);

  const gridRows = useMemo(() => buildNearbyGridRows(items), [items]);

  const listHeader = useMemo(
    () => (
    <>
      <Text style={styles.brand}>Findr</Text>
      <Text style={styles.sub}>
        Within {NEARBY_RADIUS_MILES} mi · closest first (fresh ~6h)
      </Text>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.filterChip, onlineOnly && styles.filterChipOn]}
          onPress={() => setOnlineOnly((v) => !v)}
        >
          <Text
            style={[styles.filterText, onlineOnly && styles.filterTextOn]}
          >
            Online
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, favoritesOnly && styles.filterChipOn]}
          onPress={() => setFavoritesOnly((v) => !v)}
        >
          <Text
            style={[styles.filterText, favoritesOnly && styles.filterTextOn]}
          >
            Favorites
          </Text>
        </Pressable>
        <Pressable
          style={[styles.filterChip, freeToMeetOnly && styles.filterChipOn]}
          onPress={() => setFreeToMeetOnly((v) => !v)}
        >
          <Text
            style={[styles.filterText, freeToMeetOnly && styles.filterTextOn]}
          >
            Free to meet
          </Text>
        </Pressable>
      </View>
      <Text style={styles.filterHint}>Looking for (free, inclusive)</Text>
      <View style={styles.filterRow}>
        {LOOKING_FOR_OPTIONS.map((option) => {
          const on = lookingForFilter.includes(option);
          return (
            <Pressable
              key={option}
              style={[styles.filterChip, on && styles.filterChipOn]}
              onPress={() =>
                setLookingForFilter((prev) =>
                  on ? prev.filter((v) => v !== option) : [...prev, option],
                )
              }
            >
              <Text style={[styles.filterText, on && styles.filterTextOn]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {modeNote ? <Text style={styles.note}>{modeNote}</Text> : null}
      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            style={styles.retry}
            onPress={() => void loadNearbyRef.current('initial', true)}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}
    </>
    ),
    [onlineOnly, favoritesOnly, freeToMeetOnly, lookingForFilter, modeNote, error],
  );

  const listEmpty = useMemo(
    () => (
    <View style={styles.stateBox}>
      {loading && items.length === 0 && !refreshing ? (
        <View style={styles.inlineLoad}>
          <ActivityIndicator color={colors.coral} />
          <Text style={styles.sub}>
            {initialLoad ? 'Finding people near you…' : 'Refreshing…'}
          </Text>
        </View>
      ) : !error ? (
        <>
          <Text style={styles.emptyTitle}>Nobody nearby yet</Text>
          <Text style={styles.emptyBody}>
            You are the only visible person in this area right now. Pull down
            to refresh after friends join.
          </Text>
          <Pressable
            style={styles.retry}
            onPress={() => void loadNearbyRef.current('refresh', true)}
          >
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </>
      ) : null}
    </View>
    ),
    [error, initialLoad, loading, refreshing, items.length],
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.listFlex}
        data={gridRows}
        keyExtractor={(row, index) => gridRowKey(row, index)}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={<AdPlaceholderBand context="Nearby" />}
        contentContainerStyle={[
          styles.list,
          gridRows.length === 0 && styles.listGrow,
        ]}
        alwaysBounceVertical
        removeClippedSubviews
        windowSize={7}
        maxToRenderPerBatch={9}
        initialNumToRender={12}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadNearby('refresh', true)}
            tintColor={colors.coral}
            colors={[colors.coral]}
          />
        }
        renderItem={({ item: row }) => {
          if (row.kind === 'sectionTitle') {
            return (
              <Text style={styles.sectionTitle}>{row.title}</Text>
            );
          }
          if (row.kind === 'separator') {
            return (
              <View style={styles.gridSeparator} accessibilityRole="text">
                <View style={styles.gridSeparatorInner}>
                  <Text style={styles.gridSeparatorBrand}>Findr</Text>
                  <Text style={styles.gridSeparatorSub}>
                    Discover more within {NEARBY_RADIUS_MILES} miles
                  </Text>
                </View>
              </View>
            );
          }
          const pads = 3 - row.cards.length;
          return (
            <View style={styles.row}>
              {row.cards.map((card) => (
                <NearbyCardCell
                  key={card.userId}
                  item={card}
                  onToggleFavorite={(c) => void toggleFavorite(c)}
                />
              ))}
              {pads > 0
                ? Array.from({ length: pads }).map((_, i) => (
                    <View key={`pad-${i}`} style={styles.cardPad} />
                  ))
                : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function gridRowKey(row: NearbyGridRow, index: number): string {
  if (row.kind === 'sectionTitle') return `title-${row.title}-${index}`;
  if (row.kind === 'separator') return `sep-${index}`;
  return `row-${row.cards.map((c) => c.userId).join('-')}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  inlineLoad: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  brand: {
    fontFamily: typography.brand,
    color: colors.coral,
    fontSize: 22,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipOn: {
    borderColor: colors.coral,
    backgroundColor: 'rgba(255,107,74,0.15)',
  },
  filterHint: {
    fontFamily: typography.body,
    fontSize: 12,
    color: colors.mistMuted,
    marginTop: spacing.xs,
  },
  filterText: {
    color: colors.mistMuted,
    fontSize: 13,
    fontFamily: typography.bodyMedium,
  },
  filterTextOn: {
    color: colors.coral,
  },
  favBtn: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  favIcon: {
    color: colors.coral,
    fontSize: 14,
  },
  sub: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    fontSize: 12,
  },
  note: {
    fontFamily: typography.body,
    color: colors.teal,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: 11,
    opacity: 0.9,
  },
  stateBox: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  error: {
    fontFamily: typography.body,
    color: colors.danger,
    fontSize: 14,
  },
  emptyTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 18,
  },
  emptyBody: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryText: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 14,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  listGrow: {
    flexGrow: 1,
  },
  sectionTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 15,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  gridSeparator: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  gridSeparatorInner: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  gridSeparatorBrand: {
    fontFamily: typography.brand,
    color: colors.coral,
    fontSize: 18,
  },
  gridSeparatorSub: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    maxWidth: '33.33%',
    gap: 2,
  },
  cardPad: {
    flex: 1,
    maxWidth: '33.33%',
  },
  photo: {
    aspectRatio: 3 / 4,
    borderRadius: radii.sm,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  initial: {
    fontFamily: typography.brand,
    fontSize: 28,
    color: colors.coral,
  },
  onlineDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  name: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 12,
    paddingHorizontal: 2,
  },
  meta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 10,
    paddingHorizontal: 2,
  },
});