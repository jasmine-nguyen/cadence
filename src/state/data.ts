import {
  PlanState,
  WeekDay,
  Workout,
  PlanWeek,
  Activity,
  InsightsData,
  SettingsState,
} from './types';

/** Seed week strip (Mon 13 – Sun 19 Jul), Wed 15 = today. */
export const seedWeek: WeekDay[] = [
  { weekday: 'MON', date: 13, dot: 'done' },
  { weekday: 'TUE', date: 14 },
  { weekday: 'WED', date: 15, dot: 'today', isToday: true },
  { weekday: 'THU', date: 16 },
  { weekday: 'FRI', date: 17, dot: 'scheduled' },
  { weekday: 'SAT', date: 18 },
  { weekday: 'SUN', date: 19, dot: 'scheduled' },
];

export const seedPlan: PlanState = {
  currentWeek: 1,
  totalWeeks: 4,
  status: 'active',
  pausedAt: null,
  progress: {
    workoutsDone: 1,
    workoutsTotal: 4,
    distanceDone: 3,
    distanceTotal: 11,
    streak: 2,
  },
  week: seedWeek,
};

/** Today's structured Walk-Run session (matches Workout Detail mock). */
export const seedWorkout: Workout = {
  id: 'today',
  title: 'Walk-Run',
  dateLabel: 'Wednesday 15 Jul',
  distanceLabel: '2km',
  durationLabel: '~24 min',
  why: 'Second session back — short and easy on purpose. Keep the runs conversational so your legs adapt before we add distance.',
  weather: {
    temp: '13°',
    summary: '13° & cloudy at 6pm · good to go',
    detail: '0% rain — no need to reschedule',
  },
  blocks: [
    {
      index: 1,
      header: 'warmup',
      title: 'Warm-Up',
      steps: [{ label: '5 min walking warm-up', kind: 'walk' }],
    },
    {
      index: 2,
      header: 'repeat',
      repeat: 2,
      steps: [
        { label: '250m', detail: 'conversational', kind: 'run' },
        { label: '60s walking', kind: 'walk' },
        { label: '750m', detail: 'conversational', kind: 'run' },
        { label: '90s walking', kind: 'walk' },
      ],
    },
    {
      index: 3,
      header: 'plain',
      dimmed: true,
      steps: [{ label: '5 min walking cool-down', kind: 'walk' }],
    },
  ],
};

/** Completed-state result stats. */
export const seedResult = {
  distance: '2.04 km',
  time: '24:12',
  pace: '11:52 /km',
  briefing: "That's two down. Your easy pace is settling — Friday builds on this. Rest up tomorrow.",
};

/** Plan goal + per-week schedule (Plan / Calendar screen). */
export const planGoalTitle = 'Run 5K continuously';

/** Plan-level totals shown in the Plan header stat tiles. */
export const planTotals = {
  weeksDone: 1,
  weeksTotal: 4,
  sessionsDone: 3,
  sessionsTotal: 16,
  distanceDone: 5,
  distanceTotal: 42,
};

