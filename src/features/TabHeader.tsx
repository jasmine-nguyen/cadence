import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components';
import { colors, screenPadding } from '@/theme';

interface TabHeaderProps {
  title: string;
  /** Right-hand text (e.g. "This week") or a custom node (filter icon). */
  right?: React.ReactNode;
  children?: React.ReactNode;
}

/** Elevated tab header bar with rounded bottom corners. */
export function TabHeader({ title, right, children }: TabHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.row}>
        <Text variant="cardTitle" weight="700" style={styles.title}>
          {title}
        </Text>
        {typeof right === 'string' ? (
          <Text variant="meta" weight="500" color="textSecondary">
            {right}
          </Text>
        ) : (
          right
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: screenPadding.content,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20 },
});
