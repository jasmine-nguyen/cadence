import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SelectRow, Chip, Text } from '@/components';
import { OnboardingChrome } from '@/features/onboarding/OnboardingChrome';
import { useStore } from '@/state/store';
import { Ability, Injury } from '@/state/types';
import { colors, spacing } from '@/theme';

const ABILITIES: { value: Ability; label: string }[] = [
  { value: 'getting-back', label: 'Getting back into it' },
  { value: 'new', label: 'New to running' },
  { value: 'occasional', label: 'Run occasionally' },
];

const FREQUENCIES: { value: 0 | 1 | 2 | 3; label: string }[] = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
];

const INJURIES: { value: Injury; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'knee', label: 'Knee' },
  { value: 'shin', label: 'Shin' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'hip', label: 'Hip' },
];

/** Onboarding · Step 2 — Your running background. */
export default function OnboardingStep2() {
  const router = useRouter();
  const { onboarding, setOnboarding, toggleInjury } = useStore();
  const { background } = onboarding;

  const setBackground = (patch: Partial<typeof background>) =>
    setOnboarding((prev) => ({ ...prev, background: { ...prev.background, ...patch } }));

  return (
    <OnboardingChrome
      step={2}
      title="Your running background"
      subtitle="So we start you at the right place — no pressure."
      ctaLabel="Continue"
      onContinue={() => router.push('/onboarding/step3')}
    >
      <View style={styles.section}>
        <Text variant="meta" weight="500" color="textSecondary">
          Where are you right now?
        </Text>
        <View style={styles.rows}>
          {ABILITIES.map((a) => (
            <SelectRow
              key={a.value}
              label={a.label}
              selected={background.ability === a.value}
              onPress={() => setBackground({ ability: a.value })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="meta" weight="500" color="textSecondary">
          Runs per week recently
        </Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              equal
              selected={background.frequency === f.value}
              onPress={() => setBackground({ frequency: f.value })}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text variant="meta" weight="500" color="textSecondary">
          Any injuries to work around?
        </Text>
        <View style={styles.wrap}>
          {INJURIES.map((inj) => (
            <Chip
              key={inj.value}
              label={inj.label}
              selected={background.injuries.includes(inj.value)}
              selectedColor={inj.value === 'none' ? colors.accentGreen : colors.accentCyan}
              onPress={() => toggleInjury(inj.value)}
            />
          ))}
        </View>
      </View>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.xl },
  rows: { gap: 9, marginTop: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
});
