import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontFamily: typography.bodyMedium,
        fontSize: 11,
        color: focused ? colors.coral : colors.mistMuted,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.mist,
        headerTitleStyle: { fontFamily: typography.heading },
        tabBarStyle: {
          backgroundColor: colors.inkElevated,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.mistMuted,
      }}
    >
      <Tabs.Screen
        name="nearby"
        options={{
          title: 'Nearby',
          tabBarLabel: ({ focused }) => <TabLabel label="Nearby" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarLabel: ({ focused }) => <TabLabel label="Chats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Safety',
          tabBarLabel: ({ focused }) => <TabLabel label="Safety" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
