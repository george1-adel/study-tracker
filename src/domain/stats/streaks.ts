import type { Session, Settings, DayKey } from '../types';
import { isFocusKind } from '../types';
import { compareDayKeys, diffDays, addDays, dayKeyFromTimestamp } from '../time/dayKey';

export interface StreakRun {
  startDay: DayKey;
  endDay: DayKey;
  length: number;
}

export interface StreakSummary {
  current: number;
  state: 'active' | 'at_risk' | 'broken';
  longest: number;
  totalDays: number;
  history: StreakRun[];
}

export function countingDays(sessions: Session[], settings: Settings): DayKey[] {
  const map = new Map<DayKey, number>();
  for (const session of sessions) {
    if (isFocusKind(session.kind)) {
      const current = map.get(session.dayKey) ?? 0;
      map.set(session.dayKey, current + session.durationMs);
    }
  }

  const result: DayKey[] = [];
  for (const [dayKey, focusMs] of map.entries()) {
    if (focusMs >= settings.streakMinFocusMs) {
      result.push(dayKey);
    }
  }

  result.sort(compareDayKeys);
  return result;
}

export function streakRuns(cDays: DayKey[]): StreakRun[] {
  if (cDays.length === 0) {
    return [];
  }

  const runs: StreakRun[] = [];
  let startDay = cDays[0]!;
  let endDay = cDays[0]!;
  let length = 1;

  for (let i = 1; i < cDays.length; i++) {
    const current = cDays[i]!;
    if (diffDays(endDay, current) === 1) {
      endDay = current;
      length++;
    } else {
      runs.push({ startDay, endDay, length });
      startDay = current;
      endDay = current;
      length = 1;
    }
  }

  runs.push({ startDay, endDay, length });

  runs.reverse();
  return runs;
}

export function streakSummary(sessions: Session[], settings: Settings, now: number): StreakSummary {
  const cDays = countingDays(sessions, settings);
  const runs = streakRuns(cDays);

  if (cDays.length === 0) {
    return {
      current: 0,
      state: 'broken',
      longest: 0,
      totalDays: 0,
      history: [],
    };
  }

  const today = dayKeyFromTimestamp(now, settings.dayStartHour);
  const yesterday = addDays(today, -1);

  const cSet = new Set(cDays);

  let current = 0;
  let state: 'active' | 'at_risk' | 'broken';

  if (cSet.has(today)) {
    state = 'active';
    let check = today;
    while (cSet.has(check)) {
      current++;
      check = addDays(check, -1);
    }
  } else if (cSet.has(yesterday)) {
    state = 'at_risk';
    let check = yesterday;
    while (cSet.has(check)) {
      current++;
      check = addDays(check, -1);
    }
  } else {
    state = 'broken';
    current = 0;
  }

  const longest = runs.length > 0 ? Math.max(...runs.map((r) => r.length)) : 0;
  const totalDays = cDays.length;

  return {
    current,
    state,
    longest,
    totalDays,
    history: runs,
  };
}
