import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, ScreenScroll, StatTile } from '@/components';
import { ListFilter, RunFigure, RefreshCw } from '@/components/icons';
import { TabHeader } from '@/features/TabHeader';
import { ActivityRow } from '@/features/activities/ActivityRow';
import { useStore } from '@/state/store';
import { activitiesSummary } from '@/state/data';
import { colors, radius as radii, screenPadding } from '@/theme';

/** Activities — completed-run history · list / empty (detail is a pushed route). */
export default function Activities() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activities } = useStore();
  const [showEmpty, setShowEmpty] = useState(false);

  const empty = showEmpty || activities.length === 0;

  return (
    <View style={styles.root}>
      {empty ? (
        <>
          <TabHeader title="Activities" />
          <View style={styles.emptyWrap}>
            <View style={styles.emptyTile}>
              <RunFigure size={46} color={colors.accentGreen} strokeWidth={1.5} />
            </View>
            <Text variant="h1" center style={styles.emptyTitle}>
              No runs yet
            </Text>
            <Text variant="body" color="textSecondary" center style={styles.emptyCopy}>
              Your completed sessions will show up here — with distance, pace and how each one felt.
            </Text>
            <Button
              label="Go to today's workout"
              full={false}
              onPress={() => router.push('/(tabs)')}
              style={styles.emptyCta}
            />
          </View>
        </>
      ) : (
        <>
          <TabHeader title="Activities" right={<ListFilter size={22} color={colors.textSecondary} strokeWidth={1.8} />}>
            <View style={styles.summary}>
              <StatTile value={`${activitiesSummary.runs}`} label="runs" />
              <StatTile value={activitiesSummary.totalKm} suffix=" km" label="total" />
              <StatTile value={activitiesSummary.movingTime} suffix=" h" label="moving" />
            </View>
          </TabHeader>

          <ScreenScroll contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
            <Text variant="overline" color="textMuted" style={styles.month}>
              July 2026
            </Text>
            <View style={styles.list}>
              {activities.map((a) => (
                <ActivityRow key={a.id} activity={a} onPress={() => router.push(`/activity/${a.id}`)} />
              ))}
            </View>
          </ScreenScroll>
        </>
      )}

      {__DEV__ && (
        <Pressable style={styles.devPill} onPress={() => setShowEmpty((v) => !v)}>
          <RefreshCw size={13} color={colors.textSecondary} strokeWidth={2} />
          <Text variant="meta" weight="600" color="textSecondary">
            {empty ? 'empty' : 'list'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  summary: { flexDirection: 'row', gap: 20, marginTop: 14 },
  body: { paddingHorizontal: screenPadding.content, paddingTop: 16 },
  month: { letterSpacing: 0.4, marginBottom: 10 },
  list: { gap: 10 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
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
  emptyCta: { paddingHorizontal: 34 },
  devPill: {
    position: 'absolute',
    right: 10,
    top: 130,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.chip,
    paddingVertical: 6,
    paddingHorizontal: 11,
    opacity: 0.9,
  },
});
