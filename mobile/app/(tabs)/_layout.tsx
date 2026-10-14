import { Tabs } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { GuidelinesAckModal } from '@/components/GuidelinesAckModal';
import { TabBarSymbol } from '@/components/TabBarSymbol';
import { colors, typography } from '@/constants/theme';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { registerFindrPushToken } from '@/lib/push';
import { useChatUnreadCount } from '@/lib/useChatUnread';

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
  const unreadChats = useChatUnreadCount();
  const { accessToken } = useAuth();
  const [showGuidelines, setShowGuidelines] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    void registerFindrPushToken(accessToken);
    void (async () => {
      try {
        const data = await apiFetch<{ acknowledged: boolean }>(
          '/profiles/me/guidelines',
          { token: accessToken },
        );
        if (!data.acknowledged) setShowGuidelines(true);
      } catch {
        setShowGuidelines(true);
      }
    })();
  }, [accessToken]);

  return (
    <>
    <GuidelinesAckModal
      visible={showGuidelines}
      onAccept={() => {
        setShowGuidelines(false);
        if (!accessToken) return;
        void apiFetch('/profiles/me/ack-guidelines', {
          method: 'POST',
          token: accessToken,
        });
      }}
    />
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
            <TabBarSymbol id="nearby" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Nearby" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: 'Chats',
          tabBarBadge: unreadChats > 0 ? unreadChats : undefined,
          tabBarIcon: ({ color, size }) => (
            <View>
              <TabBarSymbol id="chats" color={color} size={size} />
              {unreadChats > 0 ? <View style={tabBadgeDot} /> : null}
            </View>
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Chats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarSymbol id="profile" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Profile" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Safety',
          tabBarIcon: ({ color, size }) => (
            <TabBarSymbol id="safety" color={color} size={size} />
          ),
          tabBarLabel: ({ focused }) => <TabLabel label="Safety" focused={focused} />,
        }}
      />
    </Tabs>
    </>
  );
}

const tabBadgeDot = {
  position: 'absolute' as const,
  top: -2,
  right: -4,
  width: 9,
  height: 9,
  borderRadius: 5,
  backgroundColor: colors.coral,
  borderWidth: 1,
  borderColor: colors.inkElevated,
};
