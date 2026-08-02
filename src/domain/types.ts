import type { DayKey } from './time/dayKey';

export type { DayKey };

export type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro';

export interface Task {
  id: string;
  title: string;
  createdAt: number;
  dayKey: DayKey;
  mode: TimerMode;
  targetMs: number | null;
  completedAt: number | null;
  completedDayKey: DayKey | null;
  deletedAt: number | null;
  categoryId: string | null;
  tags: string[];
  notes: string | null;
}

export type SessionKind =
  | 'stopwatch'
  | 'countdown'
  | 'pomodoro_work'
  | 'pomodoro_short_break'
  | 'pomodoro_long_break';

export interface Session {
  id: string;
  taskId: string;
  kind: SessionKind;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  dayKey: DayKey;
  completed: boolean;
}

export type TimerStatus = 'running' | 'paused';
export type PomodoroPhase = 'work' | 'short_break' | 'long_break';

export interface ActiveTimer {
  taskId: string;
  kind: SessionKind;
  status: TimerStatus;
  startedAt: number;
  accumulatedMs: number;
  targetMs: number | null;
  pomodoro: { phase: PomodoroPhase; completedWorkCycles: number } | null;
}

export interface Settings {
  theme: 'dark' | 'light';
  language: 'en' | 'ar';
  dayStartHour: number;
  weekStartsOn: 0 | 1 | 6;
  dailyGoalMs: number;
  streakMinFocusMs: number;
  pomodoro: {
    workMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    cyclesBeforeLongBreak: number;
    autoStartBreaks: boolean;
    autoStartWork: boolean;
  };
  sound: { enabled: boolean; volume: number };
  notifications: { enabled: boolean };
}

export interface PersistedState {
  schemaVersion: 2;
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
}

type SessionKindCategory = 'focus' | 'break';

const SESSION_KIND_MAP = {
  stopwatch: 'focus',
  countdown: 'focus',
  pomodoro_work: 'focus',
  pomodoro_short_break: 'break',
  pomodoro_long_break: 'break',
} as const satisfies Record<SessionKind, SessionKindCategory>;

export const FOCUS_KINDS: readonly SessionKind[] = (
  Object.keys(SESSION_KIND_MAP) as SessionKind[]
).filter((kind) => SESSION_KIND_MAP[kind] === 'focus');

export const BREAK_KINDS: readonly SessionKind[] = (
  Object.keys(SESSION_KIND_MAP) as SessionKind[]
).filter((kind) => SESSION_KIND_MAP[kind] === 'break');

export function isFocusKind(kind: SessionKind): boolean {
  return SESSION_KIND_MAP[kind] === 'focus';
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  language: 'en',
  dayStartHour: 0,
  weekStartsOn: 1,
  dailyGoalMs: 14_400_000,
  streakMinFocusMs: 900_000,
  pomodoro: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartWork: false,
  },
  sound: {
    enabled: true,
    volume: 0.7,
  },
  notifications: {
    enabled: true,
  },
};

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = 'study-tracker:v1';

export function emptyState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: [],
    sessions: [],
    settings: {
      ...DEFAULT_SETTINGS,
      pomodoro: { ...DEFAULT_SETTINGS.pomodoro },
      sound: { ...DEFAULT_SETTINGS.sound },
      notifications: { ...DEFAULT_SETTINGS.notifications },
    },
    activeTimer: null,
  };
}
