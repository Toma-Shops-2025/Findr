import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
      router.replace('/(tabs)/nearby');
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'invalid_credentials') setError('Invalid email or password.');
      else setError((err as Error).message || 'Could not log in. Is the API running?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.heroGlow} />
      <View style={styles.content}>
        <Text style={styles.brand}>Findr</Text>
        <Text style={styles.headline}>Welcome back.</Text>
        <Text style={styles.support}>Log in to pick up where you left off.</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@email.com"
          placeholderTextColor={colors.mistMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          placeholderTextColor={colors.mistMuted}
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.cta, busy && styles.ctaDisabled]}
          onPress={onLogin}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.ink} />
          ) : (
            <Text style={styles.ctaText}>Log in</Text>
          )}
        </Pressable>

        <Link href="/(auth)/onboarding" style={styles.link}>
          New here? Create an account
        </Link>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.teal,
    opacity: 0.16,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    gap: spacing.md,
  },
  brand: {
    fontFamily: typography.brand,
    fontSize: 48,
    color: colors.mist,
    letterSpacing: -1,
  },
  headline: {
    fontFamily: typography.heading,
    fontSize: 22,
    color: colors.mist,
    lineHeight: 28,
  },
  support: {
    fontFamily: typography.body,
    fontSize: 16,
    color: colors.mistMuted,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.bodyMedium,
    fontSize: 13,
    color: colors.mistMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.mist,
    fontFamily: typography.body,
    fontSize: 16,
  },
  error: {
    fontFamily: typography.body,
    color: colors.danger,
    fontSize: 14,
  },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    fontFamily: typography.heading,
    color: colors.ink,
    fontSize: 16,
  },
  link: {
    marginTop: spacing.sm,
    fontFamily: typography.bodyMedium,
    color: colors.teal,
    fontSize: 15,
    textAlign: 'center',
  },
});
