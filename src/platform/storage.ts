import type {
  ActiveTimer,
  PersistedState,
  PomodoroPhase,
  Session,
  SessionKind,
  Settings,
  Task,
  TimerMode,
  TimerStatus,
} from '../domain/types';
import {
  DEFAULT_SETTINGS,
  SCHEMA_VERSION,
  emptyState,
} from '../domain/types';
import { dayKeyFromTimestamp, isValidDayKey } from '../domain/time/dayKey';

export interface StorageAdapter {
  read(): string | null;
  write(value: string): void;
  remove(): void;
}

export function createLocalStorageAdapter(key: string): StorageAdapter {
  return {
    read(): string | null {
      try {
        if (typeof window === 'undefined' || !window.localStorage) {
          return null;
        }
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    write(value: string): void {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
      } catch {
        // tolerate QuotaExceededError or disabled storage
      }
    },
    remove(): void {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
      } catch {
        // tolerate errors
      }
    },
  };
}

export function createMemoryAdapter(initial: string | null = null): StorageAdapter {
  let value: string | null = initial;
  return {
    read(): string | null {
      return value;
    },
    write(newValue: string): void {
      value = newValue;
    },
    remove(): void {
      value = null;
    },
  };
}

export function saveState(adapter: StorageAdapter, state: PersistedState): void {
  try {
    const raw = JSON.stringify(state);
    adapter.write(raw);
  } catch {
    // Never throw on save
  }
}

export function loadState(adapter: StorageAdapter): { state: PersistedState; recovered: boolean } {
  let rawStr: string | null = null;
  try {
    rawStr = adapter.read();
  } catch {
    return { state: emptyState(), recovered: true };
  }

  if (rawStr === null || typeof rawStr !== 'string' || rawStr.trim() === '') {
    return { state: emptyState(), recovered: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawStr);
  } catch {
    return { state: emptyState(), recovered: true };
  }

  return migrateWithResult(parsed);
}

export function migrate(raw: unknown): PersistedState {
  return migrateWithResult(raw).state;
}

function migrateWithResult(raw: unknown): { state: PersistedState; recovered: boolean } {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { state: emptyState(), recovered: true };
  }

  const obj = raw as Record<string, unknown>;

  const isV1 = obj.schemaVersion === 1;
  const isV2 = obj.schemaVersion === 2;
  const isV3 = obj.schemaVersion === 3;

  if (!isV1 && !isV2 && !isV3) {
    return { state: emptyState(), recovered: true };
  }

  let recovered = false;

  // 1. Settings
  const { settings, settingsRecovered } = validateSettings(obj.settings);
  if (settingsRecovered) {
    recovered = true;
  }

  let settingsUpdatedAt = 0;
  if (
    typeof obj.settingsUpdatedAt === 'number' &&
    Number.isFinite(obj.settingsUpdatedAt) &&
    obj.settingsUpdatedAt >= 0
  ) {
    settingsUpdatedAt = obj.settingsUpdatedAt;
  } else if (isV3) {
    recovered = true;
  }

  // 2. Tasks
  let tasks: Task[] = [];
  if (!Array.isArray(obj.tasks)) {
    tasks = [];
    recovered = true;
  } else {
    for (const item of obj.tasks) {
      const validated = validateTask(item, settings.dayStartHour, isV1, isV2);
      if (validated.task) {
        tasks.push(validated.task);
        if (validated.repaired) {
          recovered = true;
        }
      } else {
        recovered = true;
      }
    }
  }

  // 3. Sessions
  let sessions: Session[] = [];
  if (!Array.isArray(obj.sessions)) {
    sessions = [];
    recovered = true;
  } else {
    for (const item of obj.sessions) {
      const validated = validateSession(item, settings.dayStartHour);
      if (validated.session) {
        sessions.push(validated.session);
        if (validated.repaired) {
          recovered = true;
        }
      } else {
        recovered = true;
      }
    }
  }

  // 4. ActiveTimer
  let activeTimer: ActiveTimer | null = null;
  if (obj.activeTimer !== null && obj.activeTimer !== undefined) {
    if (isValidActiveTimer(obj.activeTimer)) {
      activeTimer = obj.activeTimer as ActiveTimer;
    } else {
      activeTimer = null;
      recovered = true;
    }
  }

  const state: PersistedState = {
    schemaVersion: SCHEMA_VERSION,
    tasks,
    sessions,
    settings,
    settingsUpdatedAt,
    activeTimer,
  };

  return { state, recovered };
}

