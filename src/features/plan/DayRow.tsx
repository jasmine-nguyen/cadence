import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components';
import { Check, Moon, Plus, RunFigure, GripDots } from '@/components/icons';
import { PlanDay } from '@/state/types';
import { colors, radius as radii, alpha } from '@/theme';

type Ghost = 'source' | 'target' | null;

interface DayRowProps {
  day: PlanDay;
  onLongPress?: () => void;
  dimmed?: boolean;
  ghost?: Ghost;
  /** Show the drag grip handle (draggable upcoming/today sessions). */
  showGrip?: boolean;
}

function DayColumn({ day }: { day: PlanDay }) {
  const today = day.status === 'today';
  return (
    <View style={styles.dayCol}>
      <Text variant="overline" weight="700" color={today ? 'accentCyan' : 'textMuted'} style={styles.weekday}>
        {day.weekday}
      </Text>
      <Text variant="cardTitle" weight="700" color={day.type === 'rest' ? 'textMuted' : 'text'}>
        {day.date}
      </Text>
    </View>
  );
}

/** A single day + its session card. Handles done/rest/today/upcoming/long + drag ghosts. */
export function DayRow({ day, onLongPress, dimmed, ghost, showGrip }: DayRowProps) {
  // Drag ghost states take over the card slot.
  if (ghost === 'source') {
    return (
      <View style={[styles.row, styles.dim]}>
        <DayColumn day={day} />
        <View style={styles.sourceGhost}>
          <Text variant="meta" weight="500" color="textMuted">
            Moving from here…
          </Text>
        </View>
      </View>
    );
  }
  if (ghost === 'target') {
    return (
      <View style={styles.row}>
        <DayColumn day={day} />
        <View style={styles.targetGhost}>
          <Plus size={16} color={colors.accentCyan} strokeWidth={2} />
          <Text variant="meta" weight="600" color="accentCyan">
            Drop here — move to {titleCase(day.weekday)}
          </Text>
        </View>
      </View>
    );
  }

  const isToday = day.status === 'today';
  const isDone = day.status === 'done';

  if (day.type === 'rest') {
    return (
      <View style={[styles.row, dimmed && styles.dim]}>
        <DayColumn day={day} />
        <View style={styles.restCard}>
          <Moon size={16} color={colors.textMuted} strokeWidth={1.8} />
          <Text variant="meta" weight="500" color="textMuted">
            Rest day
          </Text>
        </View>
      </View>
    );
  }

  const tileColor = isDone
    ? colors.accentGreen
    : isToday
      ? alpha.cyanTile
      : colors.cardInset;
  const iconColor = day.type === 'long' ? colors.gold : isToday ? colors.accentCyan : colors.textSecondary;

  return (
    <View style={[styles.row, dimmed && styles.dim]}>
      <DayColumn day={day} />
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={220}
        style={[styles.card, isToday && styles.cardToday]}
      >
        <View style={[styles.tile, { backgroundColor: tileColor }]}>
          {isDone ? (
            <Check size={18} color={colors.onAccent} strokeWidth={2.6} />
          ) : (
            <RunFigure size={17} color={iconColor} strokeWidth={1.9} />
          )}
        </View>
        <View style={styles.cardText}>
          <View style={styles.titleRow}>
            <Text variant="cardTitle" weight={isToday ? '700' : '600'} style={styles.title}>
              {day.title}
            </Text>
            {isToday && (
              <View style={styles.todayChip}>
                <Text variant="overline" weight="700" color="accentCyan" style={styles.todayChipText}>
                  Today
                </Text>
              </View>
            )}
          </View>
          {day.meta ? (
            <Text variant="meta" color="textSecondary">
              {day.meta}
            </Text>
          ) : null}
        </View>
        {showGrip && !isDone ? <GripDots size={16} color={colors.textMuted} /> : null}
      </Pressable>
    </View>
  );
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dim: { opacity: 0.4 },
  dayCol: { width: 34, alignItems: 'center' },
  weekday: { fontSize: 10, marginBottom: 1 },
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.input,
    paddingVertical: 12,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  cardToday: { borderWidth: 1.5, borderColor: colors.accentCyan },
  tile: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { fontSize: 15 },
  todayChip: {
    backgroundColor: alpha.cyanTile,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayChipText: { fontSize: 9, letterSpacing: 0.4 },
  restCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderStyle: 'dashed',
    borderRadius: radii.input,
    paddingVertical: 11,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sourceGhost: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderStyle: 'dashed',
    borderRadius: radii.input,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  targetGhost: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.accentCyan,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(42,195,222,0.08)',
    borderRadius: radii.input,
    paddingVertical: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
