import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, SegmentedProgress } from '@/components';
import { Flame, ChevronUp, Lock, Clock, Shoe } from '@/components/icons';
import { InsightsData } from '@/state/types';
import { colors, radius as radii, alpha } from '@/theme';

function DeltaUp({ label }: { label: string }) {
  return (
    <View style={styles.delta}>
      <ChevronUp size={13} color={colors.accentGreen} strokeWidth={2.4} />
      <Text variant="meta" weight="600" color="accentGreen">
        {label}
      </Text>
    </View>
  );
}

/** Consistency — sessions done vs planned + week bar + streak pill. */
export function ConsistencyCard({ data }: { data: InsightsData['consistency'] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="bodySmall" weight="600" color="textSecondary">
          Consistency
        </Text>
        <View style={styles.streak}>
          <Flame size={14} color={colors.gold} fill={colors.gold} strokeWidth={0} />
          <Text variant="meta" weight="700" color="gold">
            {data.streak}-day streak
          </Text>
        </View>
      </View>
      <View style={styles.bigRow}>
        <Text style={styles.big}>
          {data.done}
          <Text variant="cardTitle" color="textMuted">{` / ${data.total}`}</Text>
        </Text>
        <Text variant="meta" weight="500" color="accentGreen" style={styles.bigCaption}>
          sessions this week
        </Text>
      </View>
      <SegmentedProgress total={data.total} filled={data.done} color={colors.accentGreen} height={7} gap={7} style={styles.bar} />
    </View>
  );
}

/** Consistency (building) — first session logged, no streak. */
export function ConsistencyBuildingCard({ data }: { data: InsightsData['consistency'] }) {
  return (
    <View style={styles.card}>
      <Text variant="bodySmall" weight="600" color="textSecondary">
        Consistency
      </Text>
      <View style={styles.bigRow}>
        <Text style={styles.big}>
          {data.done}
          <Text variant="cardTitle" color="textMuted">{` / ${data.total}`}</Text>
        </Text>
        <Text variant="meta" weight="500" color="textSecondary" style={styles.bigCaption}>
          first session logged
        </Text>
      </View>
      <SegmentedProgress total={data.total} filled={data.done} color={colors.accentGreen} height={7} gap={7} style={styles.bar} />
    </View>
  );
}

/** Weekly volume + Easy effort (two-up). */
export function VolumeEasyRow({
  volume,
  easyPct,
}: {
  volume: InsightsData['weeklyVolume'];
  easyPct: number;
}) {
  return (
    <View style={styles.twoUp}>
      <View style={[styles.card, styles.half]}>
        <Text variant="meta" weight="600" color="textSecondary">
          Weekly volume
        </Text>
        <Text style={styles.metricBig}>
          {volume.km}
          <Text variant="bodySmall" color="textMuted">{' km'}</Text>
        </Text>
        <DeltaUp label={`${volume.deltaPct} vs last wk`} />
        <View style={styles.miniBars}>
          {volume.bars.map((h, i) => (
            <View
              key={i}
              style={[
                styles.miniBar,
                { height: `${h * 100}%`, backgroundColor: i === volume.bars.length - 1 ? colors.accentGreen : colors.stroke },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={[styles.card, styles.half]}>
        <Text variant="meta" weight="600" color="textSecondary">
          Easy effort
        </Text>
        <Text style={styles.metricBig}>
          {easyPct}
          <Text variant="bodySmall" color="textMuted">{' %'}</Text>
        </Text>
        <Text variant="meta" weight="500" color="accentGreen" style={styles.easyNote}>
          Kept easy — nice
        </Text>
        <View style={styles.meterTrack}>
          <LinearGradient
            colors={[colors.accentGreen, colors.accentCyan]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.meterFill, { width: `${easyPct}%` }]}
          />
        </View>
      </View>
    </View>
  );
}

/** Recovery — readiness pill + three COROS stats. */
export function RecoveryCard({ data }: { data: InsightsData['recovery'] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="bodySmall" weight="600" color="textSecondary">
          Recovery
        </Text>
        <View style={styles.goodPill}>
          <Text variant="meta" weight="700" color="accentGreen">
            {data.readiness}
          </Text>
        </View>
      </View>
      <View style={styles.recoveryRow}>
        <RecoveryStat label="Rest HR" value={data.restHr} />
        <View style={styles.hair} />
        <RecoveryStat label="HRV" value={data.hrv} />
        <View style={styles.hair} />
        <RecoveryStat label="Sleep" value={data.sleep} />
      </View>
    </View>
  );
}

function RecoveryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.recoveryStat}>
      <Text variant="meta" color="textMuted" style={styles.recoveryLabel}>
        {label}
      </Text>
      <Text variant="cardTitle" weight="700" style={styles.recoveryValue}>
        {value}
      </Text>
    </View>
  );
}

/** 5-min benchmark. */
export function BenchmarkCard({ data }: { data: InsightsData['benchmark'] }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text variant="bodySmall" weight="600" color="textSecondary">
          5-min benchmark
        </Text>
        <Text variant="meta" color="textMuted">
          every 2 wks
        </Text>
      </View>
      <View style={styles.benchRow}>
        <Text variant="cardTitleLarge" weight="700">
          {data.value}
        </Text>
        <DeltaUp label={data.delta} />
      </View>
    </View>
  );
}

