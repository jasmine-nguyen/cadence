import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components';
import { Repeat, RunFigure, WalkFigure } from '@/components/icons';
import { WorkoutBlock, IntervalStep } from '@/state/types';
import { colors, radius as radii } from '@/theme';

function StepTag({ kind }: { kind: IntervalStep['kind'] }) {
  const run = kind === 'run';
  return (
    <View style={styles.tag}>
      {run ? <RunFigure size={14} /> : <WalkFigure size={14} />}
      <Text variant="meta" weight="600" color={run ? 'accentGreen' : 'textSecondary'}>
        {run ? 'RUN' : 'WALK'}
      </Text>
    </View>
  );
}

function IntervalRow({ step }: { step: IntervalStep }) {
  return (
    <View style={styles.intervalRow}>
      <Text variant="bodySmall" weight="500">
        {step.label}
        {step.detail ? <Text variant="bodySmall" color="textSecondary">{`  ${step.detail}`}</Text> : null}
      </Text>
      <StepTag kind={step.kind} />
    </View>
  );
}

/** One structured block: warm-up strip, gradient repeat strip, or plain row. */
export function StepBlock({ block }: { block: WorkoutBlock }) {
  return (
    <View style={[styles.block, block.dimmed && styles.dimmed]}>
      {block.header === 'warmup' && (
        <View style={styles.warmupStrip}>
          <Text variant="meta" weight="700">
            {block.title}
          </Text>
        </View>
      )}
      {block.header === 'repeat' && (
        <LinearGradient
          colors={[colors.accentGreen, colors.accentCyan]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.repeatStrip}
        >
          <Repeat size={14} color={colors.onAccent} strokeWidth={2.4} />
          <Text variant="meta" weight="700" color="onAccent">
            Repeat ×{block.repeat}
          </Text>
        </LinearGradient>
      )}

      <View style={styles.blockBody}>
        <Text variant="cardTitle" weight="700" style={styles.stepNumber}>
          {block.index}
        </Text>
        <View style={styles.stepDivider} />
        <View style={styles.stepContent}>
          {block.steps.length === 1 && block.header !== 'repeat' ? (
            <IntervalRow step={block.steps[0]} />
          ) : (
            <View style={styles.intervalList}>
              {block.steps.map((s, i) => (
                <IntervalRow key={i} step={s} />
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.card,
    borderRadius: radii.listRow + 1,
    overflow: 'hidden',
  },
  dimmed: { opacity: 0.85 },
  warmupStrip: {
    backgroundColor: colors.stroke,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  repeatStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 15,
  },
  blockBody: {
    flexDirection: 'row',
    paddingVertical: 13,
    paddingHorizontal: 15,
    alignItems: 'stretch',
  },
  stepNumber: { width: 26, fontStyle: 'italic' },
  stepDivider: { width: 2, backgroundColor: colors.textMuted, marginRight: 13, borderRadius: 1 },
  stepContent: { flex: 1, justifyContent: 'center' },
  intervalList: { gap: 9 },
  intervalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
