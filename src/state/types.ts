export type Sex = 'female' | 'male' | 'na';
export type Ability = 'getting-back' | 'new' | 'occasional';
export type GoalType = '5k' | 'habit' | '10k';
export type Injury = 'none' | 'knee' | 'shin' | 'ankle' | 'hip';

export interface OnboardingState {
  step: 1 | 2 | 3;
  profile: { age?: number; weight?: number; height?: number; sex?: Sex };
  background: { ability?: Ability; frequency?: 0 | 1 | 2 | 3; injuries: Injury[] };
  goal: { type?: GoalType; targetDate?: string; daysPerWeek?: number };
  generating: boolean;
}

export interface AuthState {
  email: string;
  session: boolean;
  needs2fa: boolean;
  code: string;
  resendCountdown: number;
  error: string | null;
}

/** The five designed Today variants. */
export type TodayState = 'planned' | 'paused' | 'completed' | 'empty' | 'error';

export interface WeekDay {
  weekday: string;
  date: number;
  /** status dot under the day, if any */
  dot?: 'scheduled' | 'today' | 'done';
  isToday?: boolean;
}

export interface PlanProgress {
  workoutsDone: number;
  workoutsTotal: number;
  distanceDone: number;
  distanceTotal: number;
  streak: number;
}

export interface PlanState {
  currentWeek: number;
  totalWeeks: number;
  status: 'active' | 'paused' | 'none';
  pausedAt: string | null;
  progress: PlanProgress;
  week: WeekDay[];
}

export type StepKind = 'walk' | 'run';

export interface IntervalStep {
  label: string;
  detail?: string;
  kind: StepKind;
}

export interface WorkoutBlock {
  index: number;
  title?: string;
  /** header strip style */
  header: 'warmup' | 'repeat' | 'plain';
  repeat?: number;
  steps: IntervalStep[];
  dimmed?: boolean;
}

export interface Workout {
  id: string;
  title: string;
  dateLabel: string;
  distanceLabel: string;
  durationLabel: string;
  why: string;
  weather: { temp: string; summary: string; detail: string };
  blocks: WorkoutBlock[];
}

export type SkipReason = 'not-up-to-it' | 'too-busy' | 'injury';

// --- Plan / Calendar ---------------------------------------------------------
export type SessionType = 'run' | 'walk' | 'long' | 'rest';
export type SessionStatus = 'done' | 'today' | 'upcoming' | 'skipped' | 'onhold';

export interface PlanDay {
  weekday: string;
  date: number;
  type: SessionType;
  title: string;
  meta: string;
  status: SessionStatus;
}

export interface PlanWeek {
  index: number;
  title: string;
  /** e.g. "In progress" | "Goal week" */
  chip?: 'inprogress' | 'goal';
  /** day-pip states for the multi-week overview */
  pips: ('done' | 'today' | 'goal' | 'upcoming' | 'rest')[];
  days: PlanDay[];
}

// --- Activities --------------------------------------------------------------
export interface Split {
  label: string;
  /** 0–1 relative bar width */
  ratio: number;
  time: string;
  /** partial final split renders cyan */
  partial?: boolean;
}

export interface Activity {
  id: string;
  title: string;
  type: 'run' | 'walk';
  dateLabel: string;
  distance: string;
  movingTime: string;
  avgPace: string;
  avgHr: string;
  felt?: 'easy' | 'just_right' | 'hard';
  splits: Split[];
}

// --- Insights ----------------------------------------------------------------
export interface InsightsData {
  ready: boolean;
  consistency: { done: number; total: number; streak: number };
  weeklyVolume: { km: string; deltaPct: string; bars: number[] };
  easyPct: number;
  recovery: { restHr: string; hrv: string; sleep: string; readiness: string };
  benchmark: { value: string; delta: string };
  shoe: { name: string; km: number; threshold: number };
}

// --- Settings ----------------------------------------------------------------
export interface SettingsState {
  dailyReminder: boolean;
  reminderTime: string;
  units: 'km' | 'mi';
  shoeThresholdKm: number;
  corosConnected: boolean;
}

export type FeltRating = 'easy' | 'just_right' | 'hard';
export type CheckinReason = 'busy' | 'low-energy' | 'injury';
export type PauseDuration = '1week' | '2weeks' | 'until-resume';