function validateSettings(rawSettings: unknown): { settings: Settings; settingsRecovered: boolean } {
  let settingsRecovered = false;

  if (typeof rawSettings !== 'object' || rawSettings === null || Array.isArray(rawSettings)) {
    return {
      settings: {
        ...DEFAULT_SETTINGS,
        pomodoro: { ...DEFAULT_SETTINGS.pomodoro },
        sound: { ...DEFAULT_SETTINGS.sound },
        notifications: { ...DEFAULT_SETTINGS.notifications },
      },
      settingsRecovered: true,
    };
  }

  const s = rawSettings as Record<string, unknown>;

  let theme: 'dark' | 'light' = DEFAULT_SETTINGS.theme;
  if (s.theme === 'dark' || s.theme === 'light') {
    theme = s.theme;
  } else {
    settingsRecovered = true;
  }

  let language: 'en' | 'ar' = DEFAULT_SETTINGS.language;
  if (s.language === 'en' || s.language === 'ar') {
    language = s.language;
  } else {
    settingsRecovered = true;
  }

  let dayStartHour = DEFAULT_SETTINGS.dayStartHour;
  if (
    typeof s.dayStartHour === 'number' &&
    Number.isInteger(s.dayStartHour) &&
    s.dayStartHour >= 0 &&
    s.dayStartHour <= 23
  ) {
    dayStartHour = s.dayStartHour;
  } else {
    settingsRecovered = true;
  }

  let weekStartsOn: 0 | 1 | 6 = DEFAULT_SETTINGS.weekStartsOn;
  if (s.weekStartsOn === 0 || s.weekStartsOn === 1 || s.weekStartsOn === 6) {
    weekStartsOn = s.weekStartsOn;
  } else {
    settingsRecovered = true;
  }

  let dailyGoalMs = DEFAULT_SETTINGS.dailyGoalMs;
  if (typeof s.dailyGoalMs === 'number' && Number.isFinite(s.dailyGoalMs) && s.dailyGoalMs > 0) {
    dailyGoalMs = s.dailyGoalMs;
  } else {
    settingsRecovered = true;
  }

  let streakMinFocusMs = DEFAULT_SETTINGS.streakMinFocusMs;
  if (
    typeof s.streakMinFocusMs === 'number' &&
    Number.isFinite(s.streakMinFocusMs) &&
    s.streakMinFocusMs > 0
  ) {
    streakMinFocusMs = s.streakMinFocusMs;
  } else {
    settingsRecovered = true;
  }

  const rawP =
    typeof s.pomodoro === 'object' && s.pomodoro !== null && !Array.isArray(s.pomodoro)
      ? (s.pomodoro as Record<string, unknown>)
      : {};
  if (typeof s.pomodoro !== 'object' || s.pomodoro === null || Array.isArray(s.pomodoro)) {
    settingsRecovered = true;
  }

  let workMinutes = DEFAULT_SETTINGS.pomodoro.workMinutes;
  if (
    typeof rawP.workMinutes === 'number' &&
    Number.isFinite(rawP.workMinutes) &&
    rawP.workMinutes > 0
  ) {
    workMinutes = rawP.workMinutes;
  } else {
    settingsRecovered = true;
  }

  let shortBreakMinutes = DEFAULT_SETTINGS.pomodoro.shortBreakMinutes;
  if (
    typeof rawP.shortBreakMinutes === 'number' &&
    Number.isFinite(rawP.shortBreakMinutes) &&
    rawP.shortBreakMinutes > 0
  ) {
    shortBreakMinutes = rawP.shortBreakMinutes;
  } else {
    settingsRecovered = true;
  }

  let longBreakMinutes = DEFAULT_SETTINGS.pomodoro.longBreakMinutes;
  if (
    typeof rawP.longBreakMinutes === 'number' &&
    Number.isFinite(rawP.longBreakMinutes) &&
    rawP.longBreakMinutes > 0
  ) {
    longBreakMinutes = rawP.longBreakMinutes;
  } else {
    settingsRecovered = true;
  }

  let cyclesBeforeLongBreak = DEFAULT_SETTINGS.pomodoro.cyclesBeforeLongBreak;
  if (
    typeof rawP.cyclesBeforeLongBreak === 'number' &&
    Number.isInteger(rawP.cyclesBeforeLongBreak) &&
    rawP.cyclesBeforeLongBreak >= 1
  ) {
    cyclesBeforeLongBreak = rawP.cyclesBeforeLongBreak;
  } else {
    settingsRecovered = true;
  }

  let autoStartBreaks = DEFAULT_SETTINGS.pomodoro.autoStartBreaks;
  if (typeof rawP.autoStartBreaks === 'boolean') {
    autoStartBreaks = rawP.autoStartBreaks;
  } else {
    settingsRecovered = true;
  }

  let autoStartWork = DEFAULT_SETTINGS.pomodoro.autoStartWork;
  if (typeof rawP.autoStartWork === 'boolean') {
    autoStartWork = rawP.autoStartWork;
  } else {
    settingsRecovered = true;
  }

  const rawS =
    typeof s.sound === 'object' && s.sound !== null && !Array.isArray(s.sound)
      ? (s.sound as Record<string, unknown>)
      : {};
  if (typeof s.sound !== 'object' || s.sound === null || Array.isArray(s.sound)) {
    settingsRecovered = true;
  }

  let soundEnabled = DEFAULT_SETTINGS.sound.enabled;
  if (typeof rawS.enabled === 'boolean') {
    soundEnabled = rawS.enabled;
  } else {
    settingsRecovered = true;
  }

  let volume = DEFAULT_SETTINGS.sound.volume;
  if (
    typeof rawS.volume === 'number' &&
    Number.isFinite(rawS.volume) &&
    rawS.volume >= 0 &&
    rawS.volume <= 1
  ) {
    volume = rawS.volume;
  } else {
    settingsRecovered = true;
  }

  const rawN =
    typeof s.notifications === 'object' && s.notifications !== null && !Array.isArray(s.notifications)
      ? (s.notifications as Record<string, unknown>)
      : {};
  if (typeof s.notifications !== 'object' || s.notifications === null || Array.isArray(s.notifications)) {
    settingsRecovered = true;
  }

  let notificationsEnabled = DEFAULT_SETTINGS.notifications.enabled;
  if (typeof rawN.enabled === 'boolean') {
    notificationsEnabled = rawN.enabled;
  } else {
    settingsRecovered = true;
  }

  const settings: Settings = {
    theme,
    language,
    dayStartHour,
    weekStartsOn,
    dailyGoalMs,
    streakMinFocusMs,
    pomodoro: {
      workMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      cyclesBeforeLongBreak,
      autoStartBreaks,
      autoStartWork,
    },
    sound: {
      enabled: soundEnabled,
      volume,
    },
    notifications: {
      enabled: notificationsEnabled,
    },
  };

  return { settings, settingsRecovered };
}

