import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, Button } from '@/components';
import { Lightbulb, AlignLeft, ChevronRight, Check, Clock } from '@/components/icons';
import { Workout } from '@/state/types';
import { seedResult } from '@/state/data';
import { colors, radius as radii, alpha } from '@/theme';

/** Green→transparent accent rail down the left edge of the workout card. */
function AccentRail({ solid = false }: { solid?: boolean }) {
  if (solid) return <View style={[styles.rail, { backgroundColor: colors.accentGreen }]} />;
  return (
    <LinearGradient
      colors={[colors.accentGreen, 'rgba(158,206,106,0)']}
      style={styles.rail}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    />
  );
}

/** Today · Planned — workout card with the "why today" briefing. */
export function PlannedWorkoutCard({
  workout,
  onOpen,
}: {
  workout: Workout;
  onOpen: () => void;
}) {
  return (
    <View style={styles.cardRow}>
      <AccentRail />
      <View style={styles.cardBody}>
        <View style={styles.checkbox} />
        <Text variant="cardTitleLarge">{workout.title}</Text>
        <Text variant="body" color="textSecondary" style={styles.meta}>
          {workout.dateLabel} · {workout.distanceLabel}
        </Text>

        <View style={styles.whyPanel}>
          <View style={styles.whyHeader}>
            <Lightbulb size={16} color={colors.accentCyan} strokeWidth={1.9} />
            <Text variant="overline" color="accentCyan" style={styles.whyLabel}>
              Why today
            </Text>
          </View>
          <Text variant="bodySmall">{workout.why}</Text>
        </View>

        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.viewRow, pressed && styles.pressed]}
        >
          <AlignLeft size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <Text variant="bodySmall" style={styles.viewLabel}>
            View full workout
          </Text>
          <ChevronRight size={16} color={colors.textMuted} strokeWidth={2.2} />
        </Pressable>
      </View>
    </View>
  );
}

/** Today · Completed — green rail, completed chip, result stats. */
export function CompletedWorkoutCard({ workout }: { workout: Workout }) {
  return (
    <View style={styles.cardRow}>
      <AccentRail solid />
      <View style={styles.cardBody}>
        <View style={styles.checkboxDone}>
          <Check size={18} color={colors.onAccent} strokeWidth={2.6} />
        </View>
        <View style={styles.completedChip}>
          <Text variant="overline" weight="700" color="accentGreen" style={styles.completedChipText}>
            Completed
          </Text>
        </View>
        <Text variant="cardTitleLarge">{workout.title}</Text>
        <Text variant="body" color="textSecondary" style={styles.meta}>
          {workout.dateLabel}
        </Text>
        <View style={styles.stats}>
          <Stat label="Distance" value={seedResult.distance} />
          <Stat label="Time" value={seedResult.time} />
          <Stat label="Avg pace" value={seedResult.pace} />
        </View>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text variant="meta" color="textSecondary" style={styles.statLabel}>
        {label}
      </Text>
      <Text variant="cardTitle" weight="700" style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

/** Today · Error — dimmed card, briefing unavailable offline. */
export function ErrorWorkoutCard({ workout }: { workout: Workout }) {
  return (
    <View style={[styles.cardRow, styles.dimmed]}>
      <AccentRail />
      <View style={styles.cardBody}>
        <Text variant="cardTitleLarge">{workout.title}</Text>
        <Text variant="body" color="textSecondary" style={styles.meta}>
          {workout.dateLabel} · {workout.distanceLabel}
        </Text>
        <View style={styles.offlineRow}>
          <Clock size={16} color={colors.textMuted} strokeWidth={1.8} />
          <Text variant="meta" color="textMuted">
            Briefing unavailable offline
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Today · Completed — "NICE WORK" briefing with feedback prompt. */
export function NiceWorkCard({ onFeedback }: { onFeedback?: () => void }) {
  return (
    <View style={styles.niceCard}>
      <View style={styles.whyHeader}>
        <Lightbulb size={16} color={colors.accentCyan} strokeWidth={1.9} />
        <Text variant="overline" color="accentCyan" style={styles.whyLabel}>
          Nice work
        </Text>
      </View>
      <Text variant="bodySmall" style={styles.niceCopy}>
        {seedResult.briefing}
      </Text>
      <View style={styles.niceActions}>
        <Button
          label="How did it feel?"
          onPress={onFeedback}
          style={styles.feelBtn}
          full={false}
        />
        <Button label="Summary" variant="secondary" full={false} style={styles.summaryBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardRow: {
    flexDirection: 'row',
    borderRadius: radii.cardLarge,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  dimmed: { opacity: 0.6 },
  rail: { width: 7 },
  cardBody: { flex: 1, paddingVertical: 20, paddingRight: 20, paddingLeft: 18, position: 'relative' },
  checkbox: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textMuted,
  },
  checkboxDone: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedChip: {
    alignSelf: 'flex-start',
    backgroundColor: alpha.greenFill,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
    marginBottom: 8,
  },
  completedChipText: { letterSpacing: 0.4 },
  meta: { marginTop: 3 },
  whyPanel: {
    marginTop: 16,
    backgroundColor: colors.cardInsetDeep,
    borderRadius: 14,
    padding: 14,
  },
  whyHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 },
  whyLabel: { letterSpacing: 0.4 },
  viewRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.cardInsetDeep,
    borderRadius: 13,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  viewLabel: { flex: 1 },
  stats: { flexDirection: 'row', gap: 20, marginTop: 16 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 18, marginTop: 2 },
  offlineRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 16 },
  niceCard: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  niceCopy: { marginBottom: 14 },
  niceActions: { flexDirection: 'row', gap: 10 },
  feelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12 },
  summaryBtn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12 },
  pressed: { opacity: 0.85 },
});
