import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/**
 * Cold-start gate: wait for SecureStore session restore (ready / isLoading)
 * before redirecting to login or Nearby. Previously checked isLoading which
 * auth never exposed, so every reopen bounced to login.
 */
export default function Index() {
  const { accessToken, ready, isLoading } = useAuth();
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