import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, radii, spacing } from '@/constants/theme';
import { PROFILE_MAX_PHOTOS } from '@/lib/mediaLimits';
import { resolveMediaUrl } from '@/lib/mediaUrl';

type Props = {
  photoUrls: string[];
  displayName: string;
  editable?: boolean;
  uploading?: boolean;
  onAddPhoto?: () => void;
  onSetMain?: (index: number) => void;
  onRemove?: (index: number) => void;
};

const width = Dimensions.get('window').width;
const photoWidth = Math.min(width - spacing.lg * 2, 360);
const photoHeight = photoWidth * (4 / 3);

export function ProfilePhotoGallery({
  photoUrls,
  displayName,
  editable = false,
  uploading = false,
  onAddPhoto,
  onSetMain,
  onRemove,
}: Props) {
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  const initial = (displayName.trim()[0] || '?').toUpperCase();
  const urls = photoUrls.slice(0, PROFILE_MAX_PHOTOS);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / photoWidth);
    if (i >= 0 && i < urls.length) setIndex(i);
  };

  if (urls.length === 0) {
    return (
      <Pressable
        style={styles.photo}
        onPress={editable ? onAddPhoto : undefined}
        disabled={!editable || uploading}
      >
        <Text style={styles.initial}>{initial}</Text>
        {uploading ? (
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Uploading…</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(u, i) => `${u}-${i}`}
        onMomentumScrollEnd={onScroll}
        style={{ width: photoWidth, height: photoHeight }}
        renderItem={({ item }) => {
          const uri = resolveMediaUrl(item);
          return (
            <View style={{ width: photoWidth, height: photoHeight }}>
              {uri ? (
                <Image
                  source={{ uri }}
                  style={styles.photoImage}
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <View style={styles.photo}>
                  <Text style={styles.initial}>{initial}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
      {urls.length > 1 ? (
        <View style={styles.dots}>
          {urls.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
      {index === 0 ? (
        <Text style={styles.mainBadge}>Main photo</Text>
      ) : editable ? (
        <Text style={styles.meta}>Swipe for more · photo {index + 1} of {urls.length}</Text>
      ) : null}
      {uploading ? (
        <View style={[styles.overlay, { width: photoWidth, height: photoHeight }]}>
          <Text style={styles.overlayText}>Uploading…</Text>
        </View>
      ) : null}
      {editable ? (
        <View style={styles.actions}>
          {urls.length < PROFILE_MAX_PHOTOS ? (
            <Pressable onPress={onAddPhoto} disabled={uploading}>
              <Text style={styles.link}>Add photo ({urls.length}/{PROFILE_MAX_PHOTOS})</Text>
            </Pressable>
          ) : (
            <Text style={styles.meta}>Max {PROFILE_MAX_PHOTOS} profile photos</Text>
          )}
          {index > 0 && onSetMain ? (
            <Pressable onPress={() => onSetMain(index)} disabled={uploading}>
              <Text style={styles.link}>Set as main</Text>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable onPress={() => onRemove(index)} disabled={uploading}>
              <Text style={styles.linkDanger}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: spacing.sm },
  photo: {
    width: photoWidth,
    height: photoHeight,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoImage: {
    width: photoWidth,
    height: photoHeight,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
  },
  initial: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.mistMuted,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: { backgroundColor: colors.coral },
  mainBadge: {
    fontSize: 12,
    color: colors.teal,
    marginTop: spacing.xs,
  },
  meta: {
    fontSize: 12,
    color: colors.mistMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.xs,
    alignItems: 'center',
  },
  link: {
    fontSize: 15,
    color: colors.coral,
  },
  linkDanger: {
    fontSize: 15,
    color: '#f87171',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayText: { color: colors.mist },
});
