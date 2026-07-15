import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, SegmentedProgress } from '@/components';
import { ChevronRight, Pause, AlertTriangle, RefreshCw, Zap } from '@/components/icons';
import { PlanProgress } from '@/state/types';
import { colors, radius as radii, alpha } from '@/theme';

/** Week overview card — 4-segment progress + workouts/distance summary. */
export function WeekOverviewCard({
  week,
  progress,
  showChevron = true,
}: {
  week: number;
  progress: PlanProgress;
  showChevron?: boolean;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="cardTitle" weight="600">
          Week {week} overview
        </Text>
        {showChevron && <ChevronRight size={18} color={colors.textSecondary} strokeWidth={2.2} />}
      </View>
      <SegmentedProgress
        total={progress.workoutsTotal}
        filled={progress.workoutsDone}
        color={colors.accentGreen}
        height={6}
        gap={8}
        style={styles.overviewBar}
      />
      <View style={styles.overviewStats}>
        <Text variant="bodySmall" color="textSecondary">
          Workouts{' '}
          <Text variant="bodySmall" weight="600">
            {progress.workoutsDone}/{progress.workoutsTotal}
          </Text>
        </Text>
        <Text variant="bodySmall" color="textSecondary">
          Distance{' '}
          <Text variant="bodySmall" weight="600">
            {progress.distanceDone}/{progress.distanceTotal} km
          </Text>
        </Text>
      </View>
    </View>
  );
}

/** Today · Paused — banner + Resume plan CTA. */
export function PausedBanner({ pausedAt, onResume }: { pausedAt: string | null; onResume: () => void }) {
  return (
    <View style={styles.pausedBanner}>
      <View style={styles.pausedHead}>
        <Pause size={20} color={colors.gold} fill={colors.gold} strokeWidth={0} />
        <Text variant="cardTitle" weight="700" style={styles.pausedTitle}>
          Your plan is paused
        </Text>
      </View>
      <Text variant="bodySmall" color="textSecondary" style={styles.pausedCopy}>
        No workouts scheduled while you're paused. Paused on {pausedAt ?? '15 Jul'} — resume any time
        and we'll pick up where you left off, shifting the remaining weeks forward.
      </Text>
      <Button label="Resume plan" onPress={onResume} style={styles.resumeBtn} />
    </View>
  );
}

/** Today · Paused — dimmed "Where you left off" summary. */
export function WhereYouLeftOff({
  week,
  totalWeeks,
  progress,
}: {
  week: number;
  totalWeeks: number;
  progress: PlanProgress;
}) {
  return (
    <View style={styles.leftOff}>
      <Text variant="cardTitle" weight="600" color="textSecondary">
        Where you left off
      </Text>
      <View style={styles.leftOffStats}>
        <LeftStat label="Week" value={`${week} of ${totalWeeks}`} />
        <LeftStat label="Workouts" value={`${progress.workoutsDone}/${progress.workoutsTotal}`} />
        <LeftStat label="Streak" value={`${progress.streak} days`} />
      </View>
    </View>
  );
}

function LeftStat({ label, value }: { label: string; value: string }) {
  return (
    <Text variant="bodySmall" color="textSecondary">
      {label}{' '}
      <Text variant="bodySmall" weight="600">
        {value}
      </Text>
    </Text>
  );
}

/** Today · Paused — calm rest illustration note. */
export function RestNote() {
  return (
    <View style={styles.restNote}>
      <View style={styles.restTile}>
        <Zap size={26} color={colors.textMuted} strokeWidth={1.8} />
      </View>
      <Text variant="bodySmall" color="textMuted" center>
        Rest is part of training.{'\n'}We'll be here when you're ready.
      </Text>
    </View>
  );
}

/** Today · Error — red-tinted COROS sync banner with Retry sync. */
export function SyncErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorBanner}>
      <AlertTriangle size={22} color={colors.red} strokeWidth={1.9} style={styles.errorIcon} />
      <View style={styles.errorBody}>
        <Text variant="cardTitle" weight="600" style={styles.errorTitle}>
          Couldn't sync with COROS
        </Text>
        <Text variant="meta" color="textSecondary" style={styles.errorCopy}>
          Last synced 2 days ago. Your workout is still here — metrics may be out of date.
        </Text>
        <Button
          label="Retry sync"
          variant="destructive"
          full={false}
          onPress={onRetry}
          icon={<RefreshCw size={14} color={colors.onAccent} strokeWidth={2.2} />}
          style={styles.retryBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  overviewBar: { marginTop: 16 },
  overviewStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 13 },

  pausedBanner: {
    marginTop: 22,
    backgroundColor: alpha.goldBanner,
    borderWidth: 1,
    borderColor: alpha.goldBorder,
    borderRadius: 18,
    padding: 20,
  },
  pausedHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pausedTitle: { fontSize: 19 },
  pausedCopy: { marginBottom: 16 },
  resumeBtn: { paddingVertical: 15, borderRadius: radii.input },

  leftOff: {
    marginTop: 16,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 18,
    paddingHorizontal: 20,
    opacity: 0.7,
  },
  leftOffStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },

  restNote: { marginTop: 26, alignItems: 'center', paddingVertical: 30, paddingHorizontal: 20 },
  restTile: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  errorBanner: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
    backgroundColor: alpha.redBanner,
    borderWidth: 1,
    borderColor: alpha.redBorder,
    borderRadius: radii.card,
    padding: 16,
  },
  errorIcon: { marginTop: 1 },
  errorBody: { flex: 1 },
  errorTitle: { fontSize: 15 },
  errorCopy: { marginTop: 3, lineHeight: 19 },
  retryBtn: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 },
});
