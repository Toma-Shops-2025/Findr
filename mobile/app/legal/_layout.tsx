import { Stack } from 'expo-router';

import { colors, typography } from '@/constants/theme';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.mist,
        headerTitleStyle: { fontFamily: typography.heading, fontWeight: '600' },
        contentStyle: { backgroundColor: colors.ink },
      }}
    >
      <Stack.Screen name="terms" options={{ title: 'Terms of Service' }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy Policy' }} />
      <Stack.Screen name="faq" options={{ title: 'FAQ & Safety' }} />
      <Stack.Screen name="guidelines" options={{ title: 'Community Guidelines' }} />
    </Stack>
  );
}