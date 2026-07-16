import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, ScreenScroll } from '@/components';
import { Cloud, Play, User, CalendarPlus } from '@/components/icons';
import { TodayHeader } from '@/features/today/TodayHeader';
import {
  PlannedWorkoutCard,
  CompletedWorkoutCard,
  ErrorWorkoutCard,
  NiceWorkCard,
} from '@/features/today/WorkoutCards';
import {
  WeekOverviewCard,
  PausedBanner,
  WhereYouLeftOff,
  RestNote,
  SyncErrorBanner,
} from '@/features/today/TodayBlocks';
import { TodayStateSwitcher } from '@/features/today/TodayStateSwitcher';
import { useStore } from '@/state/store';
import { seedWorkout } from '@/state/data';
import { colors, radius as radii, screenPadding, shadows } from '@/theme';

/** Section header "Today's workout" + weather. */
function SectionHeader({ temp }: { temp?: string }) {
  return (
    <View style={styles.section}>
      <Text variant="h2">Today's workout</Text>
      {temp ? (
        <View style={styles.weather}>
          <Cloud size={24} color={colors.textSecondary} strokeWidth={1.8} />
          <Text variant="cardTitle" weight="500" color="textSecondary">
            {temp}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Simplified header for empty/error states (title + profile). */
function SimpleHeader({ topInset }: { topInset: number }) {
  return (
    <View style={[styles.simpleHeader, { paddingTop: topInset + 14 }]}>
      <Text variant="h1" style={styles.simpleTitle}>
        Today
      </Text>
      <User size={24} color={colors.text} strokeWidth={1.7} />
    </View>
  );
}

/** Today — the daily home. Renders all five designed states. */
export default function Today() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plan, todayState, resumePlan, retrySync } = useStore();

  const bodyPad = { paddingBottom: 130 + insets.bottom };
  const openWorkout = () => router.push('/workout');

  let content: React.ReactNode;
  let floatingCta: React.ReactNode = null;

  switch (todayState) {
    case 'planned':
      content = (
        <>
          <TodayHeader
            variant="planned"
            week={plan.week}
            weekLabel={`Week ${plan.currentWeek}/${plan.totalWeeks}`}
            onBell={() => router.push('/checkin')}
          />
          <ScreenScroll contentContainerStyle={[styles.body, bodyPad]}>
            <SectionHeader temp={seedWorkout.weather.temp} />
            <PlannedWorkoutCard workout={seedWorkout} onOpen={openWorkout} />
            <WeekOverviewCard week={plan.currentWeek} progress={plan.progress} />
          </ScreenScroll>
        </>
      );
      floatingCta = (
        <View style={[styles.floating, { bottom: insets.bottom + 24 }]}>
          <Button
            label="Start workout"
            floating
            onPress={() => router.push('/workout/live')}
            icon={<Play size={18} color={colors.onAccent} fill={colors.onAccent} strokeWidth={0} />}
          />
        </View>
      );
      break;

    case 'paused':
      content = (
        <>
          <TodayHeader variant="paused" week={plan.week} weekLabel="Paused" onBell={() => router.push('/checkin')} />
          <ScreenScroll contentContainerStyle={[styles.body, bodyPad]}>
            <PausedBanner pausedAt={plan.pausedAt} onResume={resumePlan} />
            <WhereYouLeftOff week={plan.currentWeek} totalWeeks={plan.totalWeeks} progress={plan.progress} />
            <RestNote />
          </ScreenScroll>
        </>
      );
      break;

    case 'completed': {
      const completedProgress = { ...plan.progress, workoutsDone: 2, distanceDone: 5 };
      content = (
        <>
          <TodayHeader variant="completed" week={plan.week} weekLabel={`Week ${plan.currentWeek}/${plan.totalWeeks}`} />
          <ScreenScroll contentContainerStyle={[styles.body, bodyPad]}>
            <View style={styles.sectionOnly}>
              <Text variant="h2">Today's workout</Text>
            </View>
            <CompletedWorkoutCard workout={seedWorkout} />
            <NiceWorkCard onFeedback={() => router.push('/feedback')} />
            <WeekOverviewCard week={plan.currentWeek} progress={completedProgress} showChevron={false} />
          </ScreenScroll>
        </>
      );
      break;
    }

    case 'empty':
      content = (
        <>
          <SimpleHeader topInset={insets.top} />
          <View style={styles.emptyWrap}>
            <View style={styles.emptyTile}>
              <CalendarPlus size={46} color={colors.accentCyan} strokeWidth={1.6} />
            </View>
            <Text variant="h1" center style={styles.emptyTitle}>
              No plan yet
            </Text>
            <Text variant="body" color="textSecondary" center style={styles.emptyCopy}>
              Tell us your goal and we'll build a walk-run plan that fits your week.
            </Text>
            <Button
              label="Create your plan"
              full={false}
              onPress={() => router.push('/onboarding')}
              style={styles.emptyCta}
            />
          </View>
        </>
      );
      break;

    case 'error':
      content = (
        <>
          <SimpleHeader topInset={insets.top} />
          <ScreenScroll contentContainerStyle={[styles.body, styles.errorBody, bodyPad]}>
            <SyncErrorBanner onRetry={retrySync} />
            <View style={styles.sectionOnly}>
              <Text variant="h2">Today's workout</Text>
            </View>
            <ErrorWorkoutCard workout={seedWorkout} />
          </ScreenScroll>
        </>
      );
      break;
  }

  return (
    <View style={styles.root}>
      {content}
      {floatingCta}
      {__DEV__ && <TodayStateSwitcher />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: screenPadding.content },
  errorBody: { paddingTop: 20 },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 13,
  },
  sectionOnly: { marginTop: 22, marginBottom: 13 },
  weather: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  simpleHeader: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: screenPadding.content,
    paddingTop: 14,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  simpleTitle: { fontSize: 20 },
  floating: {
    position: 'absolute',
    left: screenPadding.content,
    right: screenPadding.content,
    ...shadows.ctaGlow,
  },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTile: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  emptyTitle: { fontSize: 24, marginBottom: 12 },
  emptyCopy: { marginBottom: 30 },
  emptyCta: { paddingHorizontal: 40 },
});
