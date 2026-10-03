import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import * as Location from 'expo-location';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch, apiUploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  OPEN_DIRECTIONS_BODY,
  OPEN_DIRECTIONS_TITLE,
  SHARE_LOCATION_BODY,
  SHARE_LOCATION_TITLE,
  approximateChatLocation,
  mapsDirectionsUrl,
} from '@/lib/chatLocation';
import { VIDEO_MAX_DURATION_SEC } from '@/lib/mediaLimits';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { useSafetyActions } from '@/lib/useSafetyActions';
import type { ConversationSummary, PublicMessage } from '@/lib/types';

const POLL_MS = 4000;
const DOUBLE_TAP_MS = 280;

/**
 * Chat thread: text, photo, short video, Findr camera/album, double-tap like,
 * and GPS share (with mandatory safety popups).
 *
 * Privacy: camera/picker media stays in Findr (upload + album). Location is
 * chat + server only -- never written to the device gallery.
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
  const lastTapRef = useRef<{ id: string; t: number } | null>(null);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    };
  }, []);

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
      // Optimistic UI so sender/receiver see the heart immediately.
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
        // Revert optimistic change on failure.
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

  const openDirections = useCallback((item: PublicMessage) => {
    const loc = item.location;
    if (!loc) return;
    Alert.alert(OPEN_DIRECTIONS_TITLE, OPEN_DIRECTIONS_BODY, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open maps',
        onPress: () => {
          void Linking.openURL(mapsDirectionsUrl(loc.lat, loc.lng));
        },
      },
    ]);
  }, []);

  const onBubblePress = useCallback(
    (item: PublicMessage) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.id === item.id && now - last.t < DOUBLE_TAP_MS) {
        if (singleTapTimerRef.current) {
          clearTimeout(singleTapTimerRef.current);
          singleTapTimerRef.current = null;
        }
        lastTapRef.current = null;
        void toggleLike(item);
        return;
      }
      lastTapRef.current = { id: item.id, t: now };
      if (item.location) {
        if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = setTimeout(() => {
          singleTapTimerRef.current = null;
          openDirections(item);
        }, DOUBLE_TAP_MS);
      }
    },
    [openDirections, toggleLike],
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
      setMessages((prev) => [...prev, normalizeMessage(data.message)]);
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

  const sendLocationConfirmed = async () => {
    if (!accessToken || !id || sending) return;
    setSending(true);
    setError(null);
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const asked = await Location.requestForegroundPermissionsAsync();
        status = asked.status;
      }
      if (status !== 'granted') {
        Alert.alert(
          'Location permission needed',
          'Allow Findr to read your location to share it in this chat. It is not saved to your phone gallery.',
        );
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const approx = approximateChatLocation(
        pos.coords.latitude,
        pos.coords.longitude,
        typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : null,
      );

      const data = await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${id}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({
            body: '',
            location: {
              lat: approx.lat,
              lng: approx.lng,
              accuracyM: approx.accuracyM,
            },
          }),
        },
      );
      setMessages((prev) => [...prev, normalizeMessage(data.message)]);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location send failed');
    } finally {
      setSending(false);
    }
  };

  const onShareLocation = () => {
    if (!id || sending) return;
    Alert.alert(SHARE_LOCATION_TITLE, SHARE_LOCATION_BODY, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Share approximate location',
        onPress: () => {
          void sendLocationConfirmed();
        },
      },
    ]);
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
          const showHeart = (item.likeCount ?? 0) > 0 || item.likedByMe;
          return (
            <Pressable
              onPress={() => onBubblePress(item)}
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
              {item.location ? (
                <View style={styles.locationBox}>
                  <Text
                    style={[
                      styles.locationTitle,
                      item.mine && styles.mineText,
                    ]}
                  >
                    Approximate location
                  </Text>
                  <Text
                    style={[
                      styles.locationMeta,
                      item.mine && styles.mineText,
                    ]}
                  >
                    Tap for directions · double-tap to like
                  </Text>
                </View>
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
                    item.likedByMe && styles.likeBadgeActive,
                  ]}
                >
                  {item.likedByMe ? '♥' : '♡'}{' '}
                  {(item.likeCount ?? 0) > 1 ? item.likeCount : ''}
                </Text>
              ) : null}
            </Pressable>
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
        <Pressable
          style={[styles.photoBtn, sending && styles.sendDisabled]}
          onPress={onShareLocation}
          disabled={sending}
        >
          <Text style={styles.photoBtnText}>Loc</Text>
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
  locationBox: {
    gap: 2,
    paddingVertical: 2,
  },
  locationTitle: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 15,
  },
  locationMeta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
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
    fontSize: 13,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  likeBadgeTheirs: {
    color: colors.coral,
  },
  likeBadgeMine: {
    color: colors.ink,
  },
  likeBadgeActive: {
    opacity: 1,
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
