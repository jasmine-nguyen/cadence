import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, BackButton, ScreenScroll } from '@/components';
import { Share, Cloud, FileText, Play, Music2 } from '@/components/icons';
import { ActionRow } from '@/features/workout/ActionRow';
import { StepBlock } from '@/features/workout/WorkoutSteps';
import { SkipSheet } from '@/features/workout/SkipSheet';
import { useStore } from '@/state/store';
import { seedWorkout } from '@/state/data';
import { SkipReason } from '@/state/types';
import { colors, radius as radii, screenPadding, alpha } from '@/theme';

const GRADIENT_HEIGHT = 210;

/** Workout Detail — structured session with warm-up, repeats, cool-down + skip. */
export default function WorkoutDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setTodayState } = useStore();
  const [skipOpen, setSkipOpen] = useState(false);

  const w = seedWorkout;

  const onConfirmSkip = (_reason: SkipReason) => {
    setSkipOpen(false);
    // Marked as skipped → return to Today.
    router.back();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1e3a44', '#22402f', colors.bg]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={[styles.gradient, { height: GRADIENT_HEIGHT }]}
      />

      <ScreenScroll
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 130 + insets.bottom }}
      >
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <BackButton color={colors.text} />
            <Text variant="cardTitle" weight="700">
              Week 1
            </Text>
          </View>
          <Share size={22} color={colors.text} strokeWidth={1.8} />
        </View>

        <View style={styles.titleBlock}>
          <View style={styles.dateRow}>
            <Text variant="overline" weight="700" color="textSecondary" style={styles.dateText}>
              15 Jul 2026
            </Text>
            <Text variant="overline" weight="700" color="accentCyan" style={styles.dateText}>
              {'  · WED'}
            </Text>
          </View>
          <Text variant="h1Large" style={styles.title}>
            {w.title}
          </Text>
          <Text variant="body" color="textSecondary">
            {w.title} · {w.distanceLabel} · {w.durationLabel}
          </Text>
        </View>

        {/* Weather / readiness */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherTile}>
            <Cloud size={20} color={colors.accentCyan} strokeWidth={1.9} />
          </View>
          <View style={styles.weatherText}>
            <Text variant="bodySmall" weight="600">
              {w.weather.summary}
            </Text>
            <Text variant="meta" color="textSecondary" style={styles.weatherDetail}>
              {w.weather.detail}
            </Text>
          </View>
        </View>

        <View style={styles.actionWrap}>
          <ActionRow onSkip={() => setSkipOpen(true)} />
        </View>

        <View style={styles.divider} />

        <View style={styles.descHead}>
          <FileText size={18} color={colors.text} strokeWidth={1.8} />
          <Text variant="cardTitle" weight="700">
            Description
          </Text>
        </View>

        <View style={styles.blocks}>
          {w.blocks.map((b) => (
            <StepBlock key={b.index} block={b} />
          ))}
        </View>
      </ScreenScroll>

      {/* Footer: Start workout + music */}
      <View style={[styles.footer, { bottom: insets.bottom + 12 }]}>
        <Button
          label="Start workout"
          floating
          style={styles.startBtn}
          onPress={() => router.push('/workout/live')}
          icon={<Play size={17} color={colors.onAccent} fill={colors.onAccent} strokeWidth={0} />}
        />
        <View style={styles.musicBtn}>
          <Music2 size={22} color={colors.text} strokeWidth={1.8} />
        </View>
      </View>

      <SkipSheet visible={skipOpen} onDismiss={() => setSkipOpen(false)} onConfirm={onConfirmSkip} />
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
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  titleBlock: { paddingHorizontal: 22, paddingTop: 22 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { letterSpacing: 0.4 },
  title: { marginTop: 8, marginBottom: 2 },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginHorizontal: screenPadding.content,
    marginTop: 18,
  },
  weatherTile: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: alpha.cyanTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherText: { flex: 1 },
  weatherDetail: { marginTop: 2 },
  actionWrap: { paddingHorizontal: 14, marginTop: 18 },
  divider: { height: 1, backgroundColor: colors.stroke, marginHorizontal: screenPadding.content, marginTop: 18 },
  descHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: screenPadding.content,
    marginTop: 18,
  },
  blocks: { paddingHorizontal: screenPadding.content, marginTop: 10, gap: 10 },
  footer: {
    position: 'absolute',
    left: screenPadding.content,
    right: screenPadding.content,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  startBtn: { flex: 1 },
  musicBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