function validateTask(
  item: unknown,
  dayStartHour: number,
  isV1: boolean,
  isV2: boolean
): { task: Task | null; repaired: boolean } {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return { task: null, repaired: false };
  }
  const t = item as Record<string, unknown>;

  if (typeof t.id !== 'string' || t.id.length === 0) return { task: null, repaired: false };
  if (typeof t.title !== 'string') return { task: null, repaired: false };
  if (typeof t.createdAt !== 'number' || !Number.isFinite(t.createdAt) || t.createdAt < 0)
    return { task: null, repaired: false };

  const validModes: TimerMode[] = ['stopwatch', 'countdown', 'pomodoro'];
  if (typeof t.mode !== 'string' || !validModes.includes(t.mode as TimerMode))
    return { task: null, repaired: false };

  if (t.mode === 'countdown') {
    if (typeof t.targetMs !== 'number' || !Number.isFinite(t.targetMs) || t.targetMs <= 0)
      return { task: null, repaired: false };
  } else {
    if (t.targetMs !== null) return { task: null, repaired: false };
  }

  if (t.completedAt === null && t.completedDayKey === null) {
    // ok
  } else if (
    typeof t.completedAt === 'number' &&
    Number.isFinite(t.completedAt) &&
    t.completedAt >= 0 &&
    isValidDayKey(t.completedDayKey)
  ) {
    // ok
  } else {
    return { task: null, repaired: false };
  }

  if (t.deletedAt !== null) {
    if (typeof t.deletedAt !== 'number' || !Number.isFinite(t.deletedAt) || t.deletedAt < 0) {
      return { task: null, repaired: false };
    }
  }

  if (t.categoryId !== null && typeof t.categoryId !== 'string')
    return { task: null, repaired: false };

  if (!Array.isArray(t.tags) || !t.tags.every((tag) => typeof tag === 'string'))
    return { task: null, repaired: false };

  if (t.notes !== null && typeof t.notes !== 'string')
    return { task: null, repaired: false };

  let dayKey: string;
  let repaired = false;

  if (isV1) {
    dayKey = dayKeyFromTimestamp(t.createdAt as number, dayStartHour);
  } else {
    if (isValidDayKey(t.dayKey)) {
      dayKey = t.dayKey as string;
    } else {
      dayKey = dayKeyFromTimestamp(t.createdAt as number, dayStartHour);
      repaired = true;
    }
  }

  let updatedAt: number;
  if (typeof t.updatedAt === 'number' && Number.isFinite(t.updatedAt) && t.updatedAt >= 0) {
    updatedAt = t.updatedAt;
  } else {
    updatedAt = (t.completedAt as number | null) ?? (t.createdAt as number);
    if (!isV1 && !isV2) {
      repaired = true;
    }
  }

  const task: Task = {
    id: t.id as string,
    title: t.title as string,
    createdAt: t.createdAt as number,
    updatedAt,
    dayKey,
    mode: t.mode as TimerMode,
    targetMs: t.targetMs as number | null,
    completedAt: t.completedAt as number | null,
    completedDayKey: t.completedDayKey as string | null,
    deletedAt: t.deletedAt as number | null,
    categoryId: t.categoryId as string | null,
    tags: t.tags as string[],
    notes: t.notes as string | null,
  };

  return { task, repaired };
}

