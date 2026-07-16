import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { BottomSheet, Text, Button, SelectRow } from '@/components';
import { ArrowRight } from '@/components/icons';
import { SkipReason } from '@/state/types';
import { colors, alpha } from '@/theme';

const REASONS: { value: SkipReason; label: string }[] = [
  { value: 'not-up-to-it', label: 'Not feeling up to it' },
  { value: 'too-busy', label: 'Too busy today' },
  { value: 'injury', label: 'Injury / not recovered' },
];

interface SkipSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (reason: SkipReason) => void;
}

/** Skip bottom sheet — reason capture feeds plan adjustment. */
export function SkipSheet({ visible, onDismiss, onConfirm }: SkipSheetProps) {
  const [reason, setReason] = useState<SkipReason>('too-busy');

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={styles.iconTile}>
        <ArrowRight size={26} color={colors.red} strokeWidth={1.9} />
      </View>
      <Text variant="h2" style={styles.title}>
        Skip this workout?
      </Text>
      <Text variant="body" color="textSecondary" style={styles.copy}>
        It'll be marked as skipped. Your coach adapts the rest of the week — no need to make it up.
      </Text>

      <View style={styles.reasons}>
        {REASONS.map((r) => (
          <SelectRow
            key={r.value}
            label={r.label}
            selected={reason === r.value}
            onPress={() => setReason(r.value)}
          />
        ))}
      </View>

      <Button label="Skip workout" variant="destructive" onPress={() => onConfirm(reason)} />
      <Pressable style={styles.keepIt} onPress={onDismiss} hitSlop={6}>
        <Text variant="body" weight="600" color="textSecondary">
          Keep it
        </Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  iconTile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: alpha.redTile,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 23, marginBottom: 8 },
  copy: { marginBottom: 22 },
  reasons: { gap: 10, marginBottom: 22 },
  keepIt: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
});
