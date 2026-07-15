import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ProgressRing } from '@/components';
import { User, Bell, ChevronDown, Pause } from '@/components/icons';
import { CalendarDotsIcon } from './CalendarDotsIcon';
import { WeekDay } from '@/state/types';
import { colors, radius as radii, screenPadding } from '@/theme';

type Variant = 'planned' | 'paused' | 'completed';

interface TodayHeaderProps {
  variant: Variant;
  week: WeekDay[];
  weekLabel: string;
}

const dotColor: Record<NonNullable<WeekDay['dot']>, string> = {
  done: colors.accentGreen,
  scheduled: colors.accentGreen,
  today: colors.accentCyan,
};

/** Elevated header: profile/bell, week ring + label, calendar icon, week strip. */
export function TodayHeader({ variant, week, weekLabel }: TodayHeaderProps) {
  const insets = useSafeAreaInsets();
  const paused = variant === 'paused';
  const completed = variant === 'completed';

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topRow}>
        <View style={styles.leftIcons}>
          <User size={24} color={colors.text} strokeWidth={1.7} />
          {!completed && <Bell size={22} color={colors.text} strokeWidth={1.7} />}
        </View>

        {paused ? (
          <View style={styles.centerLabel}>
            <Pause size={16} color={colors.gold} fill={colors.gold} strokeWidth={0} />
            <Text variant="cardTitle" weight="700" color="textSecondary" style={styles.weekText}>
              Paused
            </Text>
          </View>
        ) : (
          <View style={styles.centerLabel}>
            <ProgressRing
              size={28}
              strokeWidth={4}
              progress={completed ? 0.5 : 0.3}
              color={completed ? colors.accentGreen : colors.accentCyan}
              trackColor={colors.stroke}
            />
            <Text variant="cardTitle" weight="700" style={styles.weekText}>
              {weekLabel}
            </Text>
            {!completed && <ChevronDown size={13} color={colors.textSecondary} strokeWidth={2.4} />}
          </View>
        )}

        <CalendarDotsIcon muted={paused} />
      </View>

      <View style={[styles.weekStrip, paused && styles.dimmed]}>
        {week.map((day) => {
          const isToday = day.isToday;
          return (
            <View key={day.weekday} style={styles.day}>
              <Text variant="overline" color="textMuted" style={styles.weekday}>
                {day.weekday}
              </Text>

              {isToday && !paused ? (
                <View style={[styles.todayDisc, completed && styles.todayDiscGreen]}>
                  <Text variant="cardTitle" weight="700" color="onAccent">
                    {day.date}
                  </Text>
                </View>
              ) : isToday && paused ? (
                <View style={styles.todayOutline}>
                  <Text variant="cardTitle" weight="600" color="textSecondary">
                    {day.date}
                  </Text>
                </View>
              ) : (
                <View style={styles.dateCell}>
                  <Text variant="cardTitle" weight="600" color="textSecondary">
                    {day.date}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.dot,
                  day.dot && !paused ? { backgroundColor: dotColor[day.dot] } : styles.dotEmpty,
                ]}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: screenPadding.content,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftIcons: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  centerLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekText: { fontSize: 19 },
  weekStrip: { flexDirection: 'row', marginTop: 16 },
  dimmed: { opacity: 0.45 },
  day: { flex: 1, alignItems: 'center', gap: 9 },
  weekday: { letterSpacing: 0.5 },
  dateCell: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDiscGreen: { backgroundColor: colors.accentGreen },
  todayOutline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 3 },
  dotEmpty: { backgroundColor: 'transparent' },
});
