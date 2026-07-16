import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { Screen, Text } from '@/components';
import { Zap, CheckDisc } from '@/components/icons';
import { useStore } from '@/state/store';
import { colors, spacing } from '@/theme';

const STEPS = [
  'Analysing your running background',
  'Setting easy paces for you',
  'Scheduling around your 4 days',
  'Syncing to your COROS watch',
];

/** Spinning cyan arc on a track, with a static green lightning glyph centered. */
function GeneratingRing() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={styles.ringWrap}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Svg width={120} height={120} viewBox="0 0 120 120">
          <Circle cx={60} cy={60} r={50} fill="none" stroke={colors.cardInset} strokeWidth={6} />
          <Circle
            cx={60}
            cy={60}
            r={50}
            fill="none"
            stroke={colors.accentCyan}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={314}
            strokeDashoffset={180}
          />
        </Svg>
      </Animated.View>
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.glyphCenter}>
          <Zap size={40} color={colors.accentGreen} strokeWidth={2} />
        </View>
      </View>
    </View>
  );
}

/** In-progress checklist item — pulsing cyan ring. */
function PulseItem({ label }: { label: string }) {
  const pulse = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.checkItem, { opacity: pulse }]}>
      <View style={styles.ringOutline} />
      <Text variant="body" weight="500" color="textSecondary">
        {label}
      </Text>
    </Animated.View>
  );
}

/** Onboarding · Generating — loading state that auto-advances to Today. */
export default function Generating() {
  const router = useRouter();
  const { setOnboarding } = useStore();
  // number of completed steps; the next one is "active".
  const [done, setDone] = useState(2);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setDone(3), 1400));
    timers.push(setTimeout(() => setDone(4), 2800));
    timers.push(
      setTimeout(() => {
        setOnboarding((prev) => ({ ...prev, generating: false }));
        router.replace('/(tabs)');
      }, 3800),
    );
    return () => timers.forEach(clearTimeout);
  }, [router, setOnboarding]);

  return (
    <Screen>
      <View style={styles.center}>
        <GeneratingRing />
        <Text variant="h1" center style={styles.title}>
          Building your plan
        </Text>
        <Text variant="body" color="textSecondary" center style={styles.subtitle}>
          Shaping 4 weeks of walk-run around your goal and background.
        </Text>

        <View style={styles.checklist}>
          {STEPS.map((label, i) => {
            if (i < done) {
              return (
                <View key={label} style={styles.checkItem}>
                  <CheckDisc size={22} color={colors.accentGreen} />
                  <Text variant="body" weight="500">
                    {label}
                  </Text>
                </View>
              );
            }
            if (i === done) {
              return <PulseItem key={label} label={label} />;
            }
            return (
              <View key={label} style={[styles.checkItem, styles.pending]}>
                <View style={styles.ringMuted} />
                <Text variant="body" weight="500" color="textMuted">
                  {label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  ringWrap: { width: 120, height: 120, marginBottom: 40 },
  glyphCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: 12 },
  subtitle: { marginBottom: 40 },
  checklist: { alignSelf: 'stretch', gap: 16 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  pending: { opacity: 0.4 },
  ringOutline: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.4,
    borderColor: colors.accentCyan,
  },
  ringMuted: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.4,
    borderColor: colors.textMuted,
  },
});
