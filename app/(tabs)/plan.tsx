import React, { useRef, useState } from 'react';
import {
  View,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Button, ScreenScroll, StatTile, Chip } from '@/components';
import { Pause } from '@/components/icons';
import { DayRow } from '@/features/plan/DayRow';
import { MultiWeek } from '@/features/plan/MultiWeek';
import { PausePlanSheet } from '@/features/PausePlanSheet';
import { useStore } from '@/state/store';
import { seedWeeks, planGoalTitle, planTotals } from '@/state/data';
import { PlanDay } from '@/state/types';
import { colors, radius as radii, screenPadding, alpha } from '@/theme';

const CARD_HEIGHT = 58;
const LONG_PRESS_MS = 240;

/** Plan / Calendar — week view · multi-week · reschedule · paused. */
export default function Plan() {
  const insets = useSafeAreaInsets();
  const { plan, pausePlan, resumePlan } = useStore();
  const paused = plan.status === 'paused';

  // 0–3 = week index; 4 = "All weeks" overview.
  const [tab, setTab] = useState(0);
  const [pauseOpen, setPauseOpen] = useState(false);

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text variant="overline" color="textMuted" style={styles.overline}>
              Your plan
            </Text>
            <Text variant="h2" style={styles.goal}>
              {planGoalTitle}
            </Text>
          </View>
          <PausePill paused={paused} onPress={() => setPauseOpen(true)} />
        </View>

        {!paused && (
          <View style={styles.stats}>
            <StatTile card value={`${planTotals.weeksDone}`} suffix={`/${planTotals.weeksTotal}`} label="Weeks" />
            <StatTile card value={`${planTotals.sessionsDone}`} suffix={`/${planTotals.sessionsTotal}`} label="Sessions" />
            <StatTile card value={`${planTotals.distanceDone}`} suffix={`/${planTotals.distanceTotal} km`} label="Distance" />
          </View>
        )}
      </View>

      {paused ? (
        <PausedPlan onResume={resumePlan} />
      ) : (
        <>
          <View style={styles.tabsRow}>
            <ScreenScroll horizontal contentContainerStyle={styles.tabs}>
              {[0, 1, 2, 3].map((i) => (
                <Chip key={i} label={`Week ${i + 1}`} selected={tab === i} onPress={() => setTab(i)} style={styles.weekChip} />
              ))}
              <Chip label="All weeks" selected={tab === 4} onPress={() => setTab(4)} style={styles.weekChip} />
            </ScreenScroll>
          </View>

          {tab === 4 ? (
            <ScreenScroll contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
              <MultiWeek weeks={seedWeeks} />
            </ScreenScroll>
          ) : (
            <ReschedulableWeek weekIndex={tab} />
          )}
        </>
      )}

      <PausePlanSheet
        visible={pauseOpen}
        onDismiss={() => setPauseOpen(false)}
        onConfirm={() => {
          setPauseOpen(false);
          pausePlan();
        }}
      />
    </View>
  );
}

function PausePill({ paused, onPress }: { paused: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={paused}
      onPress={onPress}
      style={[styles.pausePill, paused ? styles.pausePillOn : styles.pausePillOff]}
    >
      <Pause size={13} color={colors.gold} fill={colors.gold} strokeWidth={0} />
      <Text variant="meta" weight="600" color="gold">
        {paused ? 'Paused' : 'Pause'}
      </Text>
    </Pressable>
  );
}

