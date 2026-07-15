import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme';

interface ProgressRingProps {
  size: number;
  strokeWidth: number;
  /** 0–1 fraction filled. */
  progress: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Circular progress ring. Used for the header week ring, the generating loader,
 * and the large in-progress interval ring. Arc starts at 12 o'clock.
 */
export function ProgressRing({
  size,
  strokeWidth,
  progress,
  color = colors.accentCyan,
  trackColor = colors.cardInset,
  children,
  style,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const dashoffset = circumference * (1 - clamped);
  const center = size / 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          // rotate so the arc begins at the top
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
