import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ValueField, Text } from '@/components';
import { Zap, Activity, Clock } from '@/components/icons';
import { OnboardingChrome } from '@/features/onboarding/OnboardingChrome';
import { useStore } from '@/state/store';
import { GoalType } from '@/state/types';
import { colors, radius as radii, spacing, alpha } from '@/theme';

type GoalDef = {
  value: GoalType;
  title: string;
  subtitle: string;
  Icon: (p: { size: number; color: string; strokeWidth: number }) => React.ReactElement;
};

const GOALS: GoalDef[] = [
  {
    value: '5k',
    title: 'Run 5K continuously',
    subtitle: 'No walk breaks — the classic first milestone',
    Icon: (p) => <Zap {...p} />,
  },
  {
    value: 'habit',
    title: 'Build a running habit',
    subtitle: 'Consistency over distance',
    Icon: (p) => <Activity {...p} />,
  },
  {
    value: '10k',
    title: 'Run 10K',
    subtitle: 'Step up the distance',
    Icon: (p) => <Clock {...p} />,
  },
];

/** Onboarding · Step 3 — Your goal. CTA becomes "Build my plan". */
export default function OnboardingStep3() {
  const router = useRouter();
  const { onboarding, setOnboarding } = useStore();
  const { goal } = onboarding;

  const selectGoal = (type: GoalType) =>
    setOnboarding((prev) => ({ ...prev, goal: { ...prev.goal, type } }));

  return (
    <OnboardingChrome
      step={3}
      title="Your goal"
      subtitle="What are we building toward?"
      ctaLabel="Build my plan"
      onContinue={() => {
        setOnboarding((prev) => ({ ...prev, generating: true }));
        router.replace('/generating');
      }}
    >
      <View style={styles.goals}>
        {GOALS.map((g) => {
          const selected = goal.type === g.value;
          return (
            <Pressable
              key={g.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => selectGoal(g.value)}
              style={({ pressed }) => [
                styles.goalCard,
                selected ? styles.goalCardSelected : styles.goalCardIdle,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconTile, selected && styles.iconTileSelected]}>
                <g.Icon
                  size={selected ? 24 : 22}
                  color={selected ? colors.onAccent : colors.accentGreen}
                  strokeWidth={2}
                />
              </View>
              <View style={styles.goalText}>
                <Text variant="cardTitle" weight={selected ? '700' : '600'} style={styles.goalTitle}>
                  {g.title}
                </Text>
                <Text variant="meta" color="textSecondary">
                  {g.subtitle}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.twoUp}>
        <ValueField
          style={styles.half}
          label="Target date"
          optional
          value={goal.targetDate ?? '—'}
        />
        <ValueField
          style={styles.half}
          label="Days / week"
          value={`${goal.daysPerWeek ?? 4} days`}
        />
      </View>
    </OnboardingChrome>
  );
}

const styles = StyleSheet.create({
  goals: { gap: 11 },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.card,
    padding: 16,
  },
  goalCardIdle: {
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  goalCardSelected: {
    borderWidth: 1.5,
    borderColor: colors.accentCyan,
    backgroundColor: alpha.cyanFill,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardInset,
  },
  iconTileSelected: { backgroundColor: colors.accentCyan },
  goalText: { flex: 1 },
  goalTitle: { marginBottom: 2 },
  twoUp: { flexDirection: 'row', gap: 14, marginTop: spacing.xl },
  half: { flex: 1 },
  pressed: { opacity: 0.85 },
});
