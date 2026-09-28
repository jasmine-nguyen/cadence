import { GoalType, JourneyPoint, JourneySummary, PlanDay, PlanWeek } from './types';

/**
 * Pure helpers for the Plan · Finished screen. Everything here is derived from
 * the plan weeks so the screen never shows literal numbers. When real plans
 * land (CAD-48) only the input changes.
 */

const isSession = (d: PlanDay) => d.type !== 'rest';
const isDoneSession = (d: PlanDay) => isSession(d) && d.status === 'done';

/** Distance for a day: explicit `distanceKm`, else the leading "N km" in `meta`, else 0. */
export function dayDistanceKm(day: PlanDay): number {
  if (day.distanceKm != null) return day.distanceKm;
  const match = /^\s*(\d+(?:\.\d+)?)\s*km\b/i.exec(day.meta);
  return match ? Number(match[1]) : 0;
}

/** "MON" → "Mon". */
function titleCaseWeekday(weekday: string): string {
  return weekday.charAt(0).toUpperCase() + weekday.slice(1).toLowerCase();
}

function toPoint(week: PlanWeek, day: PlanDay): JourneyPoint {
  return {
    weekLabel: `Week ${week.index}`,
    dateLabel: `${titleCaseWeekday(day.weekday)} ${day.date}`,
    title: day.title,
    distanceKm: dayDistanceKm(day),
  };
}

/**
 * Summarise a plan: first and final completed sessions, completed weeks and
 * sessions, and total distance. Skipped sessions don't count, and a week that
 * contains one isn't "completed".
 */
export function buildJourneySummary(
  weeks: PlanWeek[],
  goalType: GoalType,
  goalTitle: string,
): JourneySummary {
  const done: { week: PlanWeek; day: PlanDay }[] = [];
  for (const week of weeks) {
    for (const day of week.days) {
      if (isDoneSession(day)) done.push({ week, day });
    }
  }

  const weeksCompleted = weeks.filter((w) => {
    const sessions = w.days.filter(isSession);
    return sessions.length > 0 && sessions.every((d) => d.status === 'done');
  }).length;

  const totalKm = done.reduce((sum, { day }) => sum + dayDistanceKm(day), 0);
  const first = done[0];
  // The "goal" end of the journey must come from the final week; an earlier
  // run shouldn't be labelled as the goal if the final session was skipped.
  const finalWeek = weeks[weeks.length - 1];
  const inFinalWeek = done.filter((d) => d.week === finalWeek);
  const last = inFinalWeek[inFinalWeek.length - 1];

  return {
    goalType,
    goalTitle,
    weeksCompleted,
    weeksTotal: weeks.length,
    sessionsCompleted: done.length,
    totalKm: Math.round(totalKm * 10) / 10,
    first: first ? toPoint(first.week, first.day) : null,
    last: last ? toPoint(last.week, last.day) : null,
  };
}

/** "2.0" for single-session distances. */
export function formatKm(km: number): string {
  return km.toFixed(1);
}

const pluralWeeks = (n: number) => `${n} ${n === 1 ? 'week' : 'weeks'}`;

/**
 * The goal-specific headline. "Without stopping" is only true for a 5K plan,
 * so it branches on goal type.
 */
export function goalHeadline(summary: JourneySummary): string {
  switch (summary.goalType) {
    case '5k':
      return 'Today you ran 5K without stopping.';
    case '10k':
      return 'Today you ran 10K.';
    case 'habit':
      // weeksTotal, not weeksCompleted: one skip a week would otherwise read "0 weeks".
      return `${pluralWeeks(summary.weeksTotal)} of showing up.`;
  }
}

/** Lead paragraph: where she started, then the goal headline. */
export function journeyLead(summary: JourneySummary): string {
  const { first, weeksTotal } = summary;
  const start = first
    ? `${pluralWeeks(weeksTotal)} ago you started with a ${formatKm(first.distanceKm)} km ${first.title.toLowerCase()}. `
    : '';
  return start + goalHeadline(summary);
}

/** Options for "What's next?" — every goal except the one just finished. */
export const NEXT_GOALS: { value: GoalType; label: string }[] = [
  { value: '5k', label: 'Run 5K continuously' },
  { value: 'habit', label: 'Build a running habit' },
  { value: '10k', label: 'Train for 10K' },
];

export function nextGoalOptions(finished: GoalType) {
  return NEXT_GOALS.filter((g) => g.value !== finished);
}
