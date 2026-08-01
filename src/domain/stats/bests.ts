import type { Session, Settings } from '../types';
import type { DayKey } from '../time/dayKey';
import { compareDayKeys, weekdayIndex, startOfWeek, endOfWeek, monthKey } from '../time/dayKey';
import { isFocusKind } from '../types';

export interface BestDayResult {
  dayKey: DayKey;
  focusMs: number;
}

export interface BestWeekdayResult {
  weekday: number;
  meanFocusMs: number;
}

export interface BestWeekResult {
  startDayKey: DayKey;
  endDayKey: DayKey;
  focusMs: number;
}

export interface BestMonthResult {
  monthKey: string;
  focusMs: number;
}

export function bestDay(sessions: Session[]): BestDayResult | null {
  const focusByDay = new Map<DayKey, number>();
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      const current = focusByDay.get(s.dayKey) ?? 0;
      focusByDay.set(s.dayKey, current + s.durationMs);
    }
  }

  if (focusByDay.size === 0) {
    return null;
  }

  let best: BestDayResult | null = null;

  for (const [dayKey, focusMs] of focusByDay.entries()) {
    if (focusMs <= 0) continue;
    if (
      best === null ||
      focusMs > best.focusMs ||
      (focusMs === best.focusMs && compareDayKeys(dayKey, best.dayKey) > 0)
    ) {
      best = { dayKey, focusMs };
    }
  }

  return best;
}

export function bestWeekday(sessions: Session[]): BestWeekdayResult | null {
  const focusByDayKey = new Map<DayKey, number>();
  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      const current = focusByDayKey.get(s.dayKey) ?? 0;
      focusByDayKey.set(s.dayKey, current + s.durationMs);
    }
  }

  if (focusByDayKey.size === 0) {
    return null;
  }

  const weekdayStats = new Map<
    number,
    { sumFocusMs: number; dayCount: number; maxDayKey: DayKey }
  >();

  for (const [dayKey, focusMs] of focusByDayKey.entries()) {
    if (focusMs <= 0) continue;
    const w = weekdayIndex(dayKey);
    const existing = weekdayStats.get(w);
    if (!existing) {
      weekdayStats.set(w, {
        sumFocusMs: focusMs,
        dayCount: 1,
        maxDayKey: dayKey,
      });
    } else {
      existing.sumFocusMs += focusMs;
      existing.dayCount += 1;
      if (compareDayKeys(dayKey, existing.maxDayKey) > 0) {
        existing.maxDayKey = dayKey;
      }
    }
  }

  if (weekdayStats.size === 0) {
    return null;
  }

  let best: { weekday: number; meanFocusMs: number; maxDayKey: DayKey } | null = null;

  for (const [w, stats] of weekdayStats.entries()) {
    const meanFocusMs = stats.sumFocusMs / stats.dayCount;
    if (
      best === null ||
      meanFocusMs > best.meanFocusMs ||
      (meanFocusMs === best.meanFocusMs && compareDayKeys(stats.maxDayKey, best.maxDayKey) > 0)
    ) {
      best = { weekday: w, meanFocusMs, maxDayKey: stats.maxDayKey };
    }
  }

  return best ? { weekday: best.weekday, meanFocusMs: best.meanFocusMs } : null;
}

export function bestWeek(
  sessions: Session[],
  settings: Pick<Settings, 'weekStartsOn'>
): BestWeekResult | null {
  const focusByWeek = new Map<DayKey, number>();

  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      const wStart = startOfWeek(s.dayKey, settings.weekStartsOn);
      const current = focusByWeek.get(wStart) ?? 0;
      focusByWeek.set(wStart, current + s.durationMs);
    }
  }

  if (focusByWeek.size === 0) {
    return null;
  }

  let best: BestWeekResult | null = null;

  for (const [startDayKey, focusMs] of focusByWeek.entries()) {
    if (focusMs <= 0) continue;
    if (
      best === null ||
      focusMs > best.focusMs ||
      (focusMs === best.focusMs && compareDayKeys(startDayKey, best.startDayKey) > 0)
    ) {
      const endDayKey = endOfWeek(startDayKey, settings.weekStartsOn);
      best = { startDayKey, endDayKey, focusMs };
    }
  }

  return best;
}

export function bestMonth(sessions: Session[]): BestMonthResult | null {
  const focusByMonth = new Map<string, number>();

  for (const s of sessions) {
    if (isFocusKind(s.kind)) {
      const mKey = monthKey(s.dayKey);
      const current = focusByMonth.get(mKey) ?? 0;
      focusByMonth.set(mKey, current + s.durationMs);
    }
  }

  if (focusByMonth.size === 0) {
    return null;
  }

  let best: BestMonthResult | null = null;

  for (const [mKey, focusMs] of focusByMonth.entries()) {
    if (focusMs <= 0) continue;
    if (
      best === null ||
      focusMs > best.focusMs ||
      (focusMs === best.focusMs && mKey > best.monthKey)
    ) {
      best = { monthKey: mKey, focusMs };
    }
  }

  return best;
}
