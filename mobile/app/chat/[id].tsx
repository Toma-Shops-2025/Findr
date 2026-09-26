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
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch, apiUploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VIDEO_MAX_DURATION_SEC } from '@/lib/mediaLimits';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { useSafetyActions } from '@/lib/useSafetyActions';
import type { ConversationSummary, PublicMessage } from '@/lib/types';

const POLL_MS = 4000;

/**
 * Chat thread with text, photo, short video, Findr camera, and personal album.
 *
 * Privacy: camera/picker media stays in Findr (upload + album). Never writes to
 * device Photos / Gallery / Camera Roll.
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
                  contentType: 'message',
                  contentId: conversation.id,
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
              <Text style={[styles.headerLink, styles.headerDanger]}>Block</Text>
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

  const uploadAndSend = async (
    uri: string,
    mediaType: 'photo' | 'video',
    fileName: string,
    durationMs?: number | null,
    source: 'upload' | 'chat' = 'upload',
  ) => {
    if (!accessToken || !id) return;
    setSending(true);
    setError(null);
    try {
      const uploaded = await apiUploadMedia(uri, {
        token: accessToken,
        kind: 'chat',
        mediaType,
        source,
        fileName,
        durationMs: durationMs ?? null,
      });
      const payload =
        mediaType === 'video'
          ? { body: '', videoUrl: uploaded.url }
          : { body: '', imageUrl: uploaded.url };
      const data = await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${id}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify(payload),
        },
      );
      setMessages((prev) => [...prev, data.message]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Media send failed');
    } finally {
      setSending(false);
    }
  };

  const onPickGallery = async (mediaType: 'photo' | 'video') => {
    if (!accessToken || !id || sending) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Library access needed',
        'Allow Findr to pick a file to send. It is uploaded to Findr only -- not saved back to your phone gallery.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'video' ? ['videos'] : ['images'],
      quality: 0.8,
      allowsEditing: false,
      videoMaxDuration: VIDEO_MAX_DURATION_SEC,
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const asset = picked.assets[0];
    await uploadAndSend(
      asset.uri,
      mediaType,
      asset.fileName ?? (mediaType === 'video' ? 'chat.mp4' : 'chat.jpg'),
      mediaType === 'video' && asset.duration
        ? Math.round(asset.duration)
        : null,
      'upload',
    );
  };

  const openMediaMenu = () => {
    if (!id || sending) return;
    Alert.alert('Send media', 'Stays in Findr only -- not your phone gallery.', [
      {
        text: 'Findr camera (photo)',
        onPress: () =>
          router.push(`/camera?mode=photo&conversationId=${encodeURIComponent(id)}`),
      },
      {
        text: 'Findr camera (video 30s)',
        onPress: () =>
          router.push(`/camera?mode=video&conversationId=${encodeURIComponent(id)}`),
      },
      {
        text: 'My Findr album',
        onPress: () =>
          router.push(`/album?conversationId=${encodeURIComponent(id)}`),
      },
      { text: 'Gallery photo', onPress: () => onPickGallery('photo') },
      { text: 'Gallery video (30s)', onPress: () => onPickGallery('video') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      {reportModals}
      <Stack.Screen
        options={{
          title: conversation?.peerDisplayName ?? 'Chat',
        }}
      />
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
          <Text style={styles.empty}>Say hello -- be kind on Findr.</Text>
        }
        renderItem={({ item }) => {
          const imageUri = resolveMediaUrl(item.imageUrl);
          const videoUri = resolveMediaUrl(item.videoUrl);
          return (
            <View
              style={[styles.bubble, item.mine ? styles.mine : styles.theirs]}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.bubbleImage} />
              ) : null}
              {videoUri ? (
                <Video
                  source={{ uri: videoUri }}
                  style={styles.bubbleVideo}
                  useNativeControls
                  resizeMode={ResizeMode.COVER}
                  isLooping={false}
                />
              ) : null}
              {item.body?.trim() ? (
                <Text
                  style={[styles.bubbleText, item.mine && styles.mineText]}
                >
                  {item.body}
                </Text>
              ) : null}
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <Pressable
          style={[styles.photoBtn, sending && styles.sendDisabled]}
          onPress={openMediaMenu}
          disabled={sending}
        >
          <Text style={styles.photoBtnText}>Media</Text>
        </Pressable>
        <TextInput
          placeholder="Message…"
          placeholderTextColor={colors.mistMuted}
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          editable={!sending}
          multiline
          maxLength={2000}
        />
        <Pressable
          style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}
          onPress={onSend}
          disabled={!draft.trim() || sending}
        >
          <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
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
    gap: spacing.md,
    marginRight: spacing.xs,
  },
  headerLink: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 14,
  },
  headerDanger: {
    color: colors.danger,
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
  bubbleVideo: {
    width: 220,
    height: 280,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  photoBtn: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm + 2,
  },
  photoBtnText: {
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
});
