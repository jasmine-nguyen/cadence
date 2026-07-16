import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="live" options={{ animation: 'fade' }} />
    </Stack>
  );
}
