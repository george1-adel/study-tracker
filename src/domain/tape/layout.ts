import type { Session, SessionKind } from '../types';
import type { DayKey } from '../time/dayKey';
import { isFocusKind } from '../types';
import {
  dayKeyToNoonTimestamp,
  enumerateDays,
  compareDayKeys,
  startOfMonth,
  endOfMonth,
} from '../time/dayKey';
import { formatDuration } from '../time/format';
import { t, type Language } from '../../i18n';

/**
 * Minimum visible block width as a fraction of the lane width (0..1).
 * Equals 0.003 (~4.3 minutes of 24h) to ensure short sessions stay visible.
 */
export const MIN_VISIBLE_WIDTH_FRAC = 0.003;

export interface TapeBlock {
  sessionId?: string;
  kind: SessionKind;
  startFrac: number;
  widthFrac: number;
  isFocus: boolean;
  startedAt?: number;
  endedAt?: number;
  durationMs?: number;
  tooltip?: string;
}

export interface MonthLane {
  dayKey: DayKey;
  blocks: TapeBlock[];
}

export interface YearDayIntensity {
  dayKey: DayKey;
  intensity: number | null;
  focusMs: number;
}

/**
 * Formats a local timestamp as HH:MM with Latin digits.
 */
export function formatClockTime(ts: number, locale: Language = 'en'): string {
  const loc = locale === 'ar' ? 'ar-u-nu-latn' : locale;
  return new Intl.DateTimeFormat(loc, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(ts);
}

/**
 * Formats a block tooltip reading as localized duration and clock range.
 * E.g. "Focus - 40m, 01:30 to 02:10" or "تركيز - 40m، 01:30 إلى 02:10"
 */
export function formatBlockTooltip(
  kind: SessionKind,
  startedAt: number,
  endedAt: number,
  locale: Language = 'en'
): string {
  const isFocus = isFocusKind(kind);
  const kindStr = t(isFocus ? 'tape.kindFocus' : 'tape.kindBreak', undefined, locale);
  const durationMs = Math.max(0, endedAt - startedAt);
  const durationStr = formatDuration(durationMs, locale === 'ar' ? 'ar-u-nu-latn' : locale);
  const startStr = formatClockTime(startedAt, locale);
  const endStr = formatClockTime(endedAt, locale);

  return t(
    'tape.blockTooltip',
    {
      kind: kindStr,
      duration: durationStr,
      start: startStr,
      end: endStr,
    },
    locale
  );
}

/**
 * Calculates lane start and end timestamps for a dayKey given a dayStartHour.
 */
export function getLaneBounds(dayKey: DayKey, dayStartHour: number): { laneStartMs: number; laneEndMs: number } {
  const noonTs = dayKeyToNoonTimestamp(dayKey);
  const laneStartMs = noonTs - (12 - dayStartHour) * 3600_000;
  const laneEndMs = laneStartMs + 24 * 3600_000;
  return { laneStartMs, laneEndMs };
}

/**
 * Builds the blocks for a single 24-hour day lane.
 */
export function buildDayLane(
  sessions: Session[],
  dayKey: DayKey,
  dayStartHour: number
): TapeBlock[] {
  const { laneStartMs, laneEndMs } = getLaneBounds(dayKey, dayStartHour);
  const laneDurationMs = 24 * 3600_000;

  // Filter sessions that start in this day lane window
  const daySessions = sessions
    .filter((s) => s.startedAt >= laneStartMs && s.startedAt < laneEndMs)
    .sort((a, b) => a.startedAt - b.startedAt || a.endedAt - b.endedAt);

  return daySessions.map((s) => {
    const rawStartFrac = (s.startedAt - laneStartMs) / laneDurationMs;
    const startFrac = Math.min(1, Math.max(0, rawStartFrac));

    const effectiveEnd = Math.min(s.endedAt, laneEndMs);
    const rawWidthFrac = (effectiveEnd - s.startedAt) / laneDurationMs;

    let widthFrac = Math.max(rawWidthFrac, MIN_VISIBLE_WIDTH_FRAC);
    if (startFrac + widthFrac > 1) {
      widthFrac = Math.max(0, 1 - startFrac);
    }

    return {
      sessionId: s.id,
      kind: s.kind,
      startFrac,
      widthFrac,
      isFocus: isFocusKind(s.kind),
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      durationMs: s.endedAt - s.startedAt,
    };
  });
}

/**
 * Builds day lanes for every day in a given month.
 */
export function buildMonthLanes(
  sessions: Session[],
  monthKeyStr: string,
  dayStartHour: number,
  weekStartsOn: 0 | 1 | 6 = 1
): MonthLane[] {
  void weekStartsOn;
  const firstDay = monthKeyStr.length === 7 ? `${monthKeyStr}-01` : monthKeyStr;
  const firstDayKey = startOfMonth(firstDay);
  const lastDayKey = endOfMonth(firstDayKey);
  const days = enumerateDays(firstDayKey, lastDayKey);

  return days.map((dayKey) => ({
    dayKey,
    blocks: buildDayLane(sessions, dayKey, dayStartHour),
  }));
}

/**
 * Builds year intensity (0..1 fraction against max focus time) for days in a date range.
 * Empty days (no focus sessions / 0 focus duration) return intensity: null.
 */
export function buildYearIntensity(
  sessions: Session[],
  fromDayKey: DayKey,
  toDayKey: DayKey,
  dayStartHour: number
): YearDayIntensity[] {
  if (compareDayKeys(fromDayKey, toDayKey) > 0) {
    return [];
  }
  const days = enumerateDays(fromDayKey, toDayKey);
  if (days.length === 0) {
    return [];
  }

  const laneDurationMs = 24 * 3600_000;
  const dayFocusList = days.map((dayKey) => {
    const blocks = buildDayLane(sessions, dayKey, dayStartHour);
    let focusMs = 0;
    for (const b of blocks) {
      if (b.isFocus) {
        focusMs += b.widthFrac * laneDurationMs;
      }
    }
    return { dayKey, focusMs };
  });

  const maxFocusMs = Math.max(0, ...dayFocusList.map((d) => d.focusMs));

  return dayFocusList.map(({ dayKey, focusMs }) => {
    let intensity: number | null = null;
    if (focusMs > 0 && maxFocusMs > 0) {
      intensity = focusMs / maxFocusMs;
      intensity = Math.min(1, Math.max(0, intensity));
    }
    return {
      dayKey,
      intensity,
      focusMs,
    };
  });
}
