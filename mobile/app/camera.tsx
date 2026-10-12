import { useEffect, useState, type ComponentType } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';

import { colors, spacing } from '@/constants/theme';

/** Lazy-load expo-camera so the rest of the app does not depend on native camera at startup. */
export default function CameraRoute() {
  const [Screen, setScreen] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/components/FindrCameraScreen')
      .then((mod) => {
        if (!cancelled) setScreen(() => mod.default);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Camera unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Camera' }} />
        <Text style={styles.title}>Camera unavailable</Text>
        <Text style={styles.body}>{error}</Text>
      </View>
    );
  }

  if (!Screen) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Camera' }} />
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  return <Screen />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: { color: colors.mist, fontSize: 18, fontWeight: '600' },
  body: { color: colors.mistMuted, textAlign: 'center', fontSize: 14 },
});
