import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordField } from '@/components/PasswordField';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { GOOGLE_ONLY_AUTH } from '@/lib/authUi';

export default function LoginScreen() {
  const { login, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(!GOOGLE_ONLY_AUTH);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const onLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await login({
        email: email.trim(),
        password,
      });
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
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
      <View style={styles.content}>
        <Text style={styles.brand}>Findr</Text>
        <Text style={styles.headline}>Welcome back.</Text>
        <Text style={styles.support}>
          {GOOGLE_ONLY_AUTH
            ? 'Sign in with Google. Session ends when you close the app.'
            : 'Sign in with Google or email until Google is fully verified on your build.'}
        </Text>

        <GoogleSignInButton />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!GOOGLE_ONLY_AUTH ? (
          <Pressable onPress={() => setShowEmailLogin((v) => !v)}>
            <Text style={styles.forgot}>
              {showEmailLogin ? 'Hide email login' : 'Use email (existing accounts)'}
            </Text>
          </Pressable>
        ) : null}

        {showEmailLogin && !GOOGLE_ONLY_AUTH ? (
          <>
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
            <PasswordField
              value={password}
              onChangeText={setPassword}
              placeholder="Your password"
              returnKeyType="done"
              onSubmitEditing={onLogin}
            />
            <Pressable
              onPress={async () => {
                if (!email.trim()) {
                  setError('Enter your email first, then tap Forgot password.');
                  return;
                }
                setResetBusy(true);
                setError(null);
                try {
                  await requestPasswordReset(email.trim());
                  setResetSent(true);
                } catch {
                  setError('Could not send reset email. Try again later.');
                } finally {
                  setResetBusy(false);
                }
              }}
              disabled={resetBusy}
            >
              <Text style={styles.forgot}>
                {resetSent ? 'Reset email sent (check inbox)' : 'Forgot password?'}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.cta, busy && styles.ctaDisabled]}
              onPress={onLogin}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.ink} />
              ) : (
                <Text style={styles.ctaText}>Log in with email</Text>
              )}
            </Pressable>
          </>
        ) : null}

        <Link href="/(auth)/onboarding" style={styles.link}>
          New here? Create an account
        </Link>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl * 2,
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
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.inkElevated,
  },
  checkboxOn: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  checkText: {
    flex: 1,
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  forgot: {
    fontFamily: typography.bodyMedium,
    color: colors.teal,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
