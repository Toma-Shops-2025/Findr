import {
  ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from "react-native";
import { useCallback, useEffect, useState } from "react";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { primaryPhotoUrl } from "@/lib/mediaUrl";
import { LOOKING_FOR_OPTIONS } from "@/lib/types";

export default function ProfileScreen() {
  const { accessToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [genderIdentity, setGenderIdentity] = useState("");
  const [orientationsShown, setOrientationsShown] = useState("");
  const [orientationsSeeking, setOrientationsSeeking] = useState("");
  const [lookingFor, setLookingFor] = useState([]);
  const [photoUrls, setPhotoUrls] = useState([]);
  const [ageText, setAgeText] = useState("");
  const [isVisible, setIsVisible] = useState(true);
  const [age, setAge] = useState(null);

  const applyProfile = useCallback((p) => {
    setDisplayName(p.displayName || "");
    setBio(p.bio || "");
    setGenderIdentity(p.genderIdentity || "");
    setOrientationsShown((p.orientationsShown || []).join(", "));
    setOrientationsSeeking((p.orientationsSeeking || []).join(", "));
    setLookingFor(p.lookingFor || []);
    setPhotoUrls(p.photoUrls || []);
    setIsVisible(p.isVisible !== false);
    setAge(p.age != null ? p.age : null);
    setAgeText(p.age != null ? String(p.age) : "");
  }, []);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try {
      const data = await apiFetch("/profiles/me", { token: accessToken });
      applyProfile(data.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally { setLoading(false); }
  }, [accessToken, applyProfile]);

  useEffect(() => { load(); }, [load]);

  const toggleLookingFor = (value) => {
    setLookingFor((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };
  const splitCsv = (value) => value.split(",").map((s) => s.trim()).filter(Boolean);
  const onPhotosStage2 = () => Alert.alert("Photos return in Stage 2", "Profile photo upload is parked for Stage 1 Metro.");

  const onSave = async () => {
    if (!accessToken) return;
    if (!displayName.trim()) { Alert.alert("Display name required", "Add a name so people can find you."); return; }
    let agePayload = undefined;
    const trimmedAge = ageText.trim();
    if (trimmedAge) {
      const n = Number(trimmedAge);
      if (!Number.isInteger(n) || n < 18 || n > 120) { Alert.alert("Age must be 18+", "Enter a whole number age of 18 or older."); return; }
      agePayload = n;
    }
    setSaving(true); setError(null);
    try {
      const body = {
        displayName: displayName.trim(), bio: bio.trim(), genderIdentity: genderIdentity.trim(),
        orientationsShown: splitCsv(orientationsShown), orientationsSeeking: splitCsv(orientationsSeeking),
        lookingFor, photoUrls, isVisible, age: agePayload,
      };
      if (agePayload === undefined) delete body.age;
      const data = await apiFetch("/profiles/me", { method: "PUT", token: accessToken, body: JSON.stringify(body) });
      applyProfile(data.profile);
      Alert.alert("Saved", "Your Findr profile is up to date.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setError(message); Alert.alert("Could not save", message);
    } finally { setSaving(false); }
  };

  if (loading) {
    return (<View style={styles.centered}><ActivityIndicator color={colors.coral} /><Text style={styles.meta}>Loading profile...</Text></View>);
  }
  const initial = (displayName.trim()[0] || "?").toUpperCase();
  const photoUri = primaryPhotoUrl(photoUrls);
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.photo} onPress={onPhotosStage2}>
        {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoImage} /> : <Text style={styles.initial}>{initial}</Text>}
      </Pressable>
      <Pressable onPress={onPhotosStage2}><Text style={styles.photoLink}>Photos return in Stage 2</Text></Pressable>
      <Text style={styles.name}>{displayName.trim() || "Your profile"}</Text>
      <Text style={styles.meta}>{age != null ? String(age) + " | on your profile" : "18+ attested | add age below"}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.label}>Age</Text>
      <TextInput style={styles.input} value={ageText} onChangeText={setAgeText} placeholder="18+" placeholderTextColor={colors.mistMuted} keyboardType="number-pad" maxLength={3} />
      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="How you show up nearby" placeholderTextColor={colors.mistMuted} maxLength={40} />
      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.bio]} value={bio} onChangeText={setBio} placeholder="A little about you" placeholderTextColor={colors.mistMuted} multiline maxLength={500} />
      <Text style={styles.label}>Gender identity</Text>
      <TextInput style={styles.input} value={genderIdentity} onChangeText={setGenderIdentity} placeholder="e.g. Woman, Man, Non-binary" placeholderTextColor={colors.mistMuted} />
      <Text style={styles.label}>Orientations shown (comma-separated)</Text>
      <TextInput style={styles.input} value={orientationsShown} onChangeText={setOrientationsShown} placeholder="e.g. Bi, Queer" placeholderTextColor={colors.mistMuted} />
      <Text style={styles.label}>Orientations seeking (comma-separated)</Text>
      <TextInput style={styles.input} value={orientationsSeeking} onChangeText={setOrientationsSeeking} placeholder="Who you are open to meeting" placeholderTextColor={colors.mistMuted} />
      <Text style={styles.label}>Looking for</Text>
      <View style={styles.chips}>
        {LOOKING_FOR_OPTIONS.map((option) => {
          const selected = lookingFor.includes(option);
          return (
            <Pressable key={option} onPress={() => toggleLookingFor(option)} style={[styles.chip, selected && styles.chipOn]}>
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Text style={styles.label}>Visible in Nearby</Text></View>
        <Switch value={isVisible} onValueChange={setIsVisible} trackColor={{ false: colors.border, true: colors.teal }} thumbColor={colors.mist} />
      </View>
      <Pressable style={[styles.save, saving && styles.saveDisabled]} onPress={onSave} disabled={saving}>
        <Text style={styles.saveText}>{saving ? "Saving..." : "Save profile"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl * 2 },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", gap: spacing.md },
  photo: { width: 120, height: 150, borderRadius: radii.lg, backgroundColor: colors.inkElevated, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  photoLink: { fontFamily: typography.bodyMedium, color: colors.coral, fontSize: 14 },
  initial: { fontFamily: typography.brand, fontSize: 48, color: colors.coral },
  name: { fontFamily: typography.heading, fontSize: 24, color: colors.mist },
  meta: { fontFamily: typography.body, color: colors.mistMuted, fontSize: 14, marginBottom: spacing.sm },
  label: { fontFamily: typography.heading, color: colors.teal, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.sm },
  input: { backgroundColor: colors.inkElevated, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.mist, fontFamily: typography.body, fontSize: 16, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
  bio: { minHeight: 96, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.inkElevated },
  chipOn: { borderColor: colors.coral, backgroundColor: colors.coralDim },
  chipText: { fontFamily: typography.bodyMedium, color: colors.mistMuted, fontSize: 14 },
  chipTextOn: { color: colors.mist },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  save: { marginTop: spacing.lg, backgroundColor: colors.coral, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center" },
  saveDisabled: { opacity: 0.6 },
  saveText: { fontFamily: typography.heading, color: colors.ink, fontSize: 16 },
  error: { fontFamily: typography.body, color: colors.danger, fontSize: 14 },
});