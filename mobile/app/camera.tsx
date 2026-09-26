import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from 'expo-camera';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch, apiUploadMedia } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { VIDEO_MAX_DURATION_SEC } from '@/lib/mediaLimits';
import type { PublicMessage } from '@/lib/types';

/**
 * In-app Findr camera (Grindr-style entry from chat / album).
 *
 * Privacy: captures write to the app sandbox only, then upload to Findr.
 * Never calls MediaLibrary / saveToLibrary / Camera Roll APIs.
 */
export default function FindrCameraScreen() {
  const { accessToken } = useAuth();
  const params = useLocalSearchParams<{
    mode?: string;
    conversationId?: string;
    returnTo?: string;
  }>();
  const mode = params.mode === 'video' ? 'video' : 'photo';
  const conversationId =
    typeof params.conversationId === 'string' ? params.conversationId : '';

  const cameraRef = useRef<CameraView>(null);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const ensurePermissions = async (): Promise<boolean> => {
    let cam = camPerm;
    if (!cam?.granted) {
      cam = await requestCamPerm();
    }
    if (!cam?.granted) {
      Alert.alert(
        'Camera needed',
        'Allow Findr camera access to take photos and short videos. Captures stay in Findr only -- not your phone gallery.',
      );
      return false;
    }
    if (mode === 'video') {
      let mic = micPerm;
      if (!mic?.granted) {
        mic = await requestMicPerm();
      }
      if (!mic?.granted) {
        Alert.alert(
          'Microphone needed',
          'Allow Findr mic access to record short videos (max 30s). Nothing is saved to your phone gallery.',
        );
        return false;
      }
    }
    return true;
  };

  const afterCapture = async (
    uri: string,
    mediaType: 'photo' | 'video',
    durationMs?: number,
  ) => {
    if (!accessToken) return;
    setBusy(true);
    try {
      const uploaded = await apiUploadMedia(uri, {
        token: accessToken,
        kind: conversationId ? 'chat' : 'album',
        mediaType,
        source: 'camera',
        fileName: mediaType === 'video' ? 'camera.mp4' : 'camera.jpg',
        durationMs: durationMs ?? null,
      });

      if (conversationId) {
        const body =
          mediaType === 'video'
            ? { body: '', videoUrl: uploaded.url }
            : { body: '', imageUrl: uploaded.url };
        await apiFetch<{ message: PublicMessage }>(
          `/chat/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            token: accessToken,
            body: JSON.stringify(body),
          },
        );
      }

      router.back();
    } catch (err) {
      Alert.alert(
        'Upload failed',
        err instanceof Error ? err.message : 'Could not save to Findr',
      );
    } finally {
      setBusy(false);
    }
  };

  const onTakePhoto = async () => {
    if (busy || recording) return;
    if (!(await ensurePermissions())) return;
    try {
      setBusy(true);
      const shot = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        shutterSound: false,
        // Writes to app cache -- NOT device gallery.
      });
      setBusy(false);
      if (!shot?.uri) return;
      await afterCapture(shot.uri, 'photo');
    } catch (err) {
      setBusy(false);
      Alert.alert(
        'Camera error',
        err instanceof Error ? err.message : 'Could not take photo',
      );
    }
  };

  const onToggleRecord = async () => {
    if (busy) return;
    if (!(await ensurePermissions())) return;

    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }

    setRecording(true);
    elapsedRef.current = 0;
    setElapsed(0);
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      const s = elapsedRef.current;
      setElapsed(s);
      if (s >= VIDEO_MAX_DURATION_SEC) {
        cameraRef.current?.stopRecording();
      }
    }, 1000);

    try {
      const clip = await cameraRef.current?.recordAsync({
        maxDuration: VIDEO_MAX_DURATION_SEC,
        // Sandbox file only -- never MediaLibrary.
      });
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecording(false);
      if (!clip?.uri) return;
      const durationMs = Math.min(
        (elapsedRef.current || 1) * 1000,
        VIDEO_MAX_DURATION_SEC * 1000,
      );
      await afterCapture(clip.uri, 'video', durationMs);
    } catch (err) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecording(false);
      Alert.alert(
        'Record error',
        err instanceof Error ? err.message : 'Could not record video',
      );
    }
  };

  if (!camPerm) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
      </View>
    );
  }

  if (!camPerm.granted) {
    return (
      <View style={styles.centered}>
        <Stack.Screen options={{ title: 'Camera' }} />
        <Text style={styles.permTitle}>Camera access</Text>
        <Text style={styles.permBody}>
          Findr uses an in-app camera. Photos and short videos stay inside Findr
          (your Findr album + chat) -- they are not saved to your phone gallery.
        </Text>
        <Pressable style={styles.permBtn} onPress={requestCamPerm}>
          <Text style={styles.permBtnText}>Allow camera</Text>
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: mode === 'video' ? 'Record (30s max)' : 'Take photo',
          headerTransparent: true,
          headerTintColor: colors.mist,
        }}
      />
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode={mode === 'video' ? 'video' : 'picture'}
      />
      <View style={styles.privacyBanner}>
        <Text style={styles.privacyText}>
          Stays in Findr only -- not your phone gallery
        </Text>
      </View>
      {recording ? (
        <Text style={styles.timer}>
          {elapsed}s / {VIDEO_MAX_DURATION_SEC}s
        </Text>
      ) : null}
      <View style={styles.controls}>
        <Pressable
          style={styles.secondary}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          disabled={busy || recording}
        >
          <Text style={styles.secondaryText}>Flip</Text>
        </Pressable>
        {mode === 'photo' ? (
          <Pressable
            style={[styles.shutter, busy && styles.disabled]}
            onPress={onTakePhoto}
            disabled={busy}
          />
        ) : (
          <Pressable
            style={[
              styles.shutter,
              recording && styles.shutterRec,
              busy && styles.disabled,
            ]}
            onPress={onToggleRecord}
            disabled={busy}
          />
        )}
        <Pressable
          style={styles.secondary}
          onPress={() => router.back()}
          disabled={recording}
        >
          <Text style={styles.secondaryText}>Close</Text>
        </Pressable>
      </View>
      {busy ? (
        <View style={styles.busyOverlay}>
          <ActivityIndicator color={colors.coral} size="large" />
          <Text style={styles.busyText}>Saving to Findr…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  permTitle: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 20,
  },
  permBody: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  permBtnText: {
    fontFamily: typography.heading,
    color: colors.ink,
    fontSize: 15,
  },
  cancel: {
    fontFamily: typography.bodyMedium,
    color: colors.mistMuted,
    marginTop: spacing.sm,
  },
  privacyBanner: {
    position: 'absolute',
    top: 96,
    alignSelf: 'center',
    backgroundColor: 'rgba(18,21,28,0.75)',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  privacyText: {
    fontFamily: typography.body,
    color: colors.mist,
    fontSize: 12,
  },
  timer: {
    position: 'absolute',
    top: 128,
    alignSelf: 'center',
    fontFamily: typography.heading,
    color: colors.coral,
    fontSize: 16,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.lg,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.mist,
    borderWidth: 4,
    borderColor: colors.coral,
  },
  shutterRec: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    width: 64,
    height: 64,
  },
  secondary: {
    padding: spacing.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 14,
  },
  disabled: { opacity: 0.5 },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  busyText: {
    fontFamily: typography.bodyMedium,
    color: colors.mist,
    fontSize: 14,
  },
});