function validateSession(
  item: unknown,
  dayStartHour: number
): { session: Session | null; repaired: boolean } {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) {
    return { session: null, repaired: false };
  }
  const s = item as Record<string, unknown>;

  if (typeof s.id !== 'string' || s.id.length === 0) return { session: null, repaired: false };
  if (typeof s.taskId !== 'string' || s.taskId.length === 0) return { session: null, repaired: false };

  const validKinds: SessionKind[] = [
    'stopwatch',
    'countdown',
    'pomodoro_work',
    'pomodoro_short_break',
    'pomodoro_long_break',
  ];
  if (typeof s.kind !== 'string' || !validKinds.includes(s.kind as SessionKind)) {
    return { session: null, repaired: false };
  }

  if (typeof s.startedAt !== 'number' || !Number.isFinite(s.startedAt) || s.startedAt < 0) {
    return { session: null, repaired: false };
  }

  if (typeof s.endedAt !== 'number' || !Number.isFinite(s.endedAt) || s.endedAt < 0) {
    return { session: null, repaired: false };
  }

  if (typeof s.durationMs !== 'number' || !Number.isFinite(s.durationMs) || s.durationMs < 0) {
    return { session: null, repaired: false };
  }

  if (typeof s.completed !== 'boolean') {
    return { session: null, repaired: false };
  }

  let dayKey: string = '';
  let repaired = false;

  if (isValidDayKey(s.dayKey)) {
    dayKey = s.dayKey;
  } else {
    dayKey = dayKeyFromTimestamp(s.startedAt, dayStartHour);
    repaired = true;
  }

  const session: Session = {
    id: s.id,
    taskId: s.taskId,
    kind: s.kind as SessionKind,
    startedAt: s.startedAt,
    endedAt: s.endedAt,
    durationMs: s.durationMs,
    dayKey,
    completed: s.completed,
  };

  return { session, repaired };
}

function isValidActiveTimer(item: unknown): boolean {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const t = item as Record<string, unknown>;

  if (typeof t.taskId !== 'string' || t.taskId.length === 0) return false;

  const validKinds: SessionKind[] = [
    'stopwatch',
    'countdown',
    'pomodoro_work',
    'pomodoro_short_break',
    'pomodoro_long_break',
  ];
  if (typeof t.kind !== 'string' || !validKinds.includes(t.kind as SessionKind)) return false;

  const validStatuses: TimerStatus[] = ['running', 'paused'];
  if (typeof t.status !== 'string' || !validStatuses.includes(t.status as TimerStatus)) return false;

  if (typeof t.startedAt !== 'number' || !Number.isFinite(t.startedAt) || t.startedAt < 0) return false;
  if (typeof t.accumulatedMs !== 'number' || !Number.isFinite(t.accumulatedMs) || t.accumulatedMs < 0)
    return false;

  if (t.kind === 'stopwatch') {
    if (t.targetMs !== null) return false;
  } else if (t.kind === 'countdown') {
    if (typeof t.targetMs !== 'number' || !Number.isFinite(t.targetMs) || t.targetMs <= 0) return false;
  } else {
    if (
      t.targetMs !== null &&
      (typeof t.targetMs !== 'number' || !Number.isFinite(t.targetMs) || t.targetMs <= 0)
    ) {
      return false;
    }
  }

  const isPomodoro =
    t.kind === 'pomodoro_work' ||
    t.kind === 'pomodoro_short_break' ||
    t.kind === 'pomodoro_long_break';

  if (isPomodoro) {
    if (typeof t.pomodoro !== 'object' || t.pomodoro === null || Array.isArray(t.pomodoro)) return false;
    const p = t.pomodoro as Record<string, unknown>;
    const validPhases: PomodoroPhase[] = ['work', 'short_break', 'long_break'];
    if (typeof p.phase !== 'string' || !validPhases.includes(p.phase as PomodoroPhase)) return false;
    if (
      typeof p.completedWorkCycles !== 'number' ||
      !Number.isInteger(p.completedWorkCycles) ||
      p.completedWorkCycles < 0
    ) {
      return false;
    }
  } else {
    if (t.pomodoro !== null) return false;
  }

  return true;
}
