import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

/** Placeholder nearby profiles until geo API is wired. */
const PLACEHOLDERS = [
  { id: '1', name: 'Alex', age: 28, distance: '~0.4 mi', online: true },
  { id: '2', name: 'Jordan', age: 31, distance: '~0.8 mi', online: false },
  { id: '3', name: 'Sam', age: 24, distance: '~1.2 mi', online: true },
  { id: '4', name: 'Riley', age: 27, distance: '~1.5 mi', online: false },
  { id: '5', name: 'Casey', age: 33, distance: '~2.1 mi', online: true },
  { id: '6', name: 'Morgan', age: 29, distance: '~2.4 mi', online: false },
];

export default function NearbyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.sub}>
        People near you · distances are approximate
      </Text>
      <FlatList
        data={PLACEHOLDERS}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.photo}>
              <Text style={styles.initial}>{item.name[0]}</Text>
              {item.online ? <View style={styles.onlineDot} /> : null}
            </View>
            <Text style={styles.name}>
              {item.name}, {item.age}
            </Text>
            <Text style={styles.meta}>{item.distance}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  sub: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    fontSize: 13,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flex: 1,
    gap: spacing.xs,
  },
  photo: {
    aspectRatio: 3 / 4,
    borderRadius: radii.lg,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: typography.brand,
    fontSize: 42,
    color: colors.coral,
  },
  onlineDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.online,
  },
  name: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 15,
  },
  meta: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
  },
});
