import { useCallback, useState } from 'react';
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

import { colors, radii, spacing, typography } from '@/constants/theme';
import {
  apiDeleteAlbumItem,
  apiFetch,
  apiListAlbum,
  apiUploadMedia,
  type AlbumItem,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VIDEO_MAX_DURATION_SEC } from '@/lib/mediaLimits';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { PublicMessage } from '@/lib/types';

/**
 * Personal Findr album -- photos + short videos saved only inside Findr.
 * Privacy: picker/camera never write to device Photos/Gallery.
 */
export default function AlbumScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{ conversationId?: string }>();
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : '';

  const [items, setItems] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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
      const body =
        item.mediaType === 'video'
          ? { body: '', videoUrl: item.url }
          : { body: '', imageUrl: item.url };
      await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify(body),
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
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Library access needed',
        'Allow Findr to pick a file to add to your Findr album. The file is copied into Findr only -- not re-saved to your gallery.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === 'video' ? ['videos'] : ['images'],
      quality: 0.8,
      allowsEditing: false,
      videoMaxDuration: VIDEO_MAX_DURATION_SEC,
      // Do NOT save to library. Output URI is temp / content -- we upload to Findr.
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    const asset = picked.assets[0];
    setBusy(true);
    try {
      await apiUploadMedia(asset.uri, {
        token: accessToken,
        kind: 'album',
        mediaType,
        source: 'upload',
        fileName:
          asset.fileName ??
          (mediaType === 'video' ? 'album.mp4' : 'album.jpg'),
        durationMs:
          mediaType === 'video' && asset.duration
            ? Math.round(asset.duration)
            : null,
      });
      await load();
    } catch (err) {
      Alert.alert(
        'Add failed',
        err instanceof Error ? err.message : 'Could not add to album',
      );
    } finally {
      setBusy(false);
    }
  };

  const openCamera = (mode: 'photo' | 'video') => {
    const q = new URLSearchParams({ mode, returnTo: 'album' });
    if (conversationId) q.set('conversationId', conversationId);
    router.push(`/camera?${q.toString()}`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: conversationId ? 'Send from album' : 'My Findr album',
        }}
      />
      <Text style={styles.privacy}>
        Stays in Findr only -- not your phone gallery. Photos max 8MB. Videos max
        30s / 25MB.
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => openCamera('photo')}>
          <Text style={styles.actionText}>Camera</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={() => openCamera('video')}>
          <Text style={styles.actionText}>Record</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => addFromPicker('photo')}
          disabled={busy}
        >
          <Text style={styles.actionText}>Add photo</Text>
        </Pressable>
        <Pressable
          style={styles.actionBtn}
          onPress={() => addFromPicker('video')}
          disabled={busy}
        >
          <Text style={styles.actionText}>Add video</Text>
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
              Empty album. Capture with Findr camera or add a file -- it stays in
              Findr.
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
                {item.mediaType === 'photo' && uri ? (
                  <Image source={{ uri }} style={styles.tileImg} />
                ) : (
                  <View style={[styles.tileImg, styles.videoTile]}>
                    <Text style={styles.videoLabel}>Video</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color={colors.coral} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  privacy: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.md,
  },
  actionBtn: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 13,
  },
  grid: { padding: spacing.sm, gap: spacing.xs },
  empty: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  tile: {
    width: '33.33%',
    aspectRatio: 1,
    padding: 2,
  },
  tileImg: {
    flex: 1,
    borderRadius: radii.sm,
    backgroundColor: colors.inkElevated,
  },
  videoTile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoLabel: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 12,
  },
  busy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
