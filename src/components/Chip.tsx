import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Text';
import { colors, radius as radii } from '@/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Fill color when selected (defaults to cyan; "None" injury uses green). */
  selectedColor?: string;
  /** Stretch to fill an equal-width row (frequency chips). */
  equal?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Pill chip — used for injuries (multi-select) and run frequency (single). */
export function Chip({
  label,
  selected = false,
  onPress,
  selectedColor = colors.accentCyan,
  equal = false,
  style,
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        equal && styles.equal,
        selected
          ? { backgroundColor: selectedColor, borderColor: selectedColor }
          : { borderColor: colors.stroke },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text
        variant="bodySmall"
        weight={selected ? '600' : '500'}
        color={selected ? 'onAccent' : 'textSecondary'}
        center={equal}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: radii.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equal: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.8 },
});
