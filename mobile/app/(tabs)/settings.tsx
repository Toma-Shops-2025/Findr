import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

/**
 * Settings + safety stubs (block / report) + logout.
 * TODO: call /safety/block and /safety/report when API is live.
 */
export default function SettingsScreen() {
  const { user, logout } = useAuth();

  const stubBlock = () => {
    Alert.alert('Block user', 'Block stub — hides from grid and chat both ways.');
  };

  const stubReport = () => {
    Alert.alert('Report', 'Report stub — opens reason picker + evidence snapshot.');
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.lead}>
        Visibility, account, and safety tools. Findr is 18+ only.
      </Text>

      {user ? (
        <Text style={styles.signedIn}>Signed in as {user.email}</Text>
      ) : null}

      <Text style={styles.section}>Safety</Text>
      <Pressable style={styles.row} onPress={stubBlock}>
        <Text style={styles.rowTitle}>Block someone</Text>
        <Text style={styles.rowMeta}>Stub · mutual invisibility</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={stubReport}>
        <Text style={styles.rowTitle}>Report someone</Text>
        <Text style={styles.rowMeta}>Stub · reasons + admin queue</Text>
      </Pressable>

      <Text style={styles.section}>Account</Text>
      <Pressable style={styles.row} onPress={() => Alert.alert('Visibility', 'Toggle stub')}>
        <Text style={styles.rowTitle}>Visibility</Text>
        <Text style={styles.rowMeta}>Show me in Nearby · On</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => Alert.alert('Delete account', 'In-app deletion required by stores — stub.')}
      >
        <Text style={[styles.rowTitle, styles.danger]}>Delete account</Text>
        <Text style={styles.rowMeta}>Stub · irreversible</Text>
      </Pressable>
      <Pressable style={[styles.row, styles.logout]} onPress={onLogout}>
        <Text style={styles.rowTitle}>Log out</Text>
        <Text style={styles.rowMeta}>Clears JWT from SecureStore</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  lead: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  signedIn: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  section: {
    fontFamily: typography.heading,
    color: colors.teal,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  row: {
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  logout: {
    marginTop: spacing.md,
  },
  rowTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 16,
  },
  rowMeta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 13,
  },
  danger: {
    color: colors.danger,
  },
});
