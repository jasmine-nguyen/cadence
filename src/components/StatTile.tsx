import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Text } from './Text';
import { colors, radius as radii } from '@/theme';

interface StatTileProps {
  value: string;
  /** Muted denominator/suffix shown after the value (e.g. "/4", " km"). */
  suffix?: string;
  label: string;
  /** Wrap in a cardInset tile (Plan header) vs. plain (Activities header). */
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Compact stat: big number (+ muted suffix) over a label. */
export function StatTile({ value, suffix, label, card = false, style }: StatTileProps) {
  return (
    <View style={[card && styles.card, style]}>
      <Text variant="cardTitle" weight="700" style={styles.value}>
        {value}
        {suffix ? (
          <Text variant="meta" color="textMuted">
            {suffix}
          </Text>
        ) : null}
      </Text>
      <Text variant="meta" weight="500" color={card ? 'textSecondary' : 'textSecondary'} style={styles.label}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.cardInset,
    borderRadius: radii.input,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  value: { fontSize: 19 },
  label: { fontSize: 11, marginTop: 2 },
});
