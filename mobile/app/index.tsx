import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Findr boot OK (native minimal)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#12151C", alignItems: "center", justifyContent: "center", padding: 24 },
  text: { color: "#E8ECF1", fontSize: 24, fontWeight: "700", textAlign: "center" },
});
