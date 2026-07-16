import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheet, Text, Chip } from '@/components';
import { Pause } from '@/components/icons';
import { PauseDuration } from '@/state/types';
import { colors, radius as radii, shadows } from '@/theme';

const DURATIONS: { value: PauseDuration; label: string }[] = [
  { value: '1week', label: '1 week' },
  { value: '2weeks', label: '2 weeks' },
  { value: 'until-resume', label: 'Until I resume' },
];

interface PausePlanSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (duration: PauseDuration) => void;
}

/** Pause-plan bottom sheet — duration + confirm (gold). Shared by Plan + Settings. */
export function PausePlanSheet({ visible, onDismiss, onConfirm }: PausePlanSheetProps) {
  const [duration, setDuration] = useState<PauseDuration>('2weeks');

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.iconTile}>
        <Pause size={26} color={colors.gold} fill={colors.gold} strokeWidth={0} />
      </View>
      <Text variant="h2" style={styles.title}>
        Pause your plan?
      </Text>
      <Text variant="body" color="textSecondary" style={styles.copy}>
        We'll hold your schedule and stop reminders. Resume any time — the remaining weeks shift
        forward from the day you come back.
      </Text>

      <Text variant="overline" color="textMuted" style={styles.label}>
        For how long?
      </Text>
      <View style={styles.chips}>
        {DURATIONS.map((d) => (
          <Chip
            key={d.value}
            label={d.label}
            equal
            selected={duration === d.value}
            selectedColor={colors.gold}
            onPress={() => setDuration(d.value)}
          />
        ))}
      </View>

      <Pressable
        onPress={() => onConfirm(duration)}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <Text variant="button" color="onAccent" style={styles.ctaLabel}>
          Pause plan
        </Text>
      </Pressable>
      <Pressable style={styles.dismiss} onPress={onDismiss} hitSlop={6}>
        <Text variant="body" weight="600" color="textSecondary">
          Never mind
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(224,175,104,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 23, marginBottom: 8 },
  copy: { marginBottom: 22 },
  label: { marginBottom: 10 },
  chips: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  cta: {
    backgroundColor: colors.gold,
    borderRadius: 15,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 4,
    ...shadows.goldGlow,
  },
  ctaLabel: { fontSize: 16 },
  dismiss: { alignItems: 'center', paddingVertical: 12 },
  pressed: { opacity: 0.85 },
});
