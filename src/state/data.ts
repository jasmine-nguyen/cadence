import { PlanState, WeekDay, Workout } from './types';

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
