import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components';
import { Trophy } from '@/components/icons';
import { PlanWeek } from '@/state/types';
import { colors, radius as radii, alpha } from '@/theme';

type Pip = PlanWeek['pips'][number];

function Pip({ kind }: { kind: Pip }) {
  if (kind === 'goal') {
    return (
      <View style={[styles.pip, styles.pipGoal]}>
        <Trophy size={14} color={colors.gold} fill={colors.gold} strokeWidth={0} />
      </View>
    );
  }
  const style =
    kind === 'done'
      ? styles.pipDone
      : kind === 'today'
        ? styles.pipToday
        : kind === 'rest'
          ? styles.pipRest
          : styles.pipUpcoming;
  return <View style={[styles.pip, style]} />;
}

function WeekChip({ chip }: { chip: PlanWeek['chip'] }) {
  if (chip === 'inprogress') {
    return (
      <View style={[styles.chip, styles.chipGreen]}>
        <Text variant="overline" weight="600" color="accentGreen" style={styles.chipText}>
          In progress
        </Text>
      </View>
    );
  }
  if (chip === 'goal') {
    return (
      <View style={[styles.chip, styles.chipGold]}>
        <Text variant="overline" weight="600" color="gold" style={styles.chipText}>
          Goal week
        </Text>
      </View>
    );
  }
  return null;
}

/** All weeks at a glance — one card per week with day pips. */
export function MultiWeek({ weeks }: { weeks: PlanWeek[] }) {
  return (
    <View style={styles.list}>
      {weeks.map((w) => (
        <View key={w.index} style={[styles.weekCard, w.chip === 'goal' && styles.weekCardGoal]}>
          <View style={styles.weekHead}>
            <View style={styles.weekTitleRow}>
              <Text variant="cardTitle" weight="700" style={styles.weekTitle}>
                Week {w.index}
              </Text>
              <WeekChip chip={w.chip} />
            </View>
            <Text variant="meta" weight="500" color="textSecondary">
              {w.title}
            </Text>
          </View>
          <View style={styles.pips}>
            {w.pips.map((p, i) => (
              <Pip key={i} kind={p} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 14 },
  weekCard: { backgroundColor: colors.card, borderRadius: radii.card, paddingVertical: 16, paddingHorizontal: 18 },
  weekCardGoal: { opacity: 0.85 },
  weekHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  weekTitle: { fontSize: 16 },
  chip: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  chipGreen: { backgroundColor: alpha.greenFill },
  chipGold: { backgroundColor: 'rgba(224,175,104,0.15)' },
  chipText: { fontSize: 11, letterSpacing: 0 },
  pips: { flexDirection: 'row', gap: 7 },
  pip: { flex: 1, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pipDone: { backgroundColor: colors.accentGreen },
  pipToday: { backgroundColor: 'rgba(42,195,222,0.3)', borderWidth: 1.5, borderColor: colors.accentCyan },
  pipUpcoming: { backgroundColor: colors.cardInset },
  pipRest: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.stroke },
  pipGoal: { backgroundColor: 'rgba(224,175,104,0.25)', borderWidth: 1.5, borderColor: colors.gold },
});
