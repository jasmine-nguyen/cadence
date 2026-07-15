import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors } from '@/theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Background token (defaults to screen `bg`). */
  background?: keyof typeof colors;
  edges?: readonly Edge[];
  style?: ViewStyle;
}

/**
 * Full-bleed screen container that respects safe areas (status bar + home
 * indicator). Header bars that draw their own background pass `edges` without
 * `top` and paint the notch area themselves.
 */
export function Screen({ children, background = 'bg', edges = ['top', 'bottom'], style }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors[background] }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

interface ScreenScrollProps extends ScrollViewProps {
  children: React.ReactNode;
}

/** Scrollable body with sensible defaults for these screens. */
export function ScreenScroll({ children, contentContainerStyle, ...rest }: ScreenScrollProps) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={contentContainerStyle}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
