import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, Animated, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ProgressRing } from '@/components';
import { WalkFigure, Pause, Play, Square, Music2 } from '@/components/icons';
import { colors, radius as radii, shadows } from '@/theme';

/** Total seconds in the current interval — used to fill the ring. */
const INTERVAL_TOTAL = 190;

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Workout · In-progress — live run/walk session with interval ring. */
export default function LiveWorkout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(72);
  const [paused, setPaused] = useState(false);

  // Live-dot pulse.
  const pulse = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.2, duration: 800, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Countdown timer.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setRemaining((r) => (r > 0 ? r - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [paused]);

  const progress = (INTERVAL_TOTAL - remaining) / INTERVAL_TOTAL;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <Animated.View style={[styles.liveDot, { shadowOpacity: pulse }]} />
          <Text variant="bodySmall" weight="600" color="textSecondary">
            Walk-Run · Week 1
          </Text>
        </View>
        <Text variant="bodySmall" weight="600" color="textSecondary">
          Interval 3 / 7
        </Text>
      </View>

      <View style={styles.center}>
        <Text variant="meta" weight="700" color="accentGreen" style={styles.phase}>
          RUN · CONVERSATIONAL
        </Text>
        <ProgressRing
          size={230}
          strokeWidth={10}
          progress={progress}
          color={colors.accentGreen}
          trackColor={colors.cardInset}
          style={styles.ring}
        >
          <Text style={styles.countdown}>{fmt(remaining)}</Text>
          <Text variant="bodySmall" color="textSecondary" style={styles.ringSub}>
            of 750m left
          </Text>
        </ProgressRing>
      </View>

      <View style={styles.metrics}>
        <Metric label="Distance" value="1.24 km" />
        <Metric label="Pace" value="10:48" />
        <Metric label="Heart rate" value="148" />
      </View>

      <View style={styles.nextStrip}>
        <View style={styles.nextRow}>
          <WalkFigure size={18} color={colors.textSecondary} strokeWidth={1.8} />
          <Text variant="bodySmall" weight="500" color="textSecondary" style={styles.nextText}>
            Next: 90s walking recovery
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.sideBtn}>
          <Music2 size={22} color={colors.text} strokeWidth={2} />
        </Pressable>
        <Pressable style={styles.pauseBtn} onPress={() => setPaused((p) => !p)}>
          {paused ? (
            <Play size={28} color={colors.onAccent} fill={colors.onAccent} strokeWidth={0} />
          ) : (
            <Pause size={28} color={colors.onAccent} fill={colors.onAccent} strokeWidth={0} />
          )}
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={() => router.back()}>
          <Square size={20} color={colors.red} fill={colors.red} strokeWidth={0} />
        </Pressable>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text variant="meta" color="textSecondary">
        {label}
      </Text>
      <Text variant="cardTitle" weight="700" style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.accentGreen,
    shadowColor: colors.accentGreen,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  center: { alignItems: 'center', marginTop: 30 },
  phase: { letterSpacing: 1.4 },
  ring: { marginTop: 20 },
  countdown: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
  },
  ringSub: { marginTop: 8 },
  metrics: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28, paddingHorizontal: 24 },
  metric: { alignItems: 'center' },
  metricValue: { fontSize: 20, marginTop: 2 },
  nextStrip: { paddingHorizontal: 24, marginTop: 26 },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  nextText: { flex: 1 },
  controls: {
    position: 'absolute',
    left: 24,
    right: 24,
    bottom: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  sideBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.goldGlow,
  },
});
