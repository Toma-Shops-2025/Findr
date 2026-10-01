import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/** If auth.ready never flips, still leave the gate. */
const INDEX_READY_FALLBACK_MS = 4000;

/**
 * Visible first-frame fallback: if you see "Findr" + spinner, JS mounted.
 * Native splash should already be gone (root layout hideAsync on mount).
 */
function BootFallback() {
  return (
    <View style={styles.boot}>
      <Text style={styles.brand}>Findr</Text>
      <ActivityIndicator color={colors.coral} style={styles.spinner} />
    </View>
  );
}

export default function Index() {
  const { user, ready } = useAuth();
  const [forceReady, setForceReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setForceReady(true), INDEX_READY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!ready && !forceReady) {
    return <BootFallback />;
  }

  if (user) {
    return <Redirect href="/(tabs)/nearby" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.mist,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 20,
  },
});