/** Paused Plan — banner + dimmed weeks + on-hold sessions. */
function PausedPlan({ onResume }: { onResume: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <ScreenScroll contentContainerStyle={[styles.body, { paddingBottom: 100 + insets.bottom }]}>
      <View style={styles.pausedBanner}>
        <View style={styles.pausedHead}>
          <Pause size={20} color={colors.gold} fill={colors.gold} strokeWidth={0} />
          <Text variant="cardTitle" weight="700" style={styles.pausedTitle}>
            Plan paused
          </Text>
        </View>
        <Text variant="bodySmall" color="textSecondary" style={styles.pausedCopy}>
          Paused on 15 Jul. Your 4-week plan is frozen — resume any time and the remaining weeks
          shift forward from that day.
        </Text>
        <Button label="Resume plan" onPress={onResume} style={styles.resumeBtn} />
      </View>

      <View style={styles.pausedTabs}>
        {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, i) => (
          <Chip key={w} label={w} selected={i === 0} selectedColor={colors.stroke} style={styles.weekChip} />
        ))}
      </View>

      <View style={styles.onHold}>
        {seedWeeks[0].days
          .filter((d) => d.type !== 'rest' && d.status !== 'done')
          .slice(0, 2)
          .map((d) => (
            <View key={d.date} style={styles.onHoldRow}>
              <View style={styles.dayCol}>
                <Text variant="overline" weight="700" color="textMuted" style={styles.onHoldWeekday}>
                  {d.weekday}
                </Text>
                <Text variant="cardTitle" weight="700" color="textSecondary">
                  {d.date}
                </Text>
              </View>
              <View style={styles.onHoldCard}>
                <Text variant="bodySmall" weight="600" color="textSecondary">
                  Walk-Run · on hold
                </Text>
              </View>
            </View>
          ))}
      </View>
    </ScreenScroll>
  );
}

/**
 * Week view with long-press drag-to-reschedule. Long-press a session, drag it
 * over another day, release to move it — the rest of the week adapts.
 */
