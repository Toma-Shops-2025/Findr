import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Findr boot OK</Text>
      <Text style={styles.sub}>Diagnostic build ? if you see this, splash crash is in app code, not the device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: "#12151C", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#F5F2EA", fontSize: 28, fontWeight: "700", marginBottom: 12 },
  sub: { color: "#A8A29A", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
