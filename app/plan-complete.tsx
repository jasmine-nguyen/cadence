import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, SelectRow, StatTile, ScreenScroll } from '@/components';
import { X, Trophy } from '@/components/icons';
import { useStore } from '@/state/store';
import { GoalType, JourneyPoint } from '@/state/types';
import { formatKm, journeyLead, nextGoalOptions } from '@/state/journey';
import { colors, alpha, screenPadding } from '@/theme';

/** Room for the pinned CTA + "Not now" so the last select row can scroll clear. */
const FOOTER_CLEARANCE = 150;

function pointLine(p: JourneyPoint) {
  return `${p.title} · ${formatKm(p.distanceKm)} km`;
}

/**
 * Plan · Finished — journey summary (first session → goal session) and a
 * "What's next?" goal picker that hands off to onboarding step 3.
 */
export default function PlanComplete() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { journey, beginNextPlan } = useStore();
  const options = nextGoalOptions(journey.goalType);
  const [picked, setPicked] = useState<GoalType | undefined>(options[0]?.value);
  // Never act on a goal that isn't offered (e.g. the one just finished).
  const next = options.some((o) => o.value === picked) ? picked : options[0]?.value;

  const setUpNext = () => {
    if (!next) return;
    beginNextPlan(next);
    // Pushed on top of this modal, so Back from step 3 returns here.
    router.push('/onboarding/step3');
  };

  return (
    <View style={styles.root}>
      <View style={[styles.closeRow, { paddingTop: insets.top + 12 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Close">
          <X size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <ScreenScroll contentContainerStyle={{ paddingBottom: FOOTER_CLEARANCE + insets.bottom }}>
        <View style={styles.top}>
          <View style={styles.trophyDisc}>
            <Trophy size={36} color={colors.gold} strokeWidth={1.9} />
          </View>
          <Text variant="h1" center style={styles.h1}>
            You did it
          </Text>
          <Text variant="body" color="textSecondary" center style={styles.lead}>
            {journeyLead(journey)}
          </Text>
        </View>

        {journey.first && journey.last ? (
          <View style={styles.journeyCard}>
            <View style={styles.thenRow}>
              <View>
                <Text variant="meta" color="textMuted">
                  {journey.first.weekLabel} · {journey.first.dateLabel}
                </Text>
                <Text variant="bodySmall" weight="500" color="textMuted" style={styles.rowTitle}>
                  {pointLine(journey.first)}
                </Text>
              </View>
              <Text variant="meta" color="textMuted">
                then
              </Text>
            </View>
            <View style={styles.nowRow}>
              <View style={styles.nowLeft}>
                <View style={styles.nowTile}>
                  <Trophy size={18} color={colors.gold} strokeWidth={2} />
                </View>
                <View>
                  <Text variant="meta" color="textSecondary">
                    {journey.last.weekLabel} · {journey.last.dateLabel}
                  </Text>
                  <Text variant="cardTitle" weight="700" style={styles.nowTitle}>
                    {pointLine(journey.last)}
                  </Text>
                </View>
              </View>
              <Text variant="meta" weight="600" color="gold">
                goal
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.stats}>
          <StatTile card value={`${journey.weeksCompleted}`} suffix={`/${journey.weeksTotal}`} label="Weeks" />
          <StatTile card value={`${journey.sessionsCompleted}`} label="Sessions" />
          <StatTile card value={`${Math.round(journey.totalKm)}`} suffix=" km" label="Distance" />
        </View>

        {options.length > 0 ? (
          <View style={styles.next}>
            <Text variant="overline" color="textMuted" style={styles.nextLabel}>
              What's next?
            </Text>
            {options.map((o) => (
              <SelectRow key={o.value} label={o.label} selected={next === o.value} onPress={() => setPicked(o.value)} />
            ))}
          </View>
        ) : null}
      </ScreenScroll>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button label="Set up my next plan" onPress={setUpNext} disabled={!next} />
        <Pressable style={styles.later} onPress={() => router.back()} hitSlop={6}>
          <Text variant="body" weight="600" color="textSecondary">
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  closeRow: { paddingHorizontal: 24, alignItems: 'flex-end' },
  top: { paddingHorizontal: screenPadding.form, paddingTop: 8, alignItems: 'center' },
  trophyDisc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: alpha.goldTile,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  h1: { fontSize: 25, marginBottom: 12, lineHeight: 31 },
  lead: { lineHeight: 24 },
  journeyCard: {
    marginHorizontal: 22,
    marginTop: 26,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  thenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.stroke,
  },
  rowTitle: { marginTop: 2 },
  nowRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  nowLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  nowTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: alpha.goldTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowTitle: { fontSize: 15, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 10, marginHorizontal: 22, marginTop: 12 },
  next: { paddingHorizontal: screenPadding.form, paddingTop: 26, gap: 10 },
  nextLabel: { letterSpacing: 0.5, marginBottom: 2 },
  footer: {
    position: 'absolute',
    left: screenPadding.form,
    right: screenPadding.form,
    bottom: 0,
    paddingTop: 12,
    backgroundColor: colors.bg,
  },
  later: { alignItems: 'center', paddingTop: 12 },
});
