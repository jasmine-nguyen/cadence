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
