import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch, apiUploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { useSafetyActions } from '@/lib/useSafetyActions';
import type { ConversationSummary, PublicMessage } from '@/lib/types';

const POLL_MS = 4000;
const DOUBLE_TAP_MS = 280;
/** Reserved bottom band height for future sponsored placement (dp). */
const CHAT_AD_RESERVED_DP = 56;

/**
 * Stage 2d chat thread: text + photo attach + double-tap likes + album entry.
 * Composer sits above a named ad-reserved band (no ad SDK yet).
 * No in-app camera capture or video-player natives. Video receive is a text stub.
 */
export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const { blockUser, reportUser, reportModals } = useSafetyActions(accessToken);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [conversation, setConversation] = useState<ConversationSummary | null>(
    null,
  );
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<PublicMessage>>(null);
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);
  const likeInFlight = useRef<Set<string>>(new Set());

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
      setMessages(normalizeMessages(msgs.messages ?? []));
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
          setMessages(normalizeMessages(msgs.messages ?? []));
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

  const patchMessage = useCallback((next: PublicMessage) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === next.id ? normalizeMessage(next) : m)),
    );
  }, []);

  const toggleLike = useCallback(
    async (item: PublicMessage) => {
      if (!accessToken || !id) return;
      if (likeInFlight.current.has(item.id)) return;
      likeInFlight.current.add(item.id);

      const liked = Boolean(item.likedByMe);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== item.id) return m;
          const likeCount = Math.max(0, (m.likeCount ?? 0) + (liked ? -1 : 1));
          return { ...m, likedByMe: !liked, likeCount };
        }),
      );

      try {
        const path = `/chat/conversations/${id}/messages/${item.id}/like`;
        const data = await apiFetch<{ message: PublicMessage }>(path, {
          method: liked ? 'DELETE' : 'POST',
          token: accessToken,
        });
        patchMessage(data.message);
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) => (m.id === item.id ? item : m)),
        );
        setError(err instanceof Error ? err.message : 'Like failed');
      } finally {
        likeInFlight.current.delete(item.id);
      }
    },
    [accessToken, id, patchMessage],
  );

  const onBubblePress = useCallback(
    (item: PublicMessage) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.id === item.id && now - last.t < DOUBLE_TAP_MS) {
        lastTapRef.current = null;
        void toggleLike(item);
        return;
      }
      lastTapRef.current = { id: item.id, t: now };
    },
    [toggleLike],
  );

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
      setMessages((prev) => [...prev, normalizeMessage(data.message)]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const uploadAndSendPhoto = async (uri: string, fileName: string) => {
    if (!accessToken || !id) return;
    setSending(true);
    setError(null);
    try {
      const uploaded = await apiUploadMedia(uri, {
        token: accessToken,
        kind: 'chat',
        mediaType: 'photo',
        source: 'chat',
        fileName,
      });
      const data = await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${id}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ body: '', imageUrl: uploaded.url }),
        },
      );
      setMessages((prev) => [...prev, normalizeMessage(data.message)]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo send failed');
    } finally {
      setSending(false);
    }
  };

  const onPickPhoto = async () => {
    if (!accessToken || !id || sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Library access needed',
        'Allow Findr to pick a photo to send. It is uploaded to Findr only -- not saved back to your phone gallery.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const asset = picked.assets[0];
    await uploadAndSendPhoto(
      asset.uri,
      asset.fileName ?? 'chat.jpg',
    );
  };

  const openAlbum = () => {
    if (!id || sending) return;
    router.push(`/album?conversationId=${encodeURIComponent(id)}`);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  const bottomInset = Math.max(insets.bottom, 0);
  const adBandHeight = CHAT_AD_RESERVED_DP + bottomInset;

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
          const imageUri = resolveMediaUrl(item.imageUrl);
          const hasVideo = Boolean(item.videoUrl);
          const showHeart = (item.likeCount ?? 0) > 0 || item.likedByMe;
          return (
            <Pressable
              onPress={() => onBubblePress(item)}
              style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}
            >
              {imageUri ? (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.bubbleImage}
                  accessibilityIgnoresInvertColors
                />
              ) : null}
              {hasVideo ? (
                <View style={styles.videoStub}>
                  <Text
                    style={[styles.videoStubText, item.mine && styles.mineText]}
                  >
                    [Video] Playback arrives in a later update. Double-tap to
                    like.
                  </Text>
                </View>
              ) : null}
              {item.location ? (
                <Text
                  style={[styles.bubbleText, item.mine && styles.mineText]}
                >
                  [Location] Shared pin (open in maps later). Double-tap to like.
                </Text>
              ) : null}
              {item.body?.trim() ? (
                <Text
                  style={[styles.bubbleText, item.mine && styles.mineText]}
                >
                  {item.body}
                </Text>
              ) : null}
              {showHeart ? (
                <Text
                  style={[
                    styles.likeBadge,
                    item.mine ? styles.likeBadgeMine : styles.likeBadgeTheirs,
                  ]}
                >
                  {item.likedByMe ? 'Liked' : 'Like'}
                  {(item.likeCount ?? 0) > 1 ? ` ${item.likeCount}` : ''}
                </Text>
              ) : null}
            </Pressable>
          );
        }}
      />
      <View style={styles.composer}>
        <Pressable
          style={[styles.toolBtn, sending && styles.sendDisabled]}
          onPress={onPickPhoto}
          disabled={sending}
          accessibilityLabel="Attach photo"
        >
          <Text style={styles.toolBtnText}>Photo</Text>
        </Pressable>
        <Pressable
          style={[styles.toolBtn, sending && styles.sendDisabled]}
          onPress={openAlbum}
          disabled={sending}
          accessibilityLabel="Open Findr album"
        >
          <Text style={styles.toolBtnText}>Album</Text>
        </Pressable>
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
      <View
        nativeID="chatAdReservedBand"
        testID="chatAdReservedBand"
        accessibilityLabel="Reserved space for future ads"
        style={[styles.adReservedBand, { height: adBandHeight }]}
      >
        <View style={styles.adReservedInner} />
      </View>
    </KeyboardAvoidingView>
  );
}

function normalizeMessage(m: PublicMessage): PublicMessage {
  return {
    ...m,
    location: m.location ?? null,
    likedByMe: Boolean(m.likedByMe),
    likeCount: Number(m.likeCount ?? 0),
  };
}

function normalizeMessages(list: PublicMessage[]): PublicMessage[] {
  return list.map(normalizeMessage);
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
    gap: spacing.xs,
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
  bubbleImage: {
    width: 200,
    height: 240,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
  },
  videoStub: {
    minWidth: 180,
    paddingVertical: spacing.sm,
  },
  videoStubText: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 13,
    lineHeight: 18,
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
  likeBadge: {
    fontFamily: typography.bodyMedium,
    fontSize: 12,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  likeBadgeTheirs: {
    color: colors.coral,
  },
  likeBadgeMine: {
    color: colors.ink,
  },
  composer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    backgroundColor: colors.ink,
  },
  toolBtn: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  toolBtnText: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 13,
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
  /** Named placeholder for future ads -- no third-party SDK in Stage 2d. */
  adReservedBand: {
    width: '100%',
    backgroundColor: colors.ink,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adReservedInner: {
    width: '92%',
    height: 40,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.inkElevated,
    opacity: 0.55,
  },
});
