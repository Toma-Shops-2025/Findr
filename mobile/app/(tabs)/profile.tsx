import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { colors, radii, spacing, typography } from '@/constants/theme';
import { apiFetch, apiUploadImage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { primaryPhotoUrl } from '@/lib/mediaUrl';
import { LOOKING_FOR_OPTIONS, type LookingFor, type PublicProfile } from '@/lib/types';

export default function ProfileScreen() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [visibilitySaving, setVisibilitySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [orientationsShown, setOrientationsShown] = useState('');
  const [orientationsSeeking, setOrientationsSeeking] = useState('');
  const [lookingFor, setLookingFor] = useState<LookingFor[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [ageText, setAgeText] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [age, setAge] = useState<number | null>(null);

  const applyProfile = useCallback((p: PublicProfile) => {
    setDisplayName(p.displayName || '');
    setBio(p.bio || '');
    setGenderIdentity(p.genderIdentity || '');
    setOrientationsShown((p.orientationsShown || []).join(', '));
    setOrientationsSeeking((p.orientationsSeeking || []).join(', '));
    setLookingFor(p.lookingFor || []);
    setPhotoUrls(p.photoUrls || []);
    setIsVisible(p.isVisible !== false);
    setAge(p.age != null ? p.age : null);
    setAgeText(p.age != null ? String(p.age) : '');
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
        token: accessToken,
      });
      applyProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [accessToken, applyProfile]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-sync when returning from Safety (same isVisible field).
  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      void (async () => {
        try {
          const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
            token: accessToken,
          });
          setIsVisible(data.profile?.isVisible !== false);
        } catch {
          // ignore focus refresh errors
        }
      })();
    }, [accessToken]),
  );

  const toggleLookingFor = (value: LookingFor) => {
    setLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );
  };
  const splitCsv = (value: string) =>
    value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const onPickPhoto = async () => {
    if (!accessToken || uploading) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow Findr to access your photos to set a profile picture.',
      );
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;

    setUploading(true);
    setError(null);
    try {
      const asset = picked.assets[0];
      const uploaded = await apiUploadImage(asset.uri, {
        token: accessToken,
        kind: 'profile',
        fileName: asset.fileName ?? 'profile.jpg',
      });
      setPhotoUrls((prev) =>
        [uploaded.url, ...prev.filter((u) => u !== uploaded.url)].slice(0, 6),
      );
      // Refresh from server (upload also updates profile photoUrls).
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      Alert.alert('Could not upload', message);
    } finally {
      setUploading(false);
    }
  };

  const onToggleVisibility = (next: boolean) => {
    if (!accessToken || visibilitySaving) return;
    const prev = isVisible;
    setIsVisible(next);
    setVisibilitySaving(true);
    void (async () => {
      try {
        const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
          method: 'PUT',
          token: accessToken,
          body: JSON.stringify({ isVisible: next }),
        });
        setIsVisible(data.profile?.isVisible !== false);
      } catch (err) {
        setIsVisible(prev);
        Alert.alert(
          'Could not update visibility',
          err instanceof Error ? err.message : 'Try again',
        );
      } finally {
        setVisibilitySaving(false);
      }
    })();
  };

  const onSave = async () => {
    if (!accessToken) return;
    if (!displayName.trim()) {
      Alert.alert('Display name required', 'Add a name so people can find you.');
      return;
    }
    let agePayload: number | undefined = undefined;
    const trimmedAge = ageText.trim();
    if (trimmedAge) {
      const n = Number(trimmedAge);
      if (!Number.isInteger(n) || n < 18 || n > 120) {
        Alert.alert(
          'Age must be 18+',
          'Enter a whole number age of 18 or older.',
        );
        return;
      }
      agePayload = n;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        genderIdentity: genderIdentity.trim(),
        orientationsShown: splitCsv(orientationsShown),
        orientationsSeeking: splitCsv(orientationsSeeking),
        lookingFor,
        photoUrls,
        isVisible,
        age: agePayload,
      };
      if (agePayload === undefined) delete body.age;
      const data = await apiFetch<{ profile: PublicProfile }>('/profiles/me', {
        method: 'PUT',
        token: accessToken,
        body: JSON.stringify(body),
      });
      applyProfile(data.profile);
      Alert.alert('Saved', 'Your Findr profile is up to date.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      setError(message);
      Alert.alert('Could not save', message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.coral} />
        <Text style={styles.meta}>Loading profile...</Text>
      </View>
    );
  }
  const initial = (displayName.trim()[0] || '?').toUpperCase();
  const photoUri = primaryPhotoUrl(photoUrls);
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        style={styles.photo}
        onPress={onPickPhoto}
        disabled={uploading}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoImage} />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
        {uploading ? (
          <View style={styles.photoOverlay}>
            <ActivityIndicator color={colors.mist} />
          </View>
        ) : null}
      </Pressable>
      <Pressable onPress={onPickPhoto} disabled={uploading}>
        <Text style={styles.photoLink}>
          {uploading ? 'Uploading...' : photoUri ? 'Change photo' : 'Add photo'}
        </Text>
      </Pressable>
      <Text style={styles.name}>{displayName.trim() || 'Your profile'}</Text>
      <Text style={styles.meta}>
        {age != null
          ? String(age) + ' | on your profile'
          : '18+ attested | add age below'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Age</Text>
      <TextInput
        style={styles.input}
        value={ageText}
        onChangeText={setAgeText}
        placeholder="18+"
        placeholderTextColor={colors.mistMuted}
        keyboardType="number-pad"
        maxLength={3}
      />
      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="How you show up nearby"
        placeholderTextColor={colors.mistMuted}
        maxLength={40}
      />
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bio]}
        value={bio}
        onChangeText={setBio}
        placeholder="A little about you"
        placeholderTextColor={colors.mistMuted}
        multiline
        maxLength={500}
      />
      <Text style={styles.label}>Gender identity</Text>
      <TextInput
        style={styles.input}
        value={genderIdentity}
        onChangeText={setGenderIdentity}
        placeholder="e.g. Woman, Man, Non-binary"
        placeholderTextColor={colors.mistMuted}
      />
      <Text style={styles.label}>Orientations shown (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={orientationsShown}
        onChangeText={setOrientationsShown}
        placeholder="e.g. Bi, Queer"
        placeholderTextColor={colors.mistMuted}
      />
      <Text style={styles.label}>Orientations seeking (comma-separated)</Text>
      <TextInput
        style={styles.input}
        value={orientationsSeeking}
        onChangeText={setOrientationsSeeking}
        placeholder="Who you are open to meeting"
        placeholderTextColor={colors.mistMuted}
      />
      <Text style={styles.label}>Looking for</Text>
      <View style={styles.chips}>
        {LOOKING_FOR_OPTIONS.map((option) => {
          const selected = lookingFor.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggleLookingFor(option)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Visible in Nearby</Text>
          <Text style={styles.metaInline}>
            Same as Safety Visibility | {isVisible ? 'On' : 'Off'}
          </Text>
        </View>
        <Switch
          value={isVisible}
          onValueChange={onToggleVisibility}
          disabled={visibilitySaving}
          trackColor={{ false: colors.border, true: colors.teal }}
          thumbColor={colors.mist}
        />
      </View>
      <Pressable
        style={[styles.save, saving && styles.saveDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save profile'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  photo: {
    width: 120,
    height: 150,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photoImage: { width: '100%', height: '100%' },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLink: {
    fontFamily: typography.bodyMedium,
    color: colors.coral,
    fontSize: 14,
  },
  initial: { fontFamily: typography.brand, fontSize: 48, color: colors.coral },
  name: { fontFamily: typography.heading, fontSize: 24, color: colors.mist },
  meta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  metaInline: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    fontFamily: typography.heading,
    color: colors.teal,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.mist,
    fontFamily: typography.body,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bio: { minHeight: 96, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.inkElevated,
  },
  chipOn: { borderColor: colors.coral, backgroundColor: colors.coralDim },
  chipText: {
    fontFamily: typography.bodyMedium,
    color: colors.mistMuted,
    fontSize: 14,
  },
  chipTextOn: { color: colors.mist },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  save: {
    marginTop: spacing.lg,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { fontFamily: typography.heading, color: colors.ink, fontSize: 16 },
  error: { fontFamily: typography.body, color: colors.danger, fontSize: 14 },
});
