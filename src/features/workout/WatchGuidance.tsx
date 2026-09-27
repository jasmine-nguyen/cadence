import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Card, Text } from '@/components';
import { Watch } from '@/components/icons';
import { colors, radius as radii } from '@/theme';

const TITLE = 'Start this on your watch';
const DETAIL = "It's already synced to your COROS.";

/**
 * Calm, non-interactive hint: workouts are started and recorded on the COROS
 * watch, not in Cadence (CAD-92). Deliberately not a button — no press state.
 */
export function WatchGuidance({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityLabel={`${TITLE}. ${DETAIL}`} style={style}>
      <Card surface="cardInset" radius={radii.card} style={styles.card}>
        <View style={styles.tile}>
          <Watch size={20} color={colors.textSecondary} strokeWidth={1.8} />
        </View>
        <View style={styles.text}>
          <Text variant="bodySmall" weight="600">
            {TITLE}
          </Text>
          <Text variant="meta" color="textSecondary" style={styles.detail}>
            {DETAIL}
          </Text>
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  tile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  detail: { marginTop: 2 },
});
