import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, radius as radii } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  /** Surface token (defaults to `card`). */
  surface?: 'card' | 'cardInset' | 'cardInsetDeep' | 'bgElevated';
  radius?: number;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Card / list-row surface. Becomes pressable when `onPress` is supplied. */
export function Card({
  children,
  surface = 'card',
  radius = radii.cardLarge,
  padding,
  onPress,
  style,
}: CardProps) {
  const containerStyle: StyleProp<ViewStyle> = [
    { backgroundColor: colors[surface], borderRadius: radius },
    padding != null && { padding },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [containerStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
});
