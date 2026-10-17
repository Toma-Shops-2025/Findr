import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  isGoogleOAuthReturnUrl,
  readGoogleOAuthReturnUrl,
} from '@/lib/googleOAuthRecovery';

/**
 * Cold-start gate: wait for SecureStore session restore (ready / isLoading)
 * before redirecting to login or Nearby. Previously checked isLoading which
 * auth never exposed, so every reopen bounced to login.
 */
export default function Index() {
  const { accessToken, ready, isLoading } = useAuth();
  const [finishingGoogle, setFinishingGoogle] = useState(false);

  useEffect(() => {
    void readGoogleOAuthReturnUrl().then((url) => {
      if (url && isGoogleOAuthReturnUrl(url)) setFinishingGoogle(true);
    });
  }, []);

  useEffect(() => {
    if (accessToken) setFinishingGoogle(false);
  }, [accessToken]);

  if (finishingGoogle && !accessToken) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
        }}
      >
        <ActivityIndicator color={colors.coral} size="large" />
        <Text
          style={{
            fontFamily: typography.body,
            color: colors.mistMuted,
            fontSize: 15,
            textAlign: 'center',
          }}
        >
          Finishing Google sign-in…
        </Text>
      </View>
    );
  }

  if (!ready || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.mist} />
      </View>
    );
  }
  if (!accessToken) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(tabs)/nearby" />;
}