import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useGoogleAuthSession } from '@/lib/googleAuthContext';

type Props = {
  label?: string;
  disabled?: boolean;
};

export function GoogleSignInButton({
  label = 'Continue with Google',
  disabled = false,
}: Props) {
  const { request, response, promptAsync, configured } = useGoogleAuthSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const promptOpenedRef = useRef(false);

  useEffect(() => {
    if (!response) return;
    if (
      response.type === 'success' ||
      response.type === 'cancel' ||
      response.type === 'dismiss' ||
      response.type === 'error'
    ) {
      promptOpenedRef.current = false;
      setBusy(false);
    }
  }, [response]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      // Android custom-scheme returns often never resolve promptAsync(); clear the
      // button spinner when the app becomes active again.
      if (next === 'active' && promptOpenedRef.current) {
        promptOpenedRef.current = false;
        setBusy(false);
      }
    });
    return () => sub.remove();
  }, []);

  if (!configured) {
    return null;
  }

  return (
    <>
      <Pressable
        style={[styles.btn, (!request || busy || disabled) && styles.btnDisabled]}
        disabled={!request || busy || disabled}
        onPress={() => {
          setError(null);
          setBusy(true);
          promptOpenedRef.current = true;
          void promptAsync()
            .catch((err) => {
              setError(
                err instanceof Error ? err.message : 'Could not open Google sign-in',
              );
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? (
          <ActivityIndicator color={colors.mist} />
        ) : (
          <Text style={styles.text}>{label}</Text>
        )}
      </Pressable>
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  text: {
    fontFamily: typography.bodyMedium,
    fontSize: 15,
    color: colors.mist,
  },
  err: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});
