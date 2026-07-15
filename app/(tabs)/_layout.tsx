import React from 'react';
import { Tabs } from 'expo-router';
import { Sun, ClipboardList, BarChart3, AlignLeft, Settings } from '@/components/icons';
import { colors } from '@/theme';

/** Main tab navigator: Today · Plan · Activities · Insights · Settings. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accentCyan,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.stroke,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <Sun size={23} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <ClipboardList size={23} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color }) => <BarChart3 size={23} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <AlignLeft size={23} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={23} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}
