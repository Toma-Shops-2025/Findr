import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text } from 'react-native';

import { colors, typography } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  color,
  size,
}: {
  name: IoniconName;
  color: string;
  size: number;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}

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
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="compass-outline" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Nearby" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chatbubbles-outline" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Chats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="person-outline" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Safety',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="shield-checkmark-outline" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Safety" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
