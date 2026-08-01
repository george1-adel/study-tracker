import type { Task, Session, Settings } from '../types';
import type { DayKey } from '../time/dayKey';
import {
  dayKeyFromTimestamp,
  compareDayKeys,
  startOfWeek,
  endOfWeek,
  monthKey,
} from '../time/dayKey';
import { isFocusKind } from '../types';

export function totalFocusMs(sessions: Session[]): number {
  let total = 0;
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      total += s.durationMs;
    }
  }
  return total;
}

export function weeklyFocusMs(
  sessions: Session[],
  nowOrDayKey: number | DayKey,
  settings: Pick<Settings, 'dayStartHour' | 'weekStartsOn'>
): number {
  const anchorDayKey =
    typeof nowOrDayKey === 'number'
      ? dayKeyFromTimestamp(nowOrDayKey, settings.dayStartHour)
      : nowOrDayKey;

  const wStart = startOfWeek(anchorDayKey, settings.weekStartsOn);
  const wEnd = endOfWeek(anchorDayKey, settings.weekStartsOn);

  let total = 0;
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      if (compareDayKeys(s.dayKey, wStart) >= 0 && compareDayKeys(s.dayKey, wEnd) <= 0) {
        total += s.durationMs;
      }
    }
  }
  return total;
}

export function monthlyFocusMs(
  sessions: Session[],
  nowOrDayKey: number | DayKey,
  settings: Pick<Settings, 'dayStartHour'>
): number {
  const anchorDayKey =
    typeof nowOrDayKey === 'number'
      ? dayKeyFromTimestamp(nowOrDayKey, settings.dayStartHour)
      : nowOrDayKey;

  const targetMonth = monthKey(anchorDayKey);

  let total = 0;
  for (const s of sessions) {
    if (isFocusKind(s.kind) && monthKey(s.dayKey) === targetMonth) {
      total += s.durationMs;
    }
  }
  return total;
}

export function avgDailyFocusMs(sessions: Session[]): number {
  const focusDays = new Set<DayKey>();
  let total = 0;

  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      total += s.durationMs;
      focusDays.add(s.dayKey);
    }
  }

  if (focusDays.size === 0) {
    return 0;
  }
  return total / focusDays.size;
}

export function avgTaskCompletionMs(tasks: Task[], sessions: Session[]): number {
  const taskFocusMsMap = new Map<string, number>();
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      const current = taskFocusMsMap.get(s.taskId) ?? 0;
      taskFocusMsMap.set(s.taskId, current + s.durationMs);
    }
  }

  let completedTasksWithSessionsCount = 0;
  let totalCompletionMs = 0;

  for (const t of tasks) {
    if (t.completedAt !== null && t.deletedAt === null) {
      const focusMs = taskFocusMsMap.get(t.id) ?? 0;
      if (focusMs > 0) {
        completedTasksWithSessionsCount += 1;
        totalCompletionMs += focusMs;
      }
    }
  }

  if (completedTasksWithSessionsCount === 0) {
    return 0;
  }
  return totalCompletionMs / completedTasksWithSessionsCount;
}

export function completedTaskCount(tasks: Task[]): number {
  let count = 0;
  for (const t of tasks) {
    if (t.completedAt !== null && t.deletedAt === null) {
      count += 1;
    }
  }
  return count;
}

export function incompleteTaskCount(tasks: Task[]): number {
  let count = 0;
  for (const t of tasks) {
    if (t.completedAt === null && t.deletedAt === null) {
      count += 1;
    }
  }
  return count;
}

export function pomodoroCount(sessions: Session[]): number {
  let count = 0;
  for (const s of sessions) {
    if (s.kind === 'pomodoro_work') {
      count += 1;
    }
  }
  return count;
}

export function stopwatchCount(sessions: Session[]): number {
  let count = 0;
  for (const s of sessions) {
    if (s.kind === 'stopwatch') {
      count += 1;
    }
  }
  return count;
}

export function longestSessionMs(sessions: Session[]): number {
  let maxMs = 0;
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      if (s.durationMs > maxMs) {
        maxMs = s.durationMs;
      }
    }
  }
  return maxMs;
}

export function shortestSessionMs(sessions: Session[]): number {
  let minMs: number | null = null;
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      if (minMs === null || s.durationMs < minMs) {
        minMs = s.durationMs;
      }
    }
  }
  return minMs ?? 0;
}
