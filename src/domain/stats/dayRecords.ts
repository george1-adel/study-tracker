import type { Task, Session, Settings } from '../types';
import type { DayKey } from '../time/dayKey';
import { dayKeyFromTimestamp, compareDayKeys } from '../time/dayKey';
import { isFocusKind } from '../types';

export interface DayRecord {
  dayKey: DayKey;
  focusMs: number;
  breakMs: number;
  completedTasks: number;
  unfinishedTasks: number;
  sessionsCompleted: number;
  pomodoroSessions: number;
  stopwatchSessions: number;
  productivityPct: number;
}

export function buildDayRecords(
  tasks: Task[],
  sessions: Session[],
  settings: Pick<Settings, 'dailyGoalMs' | 'dayStartHour'>
): DayRecord[] {
  const activeDayKeys = new Set<DayKey>();

  for (const s of sessions) {
    activeDayKeys.add(s.dayKey);
  }

  for (const t of tasks) {
    if (t.deletedAt === null && t.completedDayKey !== null) {
      activeDayKeys.add(t.completedDayKey);
    }
  }

  if (activeDayKeys.size === 0) {
    return [];
  }

  const sortedDayKeys = Array.from(activeDayKeys).sort(compareDayKeys);

  const sessionsByDay = new Map<DayKey, Session[]>();
  for (const s of sessions) {
    let daySessions = sessionsByDay.get(s.dayKey);
    if (!daySessions) {
      daySessions = [];
      sessionsByDay.set(s.dayKey, daySessions);
    }
    daySessions.push(s);
  }

  return sortedDayKeys.map((dayKey) => {
    const daySessions = sessionsByDay.get(dayKey) ?? [];
    return getDayRecordFromGrouped(tasks, daySessions, settings, dayKey);
  });
}

export function getDayRecord(
  tasks: Task[],
  sessions: Session[],
  settings: Pick<Settings, 'dailyGoalMs' | 'dayStartHour'>,
  dayKey: DayKey
): DayRecord {
  const daySessions = sessions.filter((s) => s.dayKey === dayKey);
  return getDayRecordFromGrouped(tasks, daySessions, settings, dayKey);
}

function getDayRecordFromGrouped(
  tasks: Task[],
  daySessions: Session[],
  settings: Pick<Settings, 'dailyGoalMs' | 'dayStartHour'>,
  dayKey: DayKey
): DayRecord {
  let focusMs = 0;
  let breakMs = 0;
  let sessionsCompleted = 0;
  let pomodoroSessions = 0;
  let stopwatchSessions = 0;

  for (const s of daySessions) {
    if (isFocusKind(s.kind)) {
      focusMs += s.durationMs;
    } else {
      breakMs += s.durationMs;
    }
    if (s.completed) {
      sessionsCompleted += 1;
    }
    if (s.kind === 'pomodoro_work') {
      pomodoroSessions += 1;
    } else if (s.kind === 'stopwatch') {
      stopwatchSessions += 1;
    }
  }

  let completedTasks = 0;
  let unfinishedTasks = 0;

  for (const t of tasks) {
    if (t.deletedAt !== null) {
      continue;
    }
    if (t.completedDayKey === dayKey) {
      completedTasks += 1;
    }

    const createdDayKey = dayKeyFromTimestamp(t.createdAt, settings.dayStartHour);
    const wasCreatedOnOrBefore = compareDayKeys(createdDayKey, dayKey) <= 0;
    const wasNotCompletedOnOrBefore =
      t.completedDayKey === null || compareDayKeys(t.completedDayKey, dayKey) > 0;

    if (wasCreatedOnOrBefore && wasNotCompletedOnOrBefore) {
      unfinishedTasks += 1;
    }
  }

  let productivityPct = 0;
  if (settings.dailyGoalMs > 0) {
    productivityPct = Math.min(100, Math.round((focusMs / settings.dailyGoalMs) * 100));
  }

  return {
    dayKey,
    focusMs,
    breakMs,
    completedTasks,
    unfinishedTasks,
    sessionsCompleted,
    pomodoroSessions,
    stopwatchSessions,
    productivityPct,
  };
}

export function taskCompletionRatio(
  record: Pick<DayRecord, 'completedTasks' | 'unfinishedTasks'>
): number | null {
  const denominator = record.completedTasks + record.unfinishedTasks;
  if (denominator <= 0) {
    return null;
  }
  return record.completedTasks / denominator;
}