function ReschedulableWeek({ weekIndex }: { weekIndex: number }) {
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState<PlanDay[]>(seedWeeks[weekIndex].days);

  // Re-seed when the selected week changes.
  const seededFor = useRef(weekIndex);
  if (seededFor.current !== weekIndex) {
    seededFor.current = weekIndex;
    setDays(seedWeeks[weekIndex].days);
  }

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const floatY = useRef(new Animated.Value(0)).current;

  const rowLayouts = useRef<{ y: number; h: number }[]>([]);
  const listPageY = useRef(0);
  const listRef = useRef<View>(null);
  const grabbedRef = useRef<number | null>(null);
  const targetRef = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grabStartY = useRef(0);

  const onListLayout = () => {
    listRef.current?.measureInWindow((_x, y) => {
      listPageY.current = y;
    });
  };

  const draggable = (d?: PlanDay) => !!d && d.status !== 'done' && d.type !== 'rest';

  const indexAtPageY = (pageY: number) => {
    const rel = pageY - listPageY.current;
    for (let i = 0; i < rowLayouts.current.length; i++) {
      const r = rowLayouts.current[i];
      if (r && rel >= r.y && rel <= r.y + r.h) return i;
    }
    return rel < 0 ? 0 : days.length - 1;
  };

  const clearTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const reset = () => {
    clearTimer();
    grabbedRef.current = null;
    targetRef.current = null;
    setDragIndex(null);
    setTargetIndex(null);
  };

  const pan = useRef(
    PanResponder.create({
      // Own the gesture on the list so long-press → drag works reliably.
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        const pageY = e.nativeEvent.pageY;
        grabStartY.current = pageY;
        const idx = indexAtPageY(pageY);
        if (draggable(days[idx])) {
          longPressTimer.current = setTimeout(() => {
            grabbedRef.current = idx;
            targetRef.current = idx;
            floatY.setValue(pageY - CARD_HEIGHT / 2 - listPageY.current);
            setDragIndex(idx);
            setTargetIndex(idx);
          }, LONG_PRESS_MS);
        }
      },
      onPanResponderMove: (e) => {
        const pageY = e.nativeEvent.pageY;
        if (grabbedRef.current === null) {
          // Not yet dragging — a real drag/scroll cancels the pending long-press.
          if (Math.abs(pageY - grabStartY.current) > 10) clearTimer();
          return;
        }
        floatY.setValue(pageY - CARD_HEIGHT / 2 - listPageY.current);
        const idx = indexAtPageY(pageY);
        if (idx !== targetRef.current) {
          targetRef.current = idx;
          setTargetIndex(idx);
        }
      },
      onPanResponderRelease: () => {
        const from = grabbedRef.current;
        const to = targetRef.current;
        if (from !== null && to !== null && from !== to) {
          setDays((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
          });
        }
        reset();
      },
      onPanResponderTerminate: reset,
    }),
  ).current;

  const dragging = dragIndex !== null;
  const draggedDay = dragIndex !== null ? days[dragIndex] : null;

  return (
    <View style={styles.weekWrap}>
      <View ref={listRef} onLayout={onListLayout} style={[styles.body, styles.dayList]} {...pan.panHandlers}>
        {days.map((day, i) => {
          const ghost = !dragging ? null : i === dragIndex ? 'source' : i === targetIndex ? 'target' : null;
          return (
            <View
              key={`${day.weekday}-${day.date}`}
              onLayout={(e: LayoutChangeEvent) => {
                const { y, height } = e.nativeEvent.layout;
                rowLayouts.current[i] = { y, h: height };
              }}
            >
              <DayRow
                day={day}
                dimmed={dragging && ghost === null}
                ghost={ghost}
                showGrip={draggable(day)}
              />
            </View>
          );
        })}
      </View>

      {dragging && draggedDay && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[styles.floating, { top: floatY, transform: [{ rotate: '-2deg' }] }]}
          >
            <View style={styles.floatingCard}>
              <View style={styles.floatingTile}>
                <Text variant="meta" weight="700" color="accentCyan">
                  {draggedDay.weekday[0]}
                </Text>
              </View>
              <View style={styles.floatingText}>
                <Text variant="cardTitle" weight="700">
                  {draggedDay.title}
                </Text>
                <Text variant="meta" color="textSecondary">
                  {draggedDay.meta.split('·')[0].trim() || draggedDay.meta} · dragging…
                </Text>
              </View>
            </View>
          </Animated.View>
          <View style={[styles.hintBar, { paddingBottom: insets.bottom + 16 }]}>
            <Text variant="meta" weight="500" color="textSecondary" center>
              Release to reschedule · the rest of the week adapts
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: screenPadding.content,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  overline: { letterSpacing: 0.4 },
  goal: { fontSize: 23, marginTop: 3 },
  pausePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.chip,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pausePillOff: { borderWidth: 1, borderColor: alpha.goldBorder },
  pausePillOn: { backgroundColor: 'rgba(224,175,104,0.15)' },
  stats: { flexDirection: 'row', gap: 9, marginTop: 16 },
  tabsRow: { paddingTop: 16 },
  tabs: { paddingHorizontal: screenPadding.content, gap: 8 },
  weekChip: { borderRadius: 11, paddingHorizontal: 18, paddingVertical: 9 },
  body: { paddingHorizontal: screenPadding.content },
  weekWrap: { flex: 1 },
  dayList: { paddingTop: 16, gap: 9 },

  pausedBanner: {
    marginTop: 18,
    backgroundColor: alpha.goldBanner,
    borderWidth: 1,
    borderColor: alpha.goldBorder,
    borderRadius: 18,
    padding: 20,
  },
  pausedHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  pausedTitle: { fontSize: 19 },
  pausedCopy: { marginBottom: 16 },
  resumeBtn: { paddingVertical: 15, borderRadius: radii.input },
  pausedTabs: { flexDirection: 'row', gap: 8, marginTop: 18, opacity: 0.4 },
  onHold: { marginTop: 16, gap: 9, opacity: 0.35 },
  onHoldRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  dayCol: { width: 34, alignItems: 'center' },
  onHoldWeekday: { fontSize: 10, marginBottom: 1 },
  onHoldCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.input,
    paddingVertical: 13,
    paddingHorizontal: 13,
  },

  floating: { position: 'absolute', left: 24, right: 24 },
  floatingCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.accentCyan,
    borderRadius: radii.card,
    paddingVertical: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 20,
  },
  floatingTile: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: alpha.cyanTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingText: { flex: 1 },
  hintBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgElevated,
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
});
