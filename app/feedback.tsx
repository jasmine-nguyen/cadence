import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button } from '@/components';
import { Smile, Meh, Frown, Check, Clock } from '@/components/icons';
import { FeltRating } from '@/state/types';
import { colors, radius as radii, shadows } from '@/theme';

const OPTIONS: {
  value: FeltRating;
  label: string;
  color: string;
  Icon: (p: { size: number; color: string; strokeWidth: number }) => React.ReactElement;
}[] = [
  { value: 'easy', label: 'Easy', color: colors.accentGreen, Icon: (p) => <Smile {...p} /> },
  { value: 'just_right', label: 'Just right', color: colors.accentCyan, Icon: (p) => <Meh {...p} /> },
  { value: 'hard', label: 'Hard', color: colors.gold, Icon: (p) => <Frown {...p} /> },
];

/** Post-Workout Feedback — prompt (bottom sheet) → saved confirmation. */
export default function Feedback() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [felt, setFelt] = useState<FeltRating>('just_right');
  const [saved, setSaved] = useState(false);

  if (saved) {
    return (
      <View style={styles.savedRoot}>
        <View style={styles.savedWrap}>
          <View style={styles.successDisc}>
            <View style={styles.successInner}>
              <Check size={34} color={colors.onAccent} strokeWidth={2.6} />
            </View>
          </View>
          <Text variant="h1" center style={styles.savedTitle}>
            Logged — nice work
          </Text>
          <Text variant="body" color="textSecondary" center style={styles.savedCopy}>
            You marked this one{' '}
            <Text variant="body" weight="600" color="accentCyan">
              {OPTIONS.find((o) => o.value === felt)?.label.toLowerCase()}
            </Text>
            . Your coach will keep Friday at a similar effort.
          </Text>

          <View style={styles.nextCard}>
            <View style={styles.nextTile}>
              <Clock size={20} color={colors.accentCyan} strokeWidth={1.9} />
            </View>
            <View>
              <Text variant="bodySmall" weight="600">
                Next up · Friday
              </Text>
              <Text variant="meta" color="textSecondary">
                Walk-Run · 2.5 km
              </Text>
            </View>
          </View>

          <Button label="Back to today" onPress={() => router.back()} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.promptRoot}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityLabel="Dismiss" />
      <View style={[styles.sheet, shadows.sheet, { paddingBottom: insets.bottom + 22 }]}>
        <View style={styles.handle} />
        <Text variant="h2" style={styles.title}>
          How did it feel?
        </Text>
        <Text variant="body" color="textSecondary" style={styles.copy}>
          One tap helps your coach set the right effort next time.
        </Text>

        <View style={styles.options}>
          {OPTIONS.map((o) => {
            const selected = felt === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => setFelt(o.value)}
                style={[styles.option, selected ? styles.optionSelected : styles.optionIdle]}
              >
                <o.Icon size={34} color={o.color} strokeWidth={1.7} />
                <Text variant="bodySmall" weight={selected ? '700' : '600'} style={styles.optionLabel}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.noteField}>
          <Text variant="bodySmall" color="textMuted">
            Add a note (optional) — e.g. legs felt heavy at the start…
          </Text>
        </View>

        <Button label="Save feedback" onPress={() => setSaved(true)} style={styles.saveBtn} />
        <Pressable style={styles.skip} onPress={() => router.back()} hitSlop={6}>
          <Text variant="body" weight="600" color="textSecondary">
            Skip
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  promptRoot: { flex: 1, backgroundColor: 'rgba(26,27,38,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#3a3c52', alignSelf: 'center', marginBottom: 22 },
  title: { fontSize: 23, marginBottom: 6 },
  copy: { marginBottom: 20 },
  options: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  option: { flex: 1, borderRadius: radii.card, paddingVertical: 18, alignItems: 'center', gap: 8 },
  optionIdle: { borderWidth: 1, borderColor: colors.stroke },
  optionSelected: { borderWidth: 1.5, borderColor: colors.accentCyan, backgroundColor: 'rgba(42,195,222,0.1)' },
  optionLabel: { fontSize: 14 },
  noteField: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.input,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  saveBtn: { borderRadius: 15, marginBottom: 4 },
  skip: { alignItems: 'center', paddingVertical: 12 },

  savedRoot: { flex: 1, backgroundColor: colors.bg },
  savedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 44 },
  successDisc: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(158,206,106,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  successInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.accentGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: { fontSize: 26, marginBottom: 12 },
  savedCopy: { marginBottom: 34 },
  nextCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 26,
  },
  nextTile: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(42,195,222,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
