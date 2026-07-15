import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ValueField, SegmentedControl, Text } from '@/components';
import { OnboardingChrome } from '@/features/onboarding/OnboardingChrome';
import { useStore } from '@/state/store';
import { Sex } from '@/state/types';
import { spacing } from '@/theme';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'na', label: 'Rather not' },
];

/** Onboarding · Step 1 — About you. All fields optional. */
export default function OnboardingStep1() {
  const router = useRouter();
  const { onboarding, setOnboarding } = useStore();
  const { profile } = onboarding;

  return (
    <OnboardingChrome
      step={1}
      title="About you"
      subtitle="This helps tune your paces. Everything here is optional."
      ctaLabel="Continue"
      onContinue={() => router.push('/onboarding/step2')}
    >
      <View style={styles.fields}>
        <ValueField label="Age" value={String(profile.age ?? '—')} suffix="years" />

        <View style={styles.twoUp}>
          <ValueField
            style={styles.half}
            label="Weight"
            value={String(profile.weight ?? '—')}
            suffix="kg"
          />
          <ValueField
            style={styles.half}
            label="Height"
            value={String(profile.height ?? '—')}
            suffix="cm"
          />
        </View>

        <View>
          <View style={styles.sexLabel}>
            <Text variant="meta" weight="500" color="textSecondary">
              Sex
            </Text>
            <Text variant="meta" weight="500" color="textMuted">
              {'  ·  optional'}
            </Text>
          </View>
          <SegmentedControl
            options={SEX_OPTIONS}
            value={profile.sex ?? null}
            onChange={(sex) =>
              setOnboarding((prev) => ({ ...prev, profile: { ...prev.profile, sex } }))
            }
          />
        </View>
      </View>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  fields: { gap: spacing.lg },
  twoUp: { flexDirection: 'row', gap: 14 },
  half: { flex: 1 },
  sexLabel: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
});
