import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';
import { useCompleteGoogleSignIn } from '@/lib/completeGoogleSignIn';

WebBrowser.maybeCompleteAuthSession();

/** findr://oauthredirect — complete Google sign-in on this route. */
export default function GoogleOAuthRedirect() {
  useCompleteGoogleSignIn(true);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.coral} size="large" />
      <Text style={styles.text}>Finishing Google sign-in…</Text>
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
});
