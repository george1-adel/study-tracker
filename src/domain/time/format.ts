/**
 * Formatting Contract for Time and Durations
 *
 * - formatClock(ms): Monospace timer readout. "MM:SS" under 1 hour, "H:MM:SS" at or above 1 hour.
 *   Uses Latin digits only (no Intl), zero-padding minutes and seconds. Negative values clamp to 0.
 *   Non-finite values return "00:00".
 *
 * - formatDuration(ms, locale): Human-readable statistics summary (e.g., "2h 15m", "45m", "30s").
 *   Drops zero-valued leading units (e.g. "45m" instead of "0h 45m"). Zero returns "0m".
 *   Uses Intl.NumberFormat(locale) for numbers. Suffix letters ('h', 'm', 's') are unlocalized ASCII
 *   unit letters separated by spaces. Callers requiring localized unit labels can parse or format
 *   the numeric components directly.
 *
 * - formatDayLabel(key, locale, style): Formats a DayKey using Intl.DateTimeFormat applied to the
 *   noon timestamp. 'short' produces e.g. "Mar 14", 'long' produces e.g. "Friday, 14 March 2026".
 *
 * - formatMonthLabel(monthKey, locale): Formats a "YYYY-MM" month key (e.g. "2026-03") into e.g.
 *   "March 2026" via Intl.DateTimeFormat.
 *
 * - formatPercent(value, locale): Formats a percentage value (0-100 or null) into a percentage string
 *   (e.g., "75%"). Returns "—" for null, undefined, NaN, or non-finite values (never "NaN%").
 */

import { type DayKey, dayKeyToNoonTimestamp } from './dayKey';

const pad2 = (n: number): string => String(n).padStart(2, '0');

export function formatClock(ms: number): string {
  if (!Number.isFinite(ms)) {
    return '00:00';
  }
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  }
  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatDuration(ms: number, locale: string): string {
  const nf = new Intl.NumberFormat(locale);
  if (!Number.isFinite(ms) || ms <= 0) {
    return `${nf.format(0)}m`;
  }

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds <= 0) {
    return `${nf.format(0)}m`;
  }

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    if (m > 0) {
      return `${nf.format(h)}h ${nf.format(m)}m`;
    }
    return `${nf.format(h)}h`;
  }

  if (m > 0) {
    if (s > 0) {
      return `${nf.format(m)}m ${nf.format(s)}s`;
    }
    return `${nf.format(m)}m`;
  }

  return `${nf.format(s)}s`;
}

export function formatDayLabel(key: DayKey, locale: string, style: 'short' | 'long'): string {
  const noonTs = dayKeyToNoonTimestamp(key);
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'short', day: 'numeric' }
      : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(noonTs);
}

export function formatMonthLabel(monthKeyStr: string, locale: string): string {
  const [yStr = '', mStr = ''] = monthKeyStr.split('-');
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10);
  const noonTs = new Date(year, month - 1, 15, 12, 0, 0, 0).getTime();
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(noonTs);
}

export function formatPercent(value: number | null, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  return `${nf.format(value)}%`;
}
