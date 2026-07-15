import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen, Text } from '@/components';

/** Simple placeholder for tabs outside this handoff's scope. */
export function Placeholder({ title }: { title: string }) {
  return (
    <Screen>
      <View style={styles.center}>
        <Text variant="h1">{title}</Text>
        <Text variant="body" color="textMuted" center style={styles.note}>
          Coming soon.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  note: { marginTop: 4 },
});
