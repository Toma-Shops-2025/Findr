import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { unblockUser } from '@/lib/safety';
import type { BlockedUser, PublicProfile } from '@/lib/types';

const SUPPORT_EMAIL = 'contactus@myfindr.fun';
const DELETE_ACCOUNT_URL = 'https://myfindr.fun/delete-account/';

/**
 * Settings + blocked list / unblock + visibility + delete + logout.
 * Tab title: Safety. Must scroll above the bottom tab bar.
 * Stage 1: ASCII-only user strings (no em dash / middle dot).
 */
export default function SettingsScreen() {
  const { user, accessToken, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [blocks, setBlocks] = useState<BlockedUser[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [visibilityLoading, setVisibilityLoading] = useState(true);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadVisibility = useCallback(async () => {
    if (!accessToken) {
      setVisibilityLoading(false);
      return;
    }
    setVisibilityLoading(true);
    try {
      const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
        token: accessToken,
      });
      setIsVisible(data.profile?.isVisible !== false);
    } catch {
      // Keep last known toggle if profile fetch fails.
    } finally {
      setVisibilityLoading(false);
    }
  }, [accessToken]);

  const loadBlocks = useCallback(
    async (isRefresh = false) => {
      if (!accessToken) {
        setBlocks([]);
        setLoadingBlocks(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoadingBlocks(true);
      setBlocksError(null);
      try {
        const data = await apiFetch<{ blocks: BlockedUser[] }>('/safety/blocks', {
          token: accessToken,
        });
        setBlocks(data.blocks ?? []);
      } catch (err) {
        setBlocksError(
          err instanceof Error ? err.message : 'Could not load blocked users',
        );
        setBlocks([]);
      } finally {
        setLoadingBlocks(false);
        setRefreshing(false);
      }
    },
    [accessToken],
  );

  useFocusEffect(
    useCallback(() => {
      loadBlocks();
      loadVisibility();
    }, [loadBlocks, loadVisibility]),
  );

  const onToggleVisibility = (next: boolean) => {
    if (!accessToken || visibilitySaving) return;
    const prev = isVisible;
    setIsVisible(next);
    setVisibilitySaving(true);
    void (async () => {
      try {
        const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
          method: 'PUT',
          token: accessToken,
          body: JSON.stringify({ isVisible: next }),
        });
        setIsVisible(data.profile?.isVisible !== false);
      } catch (err) {
        setIsVisible(prev);
        Alert.alert(
          'Could not update visibility',
          err instanceof Error ? err.message : 'Try again',
        );
      } finally {
        setVisibilitySaving(false);
      }
    })();
  };

  const onUnblock = (item: BlockedUser) => {
    if (!accessToken) return;
    Alert.alert(
      'Unblock?',
      `${item.displayName} will be able to see you in Nearby and chat again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: () => {
            void (async () => {
              setUnblockingId(item.userId);
              try {
                await unblockUser(accessToken, item.userId);
                setBlocks((prev) => prev.filter((b) => b.userId !== item.userId));
              } catch (err) {
                Alert.alert(
                  'Could not unblock',
                  err instanceof Error ? err.message : 'Try again',
                );
              } finally {
                setUnblockingId(null);
              }
            })();
          },
        },
      ],
    );
  };

  const runDeleteAccount = async () => {
    if (!accessToken || deleting) return;
    setDeleting(true);
    try {
      await apiFetch('/auth/me', { method: 'DELETE', token: accessToken });
      await logout();
      router.replace('/(auth)/login');
      Alert.alert('Account deleted', 'Your Findr account has been deleted.');
    } catch (err) {
      Alert.alert(
        'Could not delete account',
        (err instanceof Error ? err.message : 'Try again') +
          `. Or email ${SUPPORT_EMAIL}`,
      );
    } finally {
      setDeleting(false);
    }
  };

  const onDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your Findr account and hides your profile. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void runDeleteAccount();
          },
        },
      ],
    );
  };

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  // Tab bar (~56) + home indicator so Legal & help / FAQ & Safety stay reachable.
  const bottomPad = Math.max(insets.bottom, 8) + 72;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            loadBlocks(true);
            loadVisibility();
          }}
          tintColor={colors.coral}
        />
      }
    >
      <Text style={styles.lead}>
        Visibility, account, and safety tools. Findr is 18+ only.
      </Text>

      {user ? (
        <Text style={styles.signedIn}>Signed in as {user.email}</Text>
      ) : null}

      <Text style={styles.section}>Blocked users</Text>
      {loadingBlocks ? (
        <ActivityIndicator color={colors.coral} style={{ marginVertical: 12 }} />
      ) : blocksError ? (
        <View style={styles.emptyBox}>
          <Text style={styles.error}>{blocksError}</Text>
          <Pressable style={styles.retry} onPress={() => loadBlocks()}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : blocks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No one blocked</Text>
          <Text style={styles.emptyBody}>
            When you block someone from Nearby, their profile, or a chat, they
            show up here. You can unblock anytime.
          </Text>
        </View>
      ) : (
        <View style={styles.blockList}>
          {blocks.map((item) => (
            <View key={item.userId} style={styles.blockRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{item.displayName}</Text>
                <Text style={styles.rowMeta}>Blocked</Text>
              </View>
              <Pressable
                style={styles.unblockBtn}
                onPress={() => onUnblock(item)}
                disabled={unblockingId === item.userId}
              >
                <Text style={styles.unblockText}>
                  {unblockingId === item.userId ? '...' : 'Unblock'}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>Legal & help</Text>
      <Pressable style={styles.row} onPress={() => router.push('/legal/terms')}>
        <Text style={styles.rowTitle}>Terms of Service</Text>
        <Text style={styles.rowMeta}>
          In-app template - counsel review before launch
        </Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/legal/privacy')}>
        <Text style={styles.rowTitle}>Privacy Policy</Text>
        <Text style={styles.rowMeta}>What we collect and why</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => router.push('/legal/faq')}>
        <Text style={styles.rowTitle}>FAQ & Safety</Text>
        <Text style={styles.rowMeta}>Age, reporting, meetups</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => router.push('/legal/guidelines')}
      >
        <Text style={styles.rowTitle}>Community Guidelines</Text>
        <Text style={styles.rowMeta}>How to behave on Findr</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() => {
          void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
        }}
      >
        <Text style={styles.rowTitle}>Contact support</Text>
        <Text style={styles.rowMeta}>{SUPPORT_EMAIL}</Text>
      </Pressable>

      <Text style={styles.section}>Account</Text>
      <View style={styles.visibilityRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Visibility</Text>
          <Text style={styles.rowMeta}>
            Show me in Nearby |{' '}
            {visibilityLoading ? '...' : isVisible ? 'On' : 'Off'}
          </Text>
        </View>
        {visibilityLoading ? (
          <ActivityIndicator color={colors.coral} />
        ) : (
          <Switch
            value={isVisible}
            onValueChange={onToggleVisibility}
            disabled={visibilitySaving}
            trackColor={{ false: colors.border, true: colors.teal }}
            thumbColor={colors.mist}
          />
        )}
      </View>
      <Pressable
        style={styles.row}
        onPress={onDeleteAccount}
        disabled={deleting}
      >
        <Text style={[styles.rowTitle, styles.danger]}>
          {deleting ? 'Deleting...' : 'Delete account'}
        </Text>
        <Text style={styles.rowMeta}>
          Permanent | or {DELETE_ACCOUNT_URL.replace('https://', '')}
        </Text>
      </Pressable>
      <Pressable style={[styles.row, styles.logout]} onPress={onLogout}>
        <Text style={styles.rowTitle}>Log out</Text>
        <Text style={styles.rowMeta}>Clears JWT from device session storage</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  content: {
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
  emptyBox: {
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  emptyTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 16,
  },
  emptyBody: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  error: {
    fontFamily: typography.body,
    color: colors.danger,
    fontSize: 14,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  retryText: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 14,
  },
  blockList: {
    gap: spacing.sm,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  unblockBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  unblockText: {
    fontFamily: typography.bodyMedium,
    color: colors.teal,
    fontSize: 13,
  },
  row: {
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
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
