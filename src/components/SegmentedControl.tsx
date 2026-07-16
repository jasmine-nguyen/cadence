import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, radius as radii } from '@/theme';

interface SegmentedControlProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}

/**
 * Segmented control — container `cardInsetDeep` w/ stroke, selected pill filled
 * cyan with `onAccent` label. Used for Sex on onboarding step 1.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text
              variant="bodySmall"
              weight={selected ? '600' : '500'}
              color={selected ? 'onAccent' : 'textSecondary'}
              center
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.cardInsetDeep,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.input,
    padding: 5,
  },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.accentCyan,
  },
});
