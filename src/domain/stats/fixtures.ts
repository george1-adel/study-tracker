import type { Task, Session, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { dayKeyFromTimestamp } from '../time/dayKey';

export function makeTask(overrides: Partial<Task> = {}): Task {
  const createdAt = overrides.createdAt ?? 1_700_000_000_000;
  const completedAt = overrides.completedAt ?? null;
  const updatedAt = overrides.updatedAt ?? (completedAt ?? createdAt);
  return {
    id: 'task-1',
    title: 'Test Task',
    createdAt,
    updatedAt,
    dayKey: overrides.dayKey ?? dayKeyFromTimestamp(createdAt, 0),
    mode: 'stopwatch',
    targetMs: null,
    completedAt,
    completedDayKey: null,
    deletedAt: null,
    categoryId: null,
    tags: [],
    notes: null,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  const startedAt = overrides.startedAt ?? 1_700_000_000_000;
  const durationMs = overrides.durationMs ?? 1_800_000; // 30m
  const endedAt = overrides.endedAt ?? startedAt + durationMs;
  const dayKey = overrides.dayKey ?? dayKeyFromTimestamp(startedAt, 0);

  return {
    id: 'session-1',
    taskId: 'task-1',
    kind: 'stopwatch',
    startedAt,
    endedAt,
    durationMs,
    dayKey,
    completed: true,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    pomodoro: { ...DEFAULT_SETTINGS.pomodoro },
    sound: { ...DEFAULT_SETTINGS.sound },
    notifications: { ...DEFAULT_SETTINGS.notifications },
    ...overrides,
  };
}
