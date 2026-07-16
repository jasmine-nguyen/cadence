import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, BackButton, ScreenScroll } from '@/components';
import { Share, Check } from '@/components/icons';
import { useStore } from '@/state/store';
import { Activity, Split } from '@/state/types';
import { colors, radius as radii, screenPadding } from '@/theme';

const GRADIENT_HEIGHT = 230;

const FELT_LABEL: Record<NonNullable<Activity['felt']>, string> = {
  easy: 'Felt easy',
  just_right: 'Felt just right',
  hard: 'Felt hard',
};

/** Activity detail — stats grid + felt tag + splits. */
export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { activities } = useStore();
  const activity = activities.find((a) => a.id === id) ?? activities[0];

  const feltIsHard = activity.felt === 'hard';
  const feltColor = feltIsHard ? colors.gold : colors.accentGreen;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1e3a44', '#22402f', colors.bg]}
        locations={[0, 0.6, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.gradient, { height: GRADIENT_HEIGHT }]}
      />

      <ScreenScroll contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.topBar}>
          <BackButton color={colors.text} />
          <Share size={22} color={colors.text} strokeWidth={1.8} />
        </View>

        <View style={styles.titleBlock}>
          <Text variant="overline" weight="700" color="textSecondary" style={styles.date}>
            {activity.dateLabel.toUpperCase()}
          </Text>
          <Text variant="h1" style={styles.title}>
            {activity.title}
          </Text>
          {activity.felt ? (
            <View style={[styles.feltTag, { backgroundColor: feltIsHard ? 'rgba(224,175,104,0.15)' : 'rgba(158,206,106,0.15)' }]}>
              <Check size={14} color={feltColor} strokeWidth={2} />
              <Text variant="meta" weight="600" style={{ color: feltColor }}>
                {FELT_LABEL[activity.felt]}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.statsCard}>
          <StatCell label="Distance" value={activity.distance} />
          <StatCell label="Moving time" value={activity.movingTime} />
          <StatCell label="Avg pace" value={activity.avgPace} unit="/km" />
          <StatCell label="Avg heart rate" value={activity.avgHr} unit="bpm" />
        </View>

        <View style={styles.splitsCard}>
          <Text variant="bodySmall" weight="600" style={styles.splitsTitle}>
            Splits
          </Text>
          <View style={styles.splits}>
            {activity.splits.map((s, i) => (
              <SplitRow key={i} split={s} />
            ))}
          </View>
        </View>
      </ScreenScroll>
    </View>
  );
}

function StatCell({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <View style={styles.statCell}>
      <Text variant="meta" color="textSecondary">
        {label}
      </Text>
      <Text variant="h2" weight="700" style={styles.statValue}>
        {value}
        {unit ? (
          <Text variant="meta" color="textMuted">{` ${unit}`}</Text>
        ) : null}
      </Text>
    </View>
  );
}

function SplitRow({ split }: { split: Split }) {
  return (
    <View style={styles.splitRow}>
      <Text variant="meta" weight="600" color="textSecondary" style={styles.splitLabel}>
        {split.label}
      </Text>
      <View style={styles.splitTrack}>
        <View
          style={[
            styles.splitFill,
            { width: `${split.ratio * 100}%`, backgroundColor: split.partial ? colors.accentCyan : colors.accentGreen },
          ]}
        />
      </View>
      <Text variant="meta" weight="600" style={styles.splitTime}>
        {split.time}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  gradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  titleBlock: { paddingHorizontal: 22, paddingTop: 22 },
  date: { letterSpacing: 0.4 },
  title: { marginTop: 8, marginBottom: 6 },
  feltTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statsCard: {
    marginHorizontal: screenPadding.content,
    marginTop: 22,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: { width: '50%', paddingVertical: 6 },
  statValue: { marginTop: 2 },
  splitsCard: {
    marginHorizontal: screenPadding.content,
    marginTop: 14,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  splitsTitle: { marginBottom: 14 },
  splits: { gap: 11 },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  splitLabel: { width: 24 },
  splitTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: colors.stroke, overflow: 'hidden' },
  splitFill: { height: '100%', borderRadius: 5 },
  splitTime: { width: 52, textAlign: 'right' },
});
