import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useSafetyActions } from '@/lib/useSafetyActions';
import type { ConversationSummary, PublicMessage } from '@/lib/types';

const POLL_MS = 4000;

function messagePreviewText(item: PublicMessage): string {
  const body = (item.body ?? '').trim();
  if (body) return body;
  if (item.imageUrl) return '[Photo]';
  if (item.videoUrl) return '[Video]';
  if (item.location) return '[Location]';
  return '';
}

/**
 * Stage 2c text thread only. Polling (~4s). No camera / av / media attach /
 * likes UI (those stay parked for later Stage 2 slices).
 */
export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { blockUser, reportUser, reportModals } = useSafetyActions(accessToken);
  const navigation = useNavigation();
  const [conversation, setConversation] = useState<ConversationSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<PublicMessage>>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    try {
      const [meta, msgs] = await Promise.all([
        apiFetch<{ conversation: ConversationSummary }>(
          `/chat/conversations/${id}`,
          { token: accessToken },
        ),
        apiFetch<{ messages: PublicMessage[] }>(
          `/chat/conversations/${id}/messages?limit=100`,
          { token: accessToken },
        ),
      ]);
      setConversation(meta.conversation);
      setMessages(msgs.messages ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load chat');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!accessToken || !id) return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const msgs = await apiFetch<{ messages: PublicMessage[] }>(
            `/chat/conversations/${id}/messages?limit=100`,
            { token: accessToken },
          );
          setMessages(msgs.messages ?? []);
        } catch {
          // Keep last good state while offline briefly.
        }
      })();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [accessToken, id]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        conversation && accessToken ? (
          <View style={styles.headerActions}>
            <Pressable
              onPress={() =>
                reportUser({
                  userId: conversation.peerUserId,
                  displayName: conversation.peerDisplayName,
                  contentType: 'profile',
                })
              }
              hitSlop={8}
            >
              <Text style={styles.headerLink}>Report</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                blockUser({
                  userId: conversation.peerUserId,
                  displayName: conversation.peerDisplayName,
                  onBlocked: () => router.replace('/(tabs)/chats'),
                })
              }
              hitSlop={8}
            >
              <Text style={styles.headerLinkDanger}>Block</Text>
            </Pressable>
          </View>
        ) : null,
    });
  }, [navigation, conversation, accessToken, blockUser, reportUser]);

  const onSend = async () => {
    if (!accessToken || !id) return;
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft('');
    try {
      const data = await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${id}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ body }),
        },
      );
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen
        options={{
          title: conversation?.peerDisplayName ?? 'Chat',
        }}
      />
      {reportModals}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <Text style={styles.empty}>Say hello - be kind on Findr.</Text>
        }
        renderItem={({ item }) => {
          const text = messagePreviewText(item);
          if (!text) return null;
          return (
            <View
              style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}
            >
              <Text
                style={[styles.bubbleText, item.mine && styles.mineText]}
              >
                {text}
              </Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <TextInput
          placeholder="Message..."
          placeholderTextColor={colors.mistMuted}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[
            styles.send,
            (!draft.trim() || sending) && styles.sendDisabled,
          ]}
          onPress={onSend}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: spacing.sm,
  },
  headerLink: {
    fontFamily: typography.bodyMedium,
    color: colors.teal,
    fontSize: 13,
  },
  headerLinkDanger: {
    fontFamily: typography.bodyMedium,
    color: colors.danger,
    fontSize: 13,
  },
  error: {
    fontFamily: typography.body,
    color: colors.danger,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  messages: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 14,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.coral,
  },
  bubbleText: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 15,
    lineHeight: 20,
  },
  mineText: {
    color: colors.ink,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  input: {
    flex: 1,
    backgroundColor: colors.inkElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.mist,
    fontFamily: typography.body,
    maxHeight: 120,
  },
  send: {
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  sendDisabled: {
    opacity: 0.5,
  },
  sendText: {
    fontFamily: typography.heading,
    color: colors.ink,
    fontSize: 14,
  },
});
