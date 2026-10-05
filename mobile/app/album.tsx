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
import { resolveMediaUrl } from '@/lib/mediaUrl';
import type { PublicMessage } from '@/lib/types';

/**
 * Personal Findr album (Stage 2d photo path).
 * API: GET/DELETE /media/album. Photo path only (no in-app capture natives).
 * Video items show a stub tile; add-video stays parked for Stage 2e.
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
    if (item.mediaType === 'video') {
      Alert.alert(
        'Video later',
        'Video send returns in Stage 2e. Photos work now.',
      );
      return;
    }
    setBusy(true);
    try {
      await apiFetch<{ message: PublicMessage }>(
        `/chat/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          token: accessToken,
          body: JSON.stringify({ body: '', imageUrl: item.url }),
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

  const addFromPicker = async () => {
    if (!accessToken || busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Library access needed',
        'Allow Findr to pick a photo for your Findr album. Copied into Findr only -- not re-saved to your gallery.',
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
    setBusy(true);
    try {
      await apiUploadMedia(asset.uri, {
        token: accessToken,
        kind: 'album',
        mediaType: 'photo',
        source: 'album',
        fileName: asset.fileName ?? 'album.jpg',
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

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: conversationId ? 'Send from album' : 'My Findr album',
        }}
      />
      <Text style={styles.privacy}>
        Stays in Findr only -- not your phone gallery. Photos max 8MB. Video
        capture returns in Stage 2e.
      </Text>
      <View style={styles.actions}>
        <Pressable
          style={styles.actionBtn}
          onPress={addFromPicker}
          disabled={busy}
        >
          <Text style={styles.actionText}>Add photo</Text>
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
              Empty album. Add a photo -- it stays in Findr.
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
                  <Image
                    source={{ uri }}
                    style={styles.tileImg}
                    accessibilityIgnoresInvertColors
                  />
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
