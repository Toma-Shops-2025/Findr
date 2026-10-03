import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { colors, radii, spacing, typography } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEMO_COORDS, fuzzLatLng } from "@/lib/locationPrivacy";
export default function NearbyScreen() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    if (!accessToken) { setError("Sign in to see people nearby."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const fuzzed = fuzzLatLng(DEMO_COORDS.latitude, DEMO_COORDS.longitude);
      await apiFetch("/geo/location", { method: "POST", token: accessToken, body: JSON.stringify({ latitude: fuzzed.latitude, longitude: fuzzed.longitude }) });
      const data = await apiFetch("/geo/nearby?radiusKm=50&limit=50", { token: accessToken });
      setItems(data.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load nearby");
      setItems([]);
    } finally { setLoading(false); }
  }, [accessToken]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (loading) return (<View style={styles.centered}><ActivityIndicator color={colors.coral} /><Text style={styles.sub}>Finding people...</Text></View>);
  return (
    <View style={styles.container}>
      <Text style={styles.sub}>Stage 1 demo area (GPS parked).</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList data={items} keyExtractor={(item) => item.userId} numColumns={2} columnWrapperStyle={{ gap: spacing.md }} contentContainerStyle={{ padding: spacing.md }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.coral} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push("/user/" + item.userId)}>
            <View style={styles.photo}><Text style={styles.initial}>{(item.displayName?.[0] || "?").toUpperCase()}</Text></View>
            <Text style={styles.name}>{item.displayName}, {item.age}</Text>
            <Text style={styles.meta}>{item.distanceLabel}</Text>
          </Pressable>
        )} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  centered: { flex: 1, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", gap: spacing.md },
  sub: { color: colors.mistMuted, padding: spacing.md, fontSize: 13, fontFamily: typography.body },
  error: { color: colors.danger, paddingHorizontal: spacing.md, fontFamily: typography.body },
  card: { flex: 1, gap: spacing.xs, marginBottom: spacing.md },
  photo: { aspectRatio: 3/4, borderRadius: radii.lg, backgroundColor: colors.inkElevated, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  initial: { color: colors.coral, fontSize: 42, fontFamily: typography.brand },
  name: { color: colors.mist, fontSize: 15, fontFamily: typography.heading },
  meta: { color: colors.mistMuted, fontSize: 12, fontFamily: typography.body },
});