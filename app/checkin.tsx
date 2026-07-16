import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, SelectRow, GradientTile } from '@/components';
import { X, MessageCircle, Check, Trophy } from '@/components/icons';
import { CheckinReason } from '@/state/types';
import { colors, radius as radii, screenPadding } from '@/theme';

const REASONS: { value: CheckinReason; label: string }[] = [
  { value: 'busy', label: 'Just been busy' },
  { value: 'low-energy', label: 'Feeling low on energy' },
  { value: 'injury', label: 'A niggle or minor injury' },
];

/** Missed-session check-in — prompt (reasons) → adjusted (what changed). */
export default function Checkin() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<CheckinReason>('low-energy');
  const [adjusted, setAdjusted] = useState(false);

  if (adjusted) {
    return (
      <View style={styles.root}>
        <View style={[styles.adjustedTop, { paddingTop: insets.top + 24 }]}>
          <View style={styles.successDisc}>
            <Check size={34} color={colors.accentGreen} strokeWidth={2.2} />
          </View>
          <Text variant="h1" center style={styles.h1}>
            Plan reshaped for you
          </Text>
          <Text variant="body" color="textSecondary" center style={styles.lead}>
            I've eased this week back and pushed your 5K goal out by a few days. You're still on track.
          </Text>
        </View>

        <View style={styles.beforeAfterCard}>
          <View style={styles.beforeRow}>
            <Text variant="meta" weight="500" color="textMuted" style={styles.strike}>
              This week · 4 runs
            </Text>
            <Text variant="meta" color="textMuted">
              before
            </Text>
          </View>
          <View style={styles.afterRow}>
            <View style={styles.afterLeft}>
              <View style={styles.afterTile}>
                <Check size={18} color={colors.accentGreen} strokeWidth={2} />
              </View>
              <View>
                <Text variant="cardTitle" weight="700" style={styles.afterTitle}>
                  This week · 2 easy runs
                </Text>
                <Text variant="meta" color="accentGreen">
                  lighter restart
                </Text>
              </View>
            </View>
            <Text variant="meta" weight="600" color="accentGreen">
              now
            </Text>
          </View>
        </View>

        <View style={styles.goalCard}>
          <Trophy size={20} color={colors.gold} strokeWidth={1.9} />
          <View>
            <Text variant="bodySmall" weight="600">
              5K goal → 20 Aug
            </Text>
            <Text variant="meta" color="textSecondary">
              moved 11 days later
            </Text>
          </View>
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Button label="See my updated week" onPress={() => router.replace('/(tabs)/plan')} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.closeRow, { paddingTop: insets.top + 12 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} accessibilityLabel="Dismiss">
          <X size={24} color={colors.textSecondary} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.promptTop}>
        <GradientTile size={72} radius={20} style={styles.avatar}>
          <MessageCircle size={38} color={colors.onAccent} strokeWidth={2} />
        </GradientTile>
        <Text variant="h1" center style={styles.h1}>
          Life happens — let's regroup
        </Text>
        <Text variant="body" color="textSecondary" center style={styles.lead}>
          You've missed the last 3 sessions. No guilt here — tell me what's going on and I'll reshape
          the week so it still fits.
        </Text>
      </View>

      <View style={styles.reasons}>
        {REASONS.map((r) => (
          <SelectRow key={r.value} label={r.label} selected={reason === r.value} onPress={() => setReason(r.value)} />
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Button label="Adjust my plan" onPress={() => setAdjusted(true)} />
        <Pressable style={styles.keep} onPress={() => router.back()} hitSlop={6}>
          <Text variant="body" weight="600" color="textSecondary">
            I'm fine — keep it as is
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  closeRow: { paddingHorizontal: 24, alignItems: 'flex-end' },
  promptTop: { paddingHorizontal: screenPadding.form, paddingTop: 20, alignItems: 'center' },
  avatar: { marginBottom: 22 },
  h1: { fontSize: 25, marginBottom: 12, lineHeight: 31 },
  lead: { lineHeight: 24 },
  reasons: { paddingHorizontal: screenPadding.form, paddingTop: 26, gap: 10 },
  footer: {
    position: 'absolute',
    left: screenPadding.form,
    right: screenPadding.form,
    bottom: 0,
  },
  keep: { alignItems: 'center', paddingTop: 12 },

  adjustedTop: { paddingHorizontal: screenPadding.form, alignItems: 'center', paddingBottom: 4 },
  successDisc: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(158,206,106,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  beforeAfterCard: {
    marginHorizontal: 22,
    marginTop: 26,
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 20,
  },
  beforeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.stroke,
  },
  strike: { textDecorationLine: 'line-through' },
  afterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  afterLeft: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  afterTile: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: 'rgba(158,206,106,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  afterTitle: { fontSize: 15 },
  goalCard: {
    marginHorizontal: 22,
    marginTop: 12,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
});
