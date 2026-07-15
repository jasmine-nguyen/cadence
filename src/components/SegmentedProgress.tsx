import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors } from '@/theme';

interface SegmentedProgressProps {
  total: number;
  /** Number of leading filled segments. */
  filled: number;
  /** Fill color (cyan for onboarding steps, green for week progress). */
  color?: string;
  height?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Multi-segment progress bar. Powers the 3-step onboarding header and the
 * 4-segment week-overview bar.
 */
export function SegmentedProgress({
  total,
  filled,
  color = colors.accentCyan,
  height = 5,
  gap = 7,
  style,
}: SegmentedProgressProps) {
  return (
    <View style={[styles.row, { gap }, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height,
            borderRadius: 3,
            backgroundColor: i < filled ? color : colors.stroke,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
