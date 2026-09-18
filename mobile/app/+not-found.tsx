import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/(auth)/onboarding" style={styles.link}>
          <Text style={styles.linkText}>Go to Findr</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.ink,
    padding: 24,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 18,
    color: colors.mist,
  },
  link: { marginTop: 16 },
  linkText: {
    fontFamily: typography.body,
    color: colors.coral,
  },
});
