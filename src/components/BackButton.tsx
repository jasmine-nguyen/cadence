import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from './icons';
import { colors } from '@/theme';

interface BackButtonProps {
  onPress?: () => void;
  color?: string;
}

/** Top-left back chevron. Falls back to router.back(). */
export function BackButton({ onPress, color = colors.textSecondary }: BackButtonProps) {
  const router = useRouter();
  return (
    <Pressable
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      onPress={onPress ?? (() => router.back())}
    >
      <ChevronLeft size={24} color={color} strokeWidth={2} />
    </Pressable>
  );
}
