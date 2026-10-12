import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { colors, radii, spacing } from '@/constants/theme';
import {
  apiDeleteAlbumItem,
  apiFetch,
  apiListAlbum,
  apiUploadMedia,
  type AlbumItem,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ALBUM_MAX_PHOTOS,
  ALBUM_MAX_VIDEOS,
  VIDEO_MAX_DURATION_SEC,
} from '@/lib/mediaLimits';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { PublicMessage } from '@/lib/types';

function albumCounts(items: AlbumItem[]) {
  let photos = 0;
  let videos = 0;
  for (const item of items) {
    if (item.mediaType === 'video') videos += 1;
    else photos += 1;
  }
  return { photos, videos };
}

export default function AlbumScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : '';

  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const counts = useMemo(() => albumCounts(items), [items]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    try {
      const list = await apiListAlbum(accessToken, 100);
      setItems(list);
    } catch (err) {
      Alert.alert(
        'Album',
        err instanceof Error ? err.message : 'Could not load album',
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const sendToChat = async (item: AlbumItem) => {
    if (!accessToken || !conversationId || busy) return;
    setBusy(true);
    try {
      const payload =
        item.mediaType === 'video'
          ? { body: '', videoUrl: item.url }
          : { body: '', imageUrl: item.url };
      await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify(payload),
        },
      );
      router.back();
    } catch (err) {
      Alert.alert(
        'Send failed',
        err instanceof Error ? err.message : 'Could not send',
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = (item: AlbumItem) => {
    if (!accessToken) return;
    Alert.alert('Remove from album?', 'Chat history is kept. Remove this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDeleteAlbumItem(accessToken, item.id);
            setItems((prev) => prev.filter((x) => x.id !== item.id));
          } catch (err) {
            Alert.alert(
              'Delete failed',
              err instanceof Error ? err.message : 'Could not delete',
            );
          }
        },
      },
    ]);
  };

  const addFromPicker = async (mediaType: 'photo' | 'video') => {
    if (!accessToken || busy) return;
    if (mediaType === 'photo' && counts.photos >= ALBUM_MAX_PHOTOS) {
      Alert.alert(
        'Album full',
        `You can store up to ${ALBUM_MAX_PHOTOS} photos. Long-press one to remove.`,
      );
      return;
    }
    if (mediaType === 'video' && counts.videos >= ALBUM_MAX_VIDEOS) {
      Alert.alert(
        'Video limit',
        `You can store ${ALBUM_MAX_VIDEOS} video in Findr. Remove it to add another.`,
      );
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Library access needed',
        'Allow Findr to pick media for your Findr album. Copied into Findr only -- not re-saved to your gallery.',
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
    setBusy(true);
    try {
      const duration =
        mediaType === 'video' && asset.duration != null
          ? asset.duration <= 120
            ? Math.round(asset.duration * 1000)
            : Math.round(asset.duration)
          : null;
      await apiUploadMedia(asset.uri, {
        token: accessToken,
        kind: 'album',
        mediaType,
        source: 'album',
        fileName:
          asset.fileName ??
          (mediaType === 'video' ? 'album.mp4' : 'album.jpg'),
        durationMs: duration,
      });
      await load();
    } catch (err) {
      const code = (err as Error & { code?: string }).code;
      let msg = err instanceof Error ? err.message : 'Could not add to album';
      if (code === 'album_video_limit') {
        msg = `Album allows ${ALBUM_MAX_VIDEOS} video. Remove the existing one first.`;
      } else if (code === 'album_photo_limit') {
        msg = `Album allows ${ALBUM_MAX_PHOTOS} photos. Remove one first.`;
      }
      Alert.alert('Add failed', msg);
    } finally {
      setBusy(false);
    }
  };

  const openAddMenu = () => {
    Alert.alert('Add to Findr album', 'Not saved to your phone gallery.', [
      { text: 'Photo', onPress: () => void addFromPicker('photo') },
      {
        text: `Video (${VIDEO_MAX_DURATION_SEC}s max)`,
        onPress: () => void addFromPicker('video'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: conversationId ? 'Send from album' : 'My Findr album',
        }}
      />
      <Text style={styles.privacy}>
        Stays in Findr only — not your phone gallery. Up to {ALBUM_MAX_PHOTOS}{' '}
        photos and {ALBUM_MAX_VIDEOS} video ({VIDEO_MAX_DURATION_SEC}s max).
      </Text>
      <Text style={styles.counts}>
        {counts.photos}/{ALBUM_MAX_PHOTOS} photos · {counts.videos}/
        {ALBUM_MAX_VIDEOS} video
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={openAddMenu}
          disabled={busy}
        >
          <Text style={styles.actionText}>Add media</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.coral} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Empty album. Add a photo or short video — it stays in Findr.
            </Text>
          }
          renderItem={({ item }) => {
            const uri = resolveMediaUrl(item.url);
            return (
              <Pressable
                style={styles.tile}
                onPress={() =>
                  conversationId
                    ? sendToChat(item)
                    : Alert.alert(
                        item.mediaType === 'video' ? 'Video' : 'Photo',
                        'Open a chat and tap Album to send this.',
                      )
                }
                onLongPress={() => onDelete(item)}
              >
                {item.mediaType === 'video' ? (
                  <View style={[styles.tileImg, styles.videoTile]}>
                    <Text style={styles.videoLabel}>Video</Text>
                  </View>
                ) : uri ? (
                  <Image source={{ uri }} style={styles.tileImg} />
                ) : (
                  <View style={styles.tileImg} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  privacy: {
    fontSize: 12,
    color: colors.mistMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  counts: {
    fontSize: 12,
    color: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionBtn: {
    backgroundColor: colors.inkElevated,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  actionText: { color: colors.mist, fontWeight: '600' },
  grid: { padding: spacing.sm },
  tile: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 4,
  },
  tileImg: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.inkElevated,
  },
  videoTile: { alignItems: 'center', justifyContent: 'center' },
  videoLabel: { color: colors.mist, fontWeight: '600' },
  empty: {
    fontSize: 15,
    color: colors.mistMuted,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: spacing.lg,
  },
});
