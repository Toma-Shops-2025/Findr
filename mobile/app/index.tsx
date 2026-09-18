import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function Index() {
  const { user, ready } = useAuth();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/nearby" />;
  }

  return <Redirect href="/(auth)/onboarding" />;
}
