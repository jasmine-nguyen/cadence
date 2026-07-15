import React from 'react';
import Svg, { Rect, Circle } from 'react-native-svg';
import { colors } from '@/theme';

/** Calendar-grid icon with colored status dots (cyan/green/gold). */
export function CalendarDotsIcon({ muted = false }: { muted?: boolean }) {
  const dot = (c: string) => (muted ? colors.textMuted : c);
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={4.5} width={18} height={16} rx={3} stroke={colors.text} strokeWidth={1.6} />
      <Circle cx={8} cy={11} r={1.3} fill={dot(colors.accentGreen)} />
      <Circle cx={12} cy={11} r={1.3} fill={dot(colors.accentCyan)} />
      {!muted && <Circle cx={16} cy={11} r={1.3} fill={colors.gold} />}
      {!muted && <Circle cx={8} cy={15.5} r={1.3} fill={colors.accentGreen} />}
    </Svg>
  );
}