export const seedWeeks: PlanWeek[] = [
  {
    index: 1,
    title: 'Ease back in',
    chip: 'inprogress',
    pips: ['done', 'rest', 'today', 'upcoming', 'upcoming'],
    days: [
      { weekday: 'MON', date: 13, type: 'run', title: 'Walk-Run', meta: '2.0 km · done', status: 'done' },
      { weekday: 'TUE', date: 14, type: 'rest', title: 'Rest day', meta: '', status: 'upcoming' },
      { weekday: 'WED', date: 15, type: 'run', title: 'Walk-Run', meta: '2 km · 24 min', status: 'today' },
      { weekday: 'FRI', date: 17, type: 'run', title: 'Walk-Run', meta: '2.5 km · 26 min', status: 'upcoming' },
      { weekday: 'SUN', date: 19, type: 'long', title: 'Long walk-run', meta: '3.0 km · longest this week', status: 'upcoming' },
    ],
  },
  {
    index: 2,
    title: 'Build the base',
    pips: ['upcoming', 'upcoming', 'upcoming', 'upcoming'],
    days: [
      { weekday: 'MON', date: 20, type: 'run', title: 'Walk-Run', meta: '2.5 km', status: 'upcoming' },
      { weekday: 'WED', date: 22, type: 'run', title: 'Walk-Run', meta: '3 km', status: 'upcoming' },
      { weekday: 'FRI', date: 24, type: 'run', title: 'Walk-Run', meta: '3 km', status: 'upcoming' },
      { weekday: 'SUN', date: 26, type: 'long', title: 'Long walk-run', meta: '4 km', status: 'upcoming' },
    ],
  },
  {
    index: 3,
    title: 'Longer runs',
    pips: ['upcoming', 'upcoming', 'upcoming', 'upcoming'],
    days: [
      { weekday: 'MON', date: 27, type: 'run', title: 'Walk-Run', meta: '3.5 km', status: 'upcoming' },
      { weekday: 'WED', date: 29, type: 'run', title: 'Walk-Run', meta: '4 km', status: 'upcoming' },
      { weekday: 'FRI', date: 31, type: 'run', title: 'Walk-Run', meta: '4 km', status: 'upcoming' },
      { weekday: 'SUN', date: 2, type: 'long', title: 'Long run', meta: '5 km', status: 'upcoming' },
    ],
  },
  {
    index: 4,
    title: 'Run 5K',
    chip: 'goal',
    pips: ['upcoming', 'upcoming', 'upcoming', 'goal'],
    days: [
      { weekday: 'MON', date: 3, type: 'run', title: 'Easy run', meta: '3 km', status: 'upcoming' },
      { weekday: 'WED', date: 5, type: 'run', title: 'Easy run', meta: '3 km', status: 'upcoming' },
      { weekday: 'FRI', date: 7, type: 'run', title: 'Shakeout', meta: '2 km', status: 'upcoming' },
      { weekday: 'SUN', date: 9, type: 'long', title: 'Run 5K', meta: 'goal session', status: 'upcoming' },
    ],
  },
];

/** Completed runs (Activity History). */
export const seedActivities: Activity[] = [
  {
    id: 'a1',
    title: 'Walk-Run',
    type: 'run',
    dateLabel: 'Wed 15 Jul · 6:12pm',
    distance: '2.04 km',
    movingTime: '24:12',
    avgPace: '11:52',
    avgHr: '146',
    felt: 'just_right',
    splits: [
      { label: '1', ratio: 0.7, time: '11:20' },
      { label: '2', ratio: 0.82, time: '12:24' },
      { label: '.04', ratio: 0.55, time: '10:40', partial: true },
    ],
  },
  {
    id: 'a2',
    title: 'Walk-Run',
    type: 'run',
    dateLabel: 'Mon 13 Jul · 7:02am',
    distance: '2.01 km',
    movingTime: '24:40',
    avgPace: '12:16',
    avgHr: '144',
    splits: [
      { label: '1', ratio: 0.78, time: '12:00' },
      { label: '2', ratio: 0.85, time: '12:40' },
      { label: '.01', ratio: 0.5, time: '11:10', partial: true },
    ],
  },
  {
    id: 'a3',
    title: 'Easy walk',
    type: 'walk',
    dateLabel: 'Sat 11 Jul · 5:40pm',
    distance: '2.05 km',
    movingTime: '23:10',
    avgPace: '11:18',
    avgHr: '128',
    splits: [
      { label: '1', ratio: 0.72, time: '11:05' },
      { label: '2', ratio: 0.68, time: '11:00' },
      { label: '.05', ratio: 0.4, time: '10:20', partial: true },
    ],
  },
];

export const activitiesSummary = { runs: 3, totalKm: '6.1', movingTime: '1:12' };

/** Insights dashboard data. */
export const seedInsights: InsightsData = {
  ready: true,
  consistency: { done: 3, total: 4, streak: 2 },
  weeklyVolume: { km: '5.0', deltaPct: '+38%', bars: [0.4, 0.55, 0.7] },
  easyPct: 92,
  recovery: { restHr: '52', hrv: '68', sleep: '7h20', readiness: 'Good to go' },
  benchmark: { value: '780 m', delta: '+40 m' },
  shoe: { name: 'Cloudsurfer', km: 82, threshold: 500 },
};

export const seedSettings: SettingsState = {
  dailyReminder: true,
  reminderTime: '6:00 PM',
  units: 'km',
  shoeThresholdKm: 500,
  corosConnected: true,
};
