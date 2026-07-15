import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components';
import { RefreshCw } from '@/components/icons';
import { useStore } from '@/state/store';
import { TodayState } from '@/state/types';
import { colors, radius as radii } from '@/theme';

const ORDER: TodayState[] = ['planned', 'paused', 'completed', 'empty', 'error'];

/**
 * Dev-only control to preview all five Today states on device. Rendered behind
 * `__DEV__` from the Today screen; not part of the shipped UI.
 */
export function TodayStateSwitcher() {
  const { todayState, setTodayState } = useStore();

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(todayState) + 1) % ORDER.length];
    setTodayState(next);
  };

  return (
    <Pressable onPress={cycle} style={styles.pill} accessibilityLabel="Cycle Today state">
      <RefreshCw size={13} color={colors.textSecondary} strokeWidth={2} />
      <Text variant="meta" weight="600" color="textSecondary">
        {todayState}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: 10,
    top: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.chip,
    paddingVertical: 6,
    paddingHorizontal: 11,
    opacity: 0.9,
  },
});
