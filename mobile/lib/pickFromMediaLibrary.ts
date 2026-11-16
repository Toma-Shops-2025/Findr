import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerOptions, ImagePickerResult } from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

/**
 * Android 13+: use the system photo picker without READ_MEDIA_* (Play policy).
 * iOS still needs the photos library permission before launchImageLibraryAsync.
 */
export async function ensureMediaLibraryForPicker(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return true;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return perm.granted;
}

export async function launchFindrImageLibraryAsync(
  options: ImagePickerOptions,
  denied: { title: string; body: string },
): Promise<ImagePickerResult | null> {
  const ok = await ensureMediaLibraryForPicker();
  if (!ok) {
    Alert.alert(denied.title, denied.body);
    return null;
  }
  return ImagePicker.launchImageLibraryAsync(options);
}