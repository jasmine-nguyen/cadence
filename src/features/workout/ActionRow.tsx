import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components';
import { StretchFigure } from '@/components/icons';
import { Map, Link2, ArrowRight } from '@/components/icons';
import { colors, alpha } from '@/theme';

interface Action {
  key: string;
  label: string;
  icon: React.ReactNode;
  destructive?: boolean;
  onPress?: () => void;
}

/** Four circular icon actions; SKIP WORKOUT is destructive (red). */
export function ActionRow({ onSkip }: { onSkip: () => void }) {
  const actions: Action[] = [
    {
      key: 'warmup',
      label: 'WARM-UP\nSTRETCHES',
      icon: <StretchFigure size={20} color={colors.textSecondary} strokeWidth={1.7} />,
    },
    {
      key: 'route',
      label: 'ADD\nROUTE',
      icon: <Map size={20} color={colors.textSecondary} strokeWidth={1.7} />,
    },
    {
      key: 'link',
      label: 'LINK\nACTIVITY',
      icon: <Link2 size={20} color={colors.textSecondary} strokeWidth={1.7} />,
    },
    {
      key: 'skip',
      label: 'SKIP\nWORKOUT',
      icon: <ArrowRight size={20} color={colors.red} strokeWidth={1.7} />,
      destructive: true,
      onPress: onSkip,
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((a) => (
        <Pressable key={a.key} style={styles.action} onPress={a.onPress}>
          <View style={[styles.circle, a.destructive && styles.circleDestructive]}>{a.icon}</View>
          <Text
            variant="overline"
            weight="600"
            color={a.destructive ? 'red' : 'textSecondary'}
            center
            style={styles.label}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  action: { flex: 1, alignItems: 'center', gap: 7 },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDestructive: { borderColor: alpha.redRing },
  label: { fontSize: 10, letterSpacing: 0.3, lineHeight: 13 },
});
