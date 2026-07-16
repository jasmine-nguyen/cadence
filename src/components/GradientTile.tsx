import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

interface GradientTileProps {
  size?: number;
  radius?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** cyan→green gradient rounded tile (coach avatar, account avatar, brand). */
export function GradientTile({ size = 66, radius = 19, children, style }: GradientTileProps) {
  return (
    <LinearGradient
      colors={[colors.accentCyan, colors.accentGreen]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[{ width: size, height: size, borderRadius: radius }, styles.center, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
