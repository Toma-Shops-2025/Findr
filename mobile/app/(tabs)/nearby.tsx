import { useCallback, useState } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modeNote, setModeNote] = useState<string | null>(null);

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

        // Lat/lng stay floats. accuracyM is also a float (meters) - API column
        // is DOUBLE PRECISION after migration 007. Do not coerce to int.
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

        await apiFetch('/geo/location', {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify(body),
        });

        const data = await apiFetch<NearbyResponse>(
          '/geo/nearby?radiusKm=50&limit=50',
          { token: accessToken },
        );
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
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadNearby();
    }, [loadNearby]),
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
        <Text style={styles.sub}>Finding people near you...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>Findr</Text>
      <Text style={styles.sub}>Nearby - distances are approximate</Text>
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