import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ScreenScroll } from '@/components';
import { RefreshCw } from '@/components/icons';
import { TabHeader } from '@/features/TabHeader';
import {
  ConsistencyCard,
  ConsistencyBuildingCard,
  VolumeEasyRow,
  RecoveryCard,
  BenchmarkCard,
  ShoeCard,
  BuildingBanner,
  LockedCard,
} from '@/features/insights/MetricCards';
import { useStore } from '@/state/store';
import { colors, radius as radii, screenPadding } from '@/theme';

/** Insights — five calm metrics + shoe mileage · dashboard / building. */
export default function Insights() {
  const insets = useSafeAreaInsets();
  const { insights, setInsightsReady } = useStore();

  return (
    <View style={styles.root}>
      <TabHeader title="Insights" right="This week" />

      <ScreenScroll contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
        {insights.ready ? (
          <>
            <ConsistencyCard data={insights.consistency} />
            <VolumeEasyRow volume={insights.weeklyVolume} easyPct={insights.easyPct} />
            <RecoveryCard data={insights.recovery} />
            <BenchmarkCard data={insights.benchmark} />
            <ShoeCard data={insights.shoe} />
          </>
        ) : (
          <>
            <BuildingBanner />
            <ConsistencyBuildingCard data={{ ...insights.consistency, done: 1, streak: 0 }} />
            <LockedCard title="Weekly volume trend" note="Unlocks after next run" />
            <LockedCard title="Recovery readiness" note="Needs 3 nights of COROS data" />
          </>
        )}
      </ScreenScroll>

      {__DEV__ && (
        <Pressable style={styles.devPill} onPress={() => setInsightsReady(!insights.ready)}>
          <RefreshCw size={13} color={colors.textSecondary} strokeWidth={2} />
          <Text variant="meta" weight="600" color="textSecondary">
            {insights.ready ? 'dashboard' : 'building'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { paddingHorizontal: screenPadding.content, paddingTop: 16, gap: 12 },
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
