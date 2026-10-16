import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
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
import * as Location from 'expo-location';
import { useVideoPlayer, VideoView, type VideoView as VideoViewType } from 'expo-video';

import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  approximateChatLocation,
  mapsDirectionsUrl,
  OPEN_DIRECTIONS_BODY,
  OPEN_DIRECTIONS_TITLE,
  SHARE_LOCATION_BODY,
  SHARE_LOCATION_TITLE,
} from '@/lib/chatLocation';
import {
  VIDEO_MAX_DURATION_SEC,
} from '@/lib/mediaLimits';
import { apiFetch, apiUploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { markConversationRead } from '@/lib/useChatUnread';
import { useSafetyActions } from '@/lib/useSafetyActions';
import type { ConversationSummary, PublicMessage } from '@/lib/types';
import { FindrRealtime } from '@/lib/realtime';

const POLL_MS = 12_000;
const DOUBLE_TAP_MS = 280;
/** Reserved bottom band height for future sponsored placement (dp). */
const CHAT_AD_RESERVED_DP = 56;

/**
 * Stage 2d chat thread: text + photo attach + double-tap likes + album entry.
 * Composer sits above a named ad-reserved band (no ad SDK yet).
 * Stage 2e: gallery photo; video only via in-app camera (30s). Playback via expo-video.
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
  const realtimeRef = useRef<FindrRealtime | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [peerTyping, setPeerTyping] = useState(false);

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
      void markConversationRead(accessToken, meta.conversation.id);
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
    const rt = new FindrRealtime();
    realtimeRef.current = rt;
    rt.connect(accessToken, {
      onMessage: (conversationId, message) => {
        if (conversationId !== id) return;
        const m = normalizeMessage(message as PublicMessage);
        setMessages((prev) => {
          if (prev.some((x) => x.id === m.id)) return prev;
          return [...prev, m];
        });
      },
      onTyping: (conversationId, userId, active) => {
        if (conversationId !== id) return;
        if (userId === conversation?.peerUserId) setPeerTyping(active);
      },
    });
    rt.subscribe(id);
    return () => {
      rt.disconnect();
      realtimeRef.current = null;
    };
  }, [accessToken, id, conversation?.peerUserId]);

  useEffect(() => {
    if (!accessToken || !id) return;
    const timer = setInterval(() => {
      void (async () => {
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

  const uploadAndSendMedia = async (
    uri: string,
    mediaType: 'photo' | 'video',
    fileName: string,
    durationMs?: number | null,
  ) => {
    if (!accessToken || !id) return;
    setSending(true);
    setError(null);
    try {
      const uploaded = await apiUploadMedia(uri, {
        token: accessToken,
        kind: 'chat',
        mediaType,
        source: 'chat',
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
      const code = (err as Error & { code?: string }).code;
      if (code === 'album_video_limit' || code === 'album_photo_limit') {
        setError('Could not save to your Findr album. Try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Send failed');
      }
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
        'Allow Findr to pick a photo to send. It is uploaded to Findr only — not saved to your phone gallery.',
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
    await uploadAndSendMedia(
      asset.uri,
      'photo',
      asset.fileName ?? 'chat.jpg',
    );
  };

  const openRecordVideo = () => {
    if (!id || sending) return;
    router.push(
      `/camera?mode=video&conversationId=${encodeURIComponent(id)}`,
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

  const openSharedLocationInMaps = (lat: number, lng: number) => {
    Alert.alert(OPEN_DIRECTIONS_TITLE, OPEN_DIRECTIONS_BODY, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Open maps',
        onPress: () => {
          void Linking.openURL(mapsDirectionsUrl(lat, lng));
        },
      },
    ]);
  };

  const openAttachMenu = () => {
    if (!id || sending) return;
    Alert.alert(
      'Attach',
      'Share media or your approximate location. Stays in Findr only — not your phone gallery.',
      [
        {
          text: 'Share approximate location',
          onPress: onShareLocation,
        },
        { text: 'Photo from gallery', onPress: () => void onPickPhoto() },
        {
          text: `Record video (${VIDEO_MAX_DURATION_SEC}s max)`,
          onPress: openRecordVideo,
        },
        { text: 'Cancel', style: 'cancel' },
      ],
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
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {conversation?.peerDisplayName ?? 'Chat'}
              </Text>
              {conversation?.peerDistanceLabel ? (
                <Text style={styles.headerDistance} numberOfLines={1}>
                  {conversation.peerDistanceLabel}
                </Text>
              ) : null}
            </View>
          ),
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
          const videoUri = resolveMediaUrl(item.videoUrl);
          const showHeart = (item.likeCount ?? 0) > 0 || item.likedByMe;
          const bubbleStyle = [
            styles.bubble,
            item.mine ? styles.mine : styles.theirs,
          ];
          const hasTextOrImage =
            Boolean(imageUri) ||
            Boolean(item.body?.trim()) ||
            Boolean(item.location);

          return (
            <View style={bubbleStyle}>
              {videoUri ? (
                <ChatBubbleVideo
                  uri={videoUri}
                  style={styles.bubbleVideo}
                  onDoubleTap={() => void toggleLike(item)}
                />
              ) : null}
              {hasTextOrImage ? (
                <Pressable onPress={() => onBubblePress(item)}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.bubbleImage}
                      accessibilityIgnoresInvertColors
                    />
                  ) : null}
                  {item.location ? (
                    <Pressable
                      onPress={() => {
                        const lat = item.location?.lat;
                        const lng = item.location?.lng;
                        if (lat == null || lng == null) return;
                        openSharedLocationInMaps(lat, lng);
                      }}
                    >
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
                        Tap for directions
                      </Text>
                    </Pressable>
                  ) : null}
                  {item.body?.trim() ? (
                    <Text
                      style={[styles.bubbleText, item.mine && styles.mineText]}
                    >
                      {item.body}
                    </Text>
                  ) : null}
                </Pressable>
              ) : null}
              {showHeart ? (
                <Pressable onPress={() => onBubblePress(item)}>
                  <Text
                    style={[
                      styles.likeBadge,
                      item.mine ? styles.likeBadgeMine : styles.likeBadgeTheirs,
                    ]}
                  >
                    {item.likedByMe ? 'Liked' : 'Like'}
                    {(item.likeCount ?? 0) > 1 ? ` ${item.likeCount}` : ''}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />
      {peerTyping ? (
        <Text style={styles.typing}>Typing…</Text>
      ) : null}
      <View style={styles.composer}>
        <Pressable
          style={[styles.toolBtn, sending && styles.sendDisabled]}
          onPress={openAttachMenu}
          disabled={sending}
          accessibilityLabel="Attach photo, video, or location"
        >
          <Text style={styles.toolBtnText}>Attach</Text>
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
          onChangeText={(text) => {
            setDraft(text);
            if (!id) return;
            realtimeRef.current?.sendTyping(id, true);
            if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
            typingTimerRef.current = setTimeout(() => {
              realtimeRef.current?.sendTyping(id, false);
            }, 1200);
          }}
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

function ChatBubbleVideo({
  uri,
  style,
  onDoubleTap,
}: {
  uri: string;
  style: object;
  onDoubleTap?: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const fullscreenRef = useRef<VideoViewType>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const lastTapRef = useRef(0);
  const longPressLockRef = useRef(false);

  const onVideoPress = () => {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onDoubleTap?.();
      return;
    }
    lastTapRef.current = now;
    if (player.playing) {
      player.pause();
    } else {
      void player.play();
    }
  };

  const openFullscreen = async () => {
    if (longPressLockRef.current) return;
    longPressLockRef.current = true;
    try {
      setFullscreen(true);
      await fullscreenRef.current?.enterFullscreen();
    } finally {
      setTimeout(() => {
        longPressLockRef.current = false;
      }, 600);
    }
  };

  const flatStyle = StyleSheet.flatten(style) ?? {};

  return (
    <>
      <View style={[flatStyle, styles.videoWrap]}>
        <VideoView
          player={player}
          style={styles.videoFill}
          nativeControls={false}
          contentFit="cover"
          surfaceType="textureView"
        />
        <Pressable
          style={styles.videoTouchOverlay}
          onPress={onVideoPress}
          onLongPress={() => void openFullscreen()}
          delayLongPress={400}
          accessibilityLabel="Play or pause video. Long press for fullscreen."
        />
        <Text style={styles.videoHint} pointerEvents="none">
          Tap to play · Long-press fullscreen
        </Text>
      </View>
      <Modal
        visible={fullscreen}
        animationType="fade"
        onRequestClose={() => setFullscreen(false)}
      >
        <View style={styles.videoModalBackdrop}>
          <Pressable
            style={styles.videoModalClose}
            onPress={() => setFullscreen(false)}
          >
            <Text style={styles.videoModalCloseText}>Close</Text>
          </Pressable>
          <VideoView
            ref={fullscreenRef}
            player={player}
            style={styles.videoModalPlayer}
            nativeControls
            contentFit="contain"
            surfaceType="textureView"
            fullscreenOptions={{ enable: true }}
            onFullscreenExit={() => setFullscreen(false)}
          />
        </View>
      </Modal>
    </>
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
  headerTitleWrap: {
    alignItems: 'flex-start',
    maxWidth: 220,
  },
  headerTitle: {
    fontFamily: typography.heading,
    fontSize: 17,
    color: colors.mist,
  },
  headerDistance: {
    fontFamily: typography.body,
    fontSize: 13,
    color: colors.mistMuted,
    marginTop: 2,
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
  bubbleVideo: {
    width: 220,
    height: 165,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
  },
  videoWrap: {
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  videoFill: {
    width: '100%',
    height: '100%',
  },
  videoTouchOverlay: {
    ...StyleSheet.absoluteFill,
  },
  videoHint: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    right: 8,
    fontFamily: typography.body,
    fontSize: 11,
    color: colors.mistMuted,
    textAlign: 'center',
  },
  videoModalBackdrop: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  videoModalPlayer: {
    width: '100%',
    height: '80%',
  },
  videoModalClose: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 2,
    padding: spacing.sm,
  },
  videoModalCloseText: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 16,
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
  typing: {
    color: colors.mistMuted,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
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
