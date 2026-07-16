import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text } from '@/components';
import { RunFigure, WalkFigure } from '@/components/icons';
import { Activity } from '@/state/types';
import { colors, radius as radii, alpha } from '@/theme';

/** One activity-history row: icon tile · title/date · distance/time·pace. */
export function ActivityRow({ activity, onPress }: { activity: Activity; onPress: () => void }) {
  const run = activity.type === 'run';
  return (
    <Card surface="card" radius={radii.card} onPress={onPress} style={styles.row}>
      <View style={[styles.tile, { backgroundColor: run ? alpha.greenFill : alpha.cyanTile }]}>
        {run ? (
          <RunFigure size={22} color={colors.accentGreen} strokeWidth={1.9} />
        ) : (
          <WalkFigure size={22} color={colors.accentCyan} strokeWidth={1.9} />
        )}
      </View>
      <View style={styles.body}>
        <Text variant="cardTitle" weight="600" style={styles.title}>
          {activity.title}
        </Text>
        <Text variant="meta" color="textSecondary">
          {activity.dateLabel}
        </Text>
      </View>
      <View style={styles.right}>
        <Text variant="cardTitle" weight="700" style={styles.title}>
          {activity.distance}
        </Text>
        <Text variant="meta" color="textSecondary">
          {activity.movingTime} · {activity.avgPace}/km
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, paddingHorizontal: 16 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { fontSize: 15 },
  right: { alignItems: 'flex-end' },
});
