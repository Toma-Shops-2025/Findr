import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/constants/theme';

const THREADS = [
  { id: 't1', name: 'Alex', preview: 'Hey — free later?', time: '2m' },
  { id: 't2', name: 'Jordan', preview: 'Coffee tomorrow?', time: '1h' },
  { id: 't3', name: 'Sam', preview: 'Nice profile 👋', time: 'Yesterday' },
];

export default function ChatsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        Chat list stub · TODO: Stream / Ably / Firebase adapter
      </Text>
      <FlatList
        data={THREADS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
            <View style={styles.body}>
              <View style={styles.top}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
              <Text style={styles.preview} numberOfLines={1}>
                {item.preview}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  hint: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.inkElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.heading,
    color: colors.teal,
    fontSize: 18,
  },
  body: { flex: 1, justifyContent: 'center', gap: 2 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  name: {
    fontFamily: typography.heading,
    color: colors.mist,
    fontSize: 16,
  },
  time: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 12,
  },
  preview: {
    fontFamily: typography.body,
    color: colors.mistMuted,
    fontSize: 14,
  },
});
