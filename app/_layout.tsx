import React from 'react';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/state/store';
import { colors } from '@/theme';

/** Tokyo Night navigation theme so stack transitions never flash white. */
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    text: colors.text,
    border: colors.stroke,
    primary: colors.accentCyan,
    notification: colors.red,
  },
};

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.bg },
              // Every screen change cross-fades, matching the tab switches.
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="generating" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="workout" />
            <Stack.Screen name="activity" />
            <Stack.Screen name="feedback" options={{ presentation: 'transparentModal' }} />
            {/* iOS page sheets always slide up and ignore `animation`; full-screen modals honour the fade. */}
            <Stack.Screen name="checkin" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="plan-complete" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
