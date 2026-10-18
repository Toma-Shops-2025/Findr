import { Redirect, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { useGoogleOAuthRedirectScreen } from '@/lib/googleOAuthRedirectScreen';
import { clearPendingGoogleOAuth } from '@/lib/googleOAuthRecovery';
import { setLastGoogleAuthError } from '@/lib/googleAuthErrors';

WebBrowser.maybeCompleteAuthSession();

/** findr://oauthredirect — complete Google sign-in on this route. */
export default function GoogleOAuthRedirect() {
  const { accessToken } = useAuth();
  const statusLine = useGoogleOAuthRedirectScreen();

  if (accessToken) {
    return <Redirect href="/(tabs)/nearby" />;
  }

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.coral} size="large" />
      <Text style={styles.text}>{statusLine}</Text>
      <Pressable
        onPress={() => {
          setLastGoogleAuthError(null);
          void clearPendingGoogleOAuth();
          router.replace('/(auth)/login');
        }}
        accessibilityRole="button"
      >
        <Text style={styles.cancel}>Cancel and return to login</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  text: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 15,
    textAlign: 'center',
  },
  cancel: {
    fontFamily: typography.bodyMedium,
    color: colors.teal,
    fontSize: 15,
    marginTop: 8,
  },
});