/** Shoe mileage. */
export function ShoeCard({ data }: { data: InsightsData['shoe'] }) {
  const pct = Math.min(1, data.km / data.threshold);
  const nearing = pct > 0.85;
  return (
    <View style={[styles.card, styles.shoeCard]}>
      <View style={styles.shoeTile}>
        <Shoe size={26} color={colors.accentCyan} strokeWidth={1.7} />
      </View>
      <View style={styles.shoeBody}>
        <Text variant="cardTitle" weight="600">
          {data.name}
        </Text>
        <View style={styles.shoeTrack}>
          <View style={[styles.shoeFill, { width: `${pct * 100}%`, backgroundColor: nearing ? colors.gold : colors.accentGreen }]} />
        </View>
        <Text variant="meta" color="textSecondary">
          {data.km} / {data.threshold} km · {nearing ? 'time to replace soon' : 'plenty of life left'}
        </Text>
      </View>
    </View>
  );
}

/** Building info banner + a locked metric card. */
export function BuildingBanner() {
  return (
    <View style={styles.infoBanner}>
      <Clock size={22} color={colors.accentCyan} strokeWidth={1.9} style={styles.infoIcon} />
      <View style={styles.infoBody}>
        <Text variant="bodySmall" weight="600">
          Your insights are warming up
        </Text>
        <Text variant="meta" color="textSecondary" style={styles.infoCopy}>
          A couple more runs and these fill in with real trends. Here's what's coming.
        </Text>
      </View>
    </View>
  );
}

export function LockedCard({ title, note }: { title: string; note: string }) {
  return (
    <View style={[styles.card, styles.lockedCard]}>
      <View style={styles.lockTile}>
        <Lock size={22} color={colors.textMuted} strokeWidth={1.8} />
      </View>
      <View style={styles.lockBody}>
        <Text variant="bodySmall" weight="600" color="textSecondary">
          {title}
        </Text>
        <Text variant="meta" color="textMuted" style={styles.lockNote}>
          {note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radii.card, paddingVertical: 16, paddingHorizontal: 18 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  bigRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  big: { fontSize: 30, fontWeight: '700', color: colors.text },
  bigCaption: { marginBottom: 2 },
  bar: { marginTop: 12 },

  twoUp: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  metricBig: { fontSize: 24, fontWeight: '700', color: colors.text, marginTop: 8 },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  miniBars: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 26, marginTop: 10 },
  miniBar: { flex: 1, borderRadius: 3 },
  easyNote: { marginTop: 6 },
  meterTrack: { height: 7, borderRadius: 4, backgroundColor: colors.stroke, marginTop: 14, overflow: 'hidden' },
  meterFill: { height: '100%', borderRadius: 4 },

  goodPill: { backgroundColor: alpha.greenFill, borderRadius: 6, paddingVertical: 3, paddingHorizontal: 9 },
  recoveryRow: { flexDirection: 'row', marginTop: 14, alignItems: 'center' },
  recoveryStat: { flex: 1, alignItems: 'center' },
  recoveryLabel: { fontSize: 11 },
  recoveryValue: { fontSize: 18, marginTop: 3 },
  hair: { width: 1, alignSelf: 'stretch', backgroundColor: colors.stroke },

  benchRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8 },

  shoeCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  shoeTile: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoeBody: { flex: 1 },
  shoeTrack: { height: 6, borderRadius: 3, backgroundColor: colors.stroke, marginVertical: 8, overflow: 'hidden' },
  shoeFill: { height: '100%', borderRadius: 3 },

  infoBanner: {
    flexDirection: 'row',
    gap: 13,
    alignItems: 'flex-start',
    backgroundColor: 'rgba(42,195,222,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(42,195,222,0.3)',
    borderRadius: radii.card,
    padding: 18,
  },
  infoIcon: { marginTop: 1 },
  infoBody: { flex: 1 },
  infoCopy: { marginTop: 3, lineHeight: 19 },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 13, opacity: 0.6 },
  lockTile: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBody: { flex: 1 },
  lockNote: { marginTop: 2 },
});
