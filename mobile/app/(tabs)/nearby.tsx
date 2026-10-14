import { useCallback, useEffect, useState } from 'react';
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
import type { NearbyCard } from '@/lib/types';

type NearbyResponse = {
  results: NearbyCard[];
  mode?: string;
  note?: string;
};

type Coords = { latitude: number; longitude: number; accuracyM?: number };

/** Show the green privacy line once per app session (not every refresh). */
let privacyFuzzNoteShown = false;

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

function NearbyPhoto({ item }: { item: NearbyCard }) {
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
}

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

  const loadNearby = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setError('Sign in to see people nearby.');
        setLoading(false);
        return;
      }

      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const { coords, source, permissionDenied } =
          await resolveConsentedCoords();
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
          radiusKm: '50',
          limit: '50',
        });
        if (onlineOnly) qs.set('onlineOnly', 'true');
        if (favoritesOnly) qs.set('favoritesOnly', 'true');
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
        setItems(data.results || []);

        const notes: string[] = [];
        if (permissionDenied) {
          notes.push(
            'Location permission off - using demo area so you can still browse Nearby.',
          );
        } else if (source === 'demo') {
          notes.push('GPS unavailable - using demo area.');
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
        setModeNote(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
        setInitialLoad(false);
      }
    },
    [accessToken, favoritesOnly, onlineOnly],
  );

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
      loadNearby();
    }, [loadNearby]),
  );

  useEffect(() => {
    if (!accessToken || loading) return;
    void loadNearby(true);
  }, [onlineOnly, favoritesOnly]);

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Findr</Text>
      <Text style={styles.sub}>Nearby — sorted by distance (fresh ~6h)</Text>
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
      </View>
      {modeNote ? <Text style={styles.note}>{modeNote}</Text> : null}
      {error ? (
        <View style={styles.stateBox}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => loadNearby()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!error && items.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.emptyTitle}>Nobody nearby yet</Text>
          <Text style={styles.emptyBody}>
            You are the only visible person in this area right now. Pull to
            refresh after friends join.
          </Text>
          <Pressable style={styles.retry} onPress={() => loadNearby(true)}>
            <Text style={styles.retryText}>Refresh</Text>
          </Pressable>
        </View>
      ) : null}

      {loading && items.length === 0 ? (
        <View style={styles.inlineLoad}>
          <ActivityIndicator color={colors.coral} />
          <Text style={styles.sub}>
            {initialLoad ? 'Finding people near you…' : 'Refreshing…'}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.userId}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadNearby(true)}
            tintColor={colors.coral}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push('/user/' + item.userId)}
          >
            <View style={styles.photo}>
              <NearbyPhoto item={item} />
              {item.online ? <View style={styles.onlineDot} /> : null}
              <Pressable
                style={styles.favBtn}
                onPress={() => void toggleFavorite(item)}
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
              {item.age != null ? item.age + ' | ' : ''}
              {item.distanceLabel}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
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
  list: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
    paddingTop: spacing.xs,
  },
  row: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flex: 1,
    maxWidth: '33.33%',
    gap: 2,
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