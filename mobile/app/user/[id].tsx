import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { primaryPhotoUrl } from '@/lib/mediaUrl';
import type { PublicProfile } from '@/lib/types';

/** Peer profile opened from Nearby - loads GET /profiles/:userId. */
export default function PeerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [messaging, setMessaging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ profile: PublicProfile }>(
        `/profiles/${id}`,
        { token: accessToken },
      );
      setProfile(data.profile);
    } catch (err) {
      setProfile(null);
      setError(err instanceof Error ? err.message : 'Profile unavailable');
    } finally {
      setLoading(false);
    }
  }, [accessToken, id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const photoUri = primaryPhotoUrl(profile?.photoUrls);
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    setPhotoFailed(false);
  }, [photoUri]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  const name = profile?.displayName?.trim() || 'Findr user';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: name }} />

      {error || !profile ? (
        <View style={styles.stateBox}>
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text style={styles.emptyBody}>
            {error ??
              'This person may be hidden or no longer on Findr.'}
          </Text>
          <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
            <Text style={styles.secondaryBtnText}>Go back</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.photo}>
            {photoUri && !photoFailed ? (
              <Image
                source={{ uri: photoUri }}
                style={styles.photoImage}
                resizeMode="cover"
                onError={() => setPhotoFailed(true)}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Text style={styles.initial}>
                {(name[0] || '?').toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name}>
            {name}, {profile.age}
          </Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          {profile.lookingFor.length > 0 ? (
            <Text style={styles.meta}>
              Looking for | {profile.lookingFor.join(', ')}
            </Text>
          ) : null}
          {profile.genderIdentity ? (
            <Text style={styles.meta}>{profile.genderIdentity}</Text>
          ) : null}
          {profile.orientationsShown.length > 0 ? (
            <Text style={styles.meta}>
              {profile.orientationsShown.join(' | ')}
            </Text>
          ) : null}

          <Pressable
            style={[styles.primaryBtn, messaging && styles.primaryBtnDisabled]}
            disabled={messaging}
            onPress={async () => {
              if (!accessToken || !id || messaging) return;
              setMessaging(true);
              try {
                const data = await apiFetch<{
                  conversation: { id: string };
                }>('/chat/conversations', {
                  method: 'POST',
                  token: accessToken,
                  body: JSON.stringify({ peerUserId: id }),
                });
                router.push(`/chat/${data.conversation.id}`);
              } catch (err) {
                Alert.alert(
                  'Could not open chat',
                  err instanceof Error ? err.message : 'Try again',
                );
              } finally {
                setMessaging(false);
              }
            }}
          >
            <Text style={styles.primaryBtnText}>
              {messaging ? 'Opening...' : 'Message'}
            </Text>
          </Pressable>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 3 / 4,
    maxHeight: 360,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  initial: {
    fontFamily: typography.brand,
    fontSize: 72,
    color: colors.coral,
  },
  name: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 24,
  },
  bio: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 15,
    lineHeight: 22,
  },
  meta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 13,
  },
  primaryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontFamily: typography.heading,
    color: colors.ink,
    fontSize: 16,
  },
  stateBox: { gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 18,
  },
  emptyBody: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryBtnText: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 14,
  },
});
