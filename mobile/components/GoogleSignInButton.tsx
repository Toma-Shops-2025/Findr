import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { idTokenFromGoogleResponse, useGoogleAuthRequest } from '@/lib/googleAuth';

type Props = {
  onIdToken: (idToken: string) => Promise<void>;
  label?: string;
};

export function GoogleSignInButton({ onIdToken, label = 'Continue with Google' }: Props) {
  const { request, response, promptAsync, configured } = useGoogleAuthRequest();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = idTokenFromGoogleResponse(response);
    if (!token) return;
    setBusy(true);
    setError(null);
    void onIdToken(token)
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      })
      .finally(() => setBusy(false));
  }, [response, onIdToken]);

  if (!configured) {
    return null;
  }

  return (
    <>
      <Pressable
        style={[styles.btn, (!request || busy) && styles.btnDisabled]}
        disabled={!request || busy}
        onPress={() => {
          setError(null);
          void promptAsync();
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
