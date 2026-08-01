declare const process: { env: Record<string, string> };
process.env.TZ = 'Africa/Cairo';

import { describe, expect, it } from 'vitest';
import {
  addDays,
  compareDayKeys,
  dayKeyFromTimestamp,
  dayKeyToNoonTimestamp,
  diffDays,
  endOfMonth,
  endOfWeek,
  enumerateDays,
  isValidDayKey,
  monthKey,
  parseDayKey,
  startOfMonth,
  startOfWeek,
  weekdayIndex,
} from './dayKey';

describe('dayKey (Africa/Cairo timezone)', () => {
  it('3-year round trip property test under Africa/Cairo DST', () => {
    // 2025-01-01 to 2027-12-31 (1095 days)
    let currentKey = '2025-01-01';
    for (let i = 0; i < 1095; i++) {
      const noonTs = dayKeyToNoonTimestamp(currentKey);
      const roundTripped = dayKeyFromTimestamp(noonTs, 0);
      expect(roundTripped).toBe(currentKey);

      const nextKey = addDays(currentKey, 1);
      const backKey = addDays(nextKey, -1);
      expect(backKey).toBe(currentKey);

      currentKey = nextKey;
    }
  });

  it('diffDays over DST transition in Africa/Cairo is exact calendar day count', () => {
    // Egypt 2026 spring forward: midnight transition in April 2026
    expect(diffDays('2026-04-23', '2026-04-24')).toBe(1);
    expect(diffDays('2026-04-24', '2026-04-23')).toBe(-1);

    // Egypt 2026 fall back: midnight transition in October 2026
    expect(diffDays('2026-10-29', '2026-10-30')).toBe(1);
    expect(diffDays('2026-10-30', '2026-10-29')).toBe(-1);
  });

  it('timestamps at 23:59:59 and 00:00:01 the next day get different day keys', () => {
    const nightTs = new Date(2026, 2, 14, 23, 59, 59, 0).getTime();
    const morningTs = new Date(2026, 2, 15, 0, 0, 1, 0).getTime();

    const keyNight = dayKeyFromTimestamp(nightTs, 0);
    const keyMorning = dayKeyFromTimestamp(morningTs, 0);

    expect(keyNight).toBe('2026-03-14');
    expect(keyMorning).toBe('2026-03-15');
    expect(keyNight).not.toBe(keyMorning);
  });

  it('dayStartHour = 4 shifts the day boundary correctly', () => {
    const ts0130 = new Date(2026, 2, 15, 1, 30, 0, 0).getTime();
    const ts0359 = new Date(2026, 2, 15, 3, 59, 59, 0).getTime();
    const ts0400 = new Date(2026, 2, 15, 4, 0, 0, 0).getTime();

    expect(dayKeyFromTimestamp(ts0130, 4)).toBe('2026-03-14');
    expect(dayKeyFromTimestamp(ts0359, 4)).toBe('2026-03-14');
    expect(dayKeyFromTimestamp(ts0400, 4)).toBe('2026-03-15');
  });

  it('handles year boundary transition', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
  });

  it('handles leap year transition correctly', () => {
    // 2028 is a leap year
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');

    // 2027 is NOT a leap year
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });

  it('startOfWeek and endOfWeek for all weekStartsOn options', () => {
    // 2026-03-15 is Sunday (weekdayIndex 0)
    // 2026-03-16 is Monday (weekdayIndex 1)
    // 2026-03-14 is Saturday (weekdayIndex 6)
    expect(weekdayIndex('2026-03-15')).toBe(0);

    // weekStartsOn = 0 (Sunday)
    expect(startOfWeek('2026-03-15', 0)).toBe('2026-03-15');
    expect(endOfWeek('2026-03-15', 0)).toBe('2026-03-21');

    // weekStartsOn = 1 (Monday)
    expect(startOfWeek('2026-03-15', 1)).toBe('2026-03-09');
    expect(endOfWeek('2026-03-15', 1)).toBe('2026-03-15');
    expect(startOfWeek('2026-03-16', 1)).toBe('2026-03-16');
    expect(endOfWeek('2026-03-16', 1)).toBe('2026-03-22');

    // weekStartsOn = 6 (Saturday)
    expect(startOfWeek('2026-03-14', 6)).toBe('2026-03-14');
    expect(endOfWeek('2026-03-14', 6)).toBe('2026-03-20');
    expect(startOfWeek('2026-03-15', 6)).toBe('2026-03-14');
    expect(endOfWeek('2026-03-15', 6)).toBe('2026-03-20');
  });

  it('startOfMonth and endOfMonth for 28-, 29-, 30-, and 31-day months', () => {
    // 28-day month (Feb 2027)
    expect(startOfMonth('2027-02-15')).toBe('2027-02-01');
    expect(endOfMonth('2027-02-15')).toBe('2027-02-28');

    // 29-day month (Feb 2028)
    expect(startOfMonth('2028-02-10')).toBe('2028-02-01');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');

    // 30-day month (Apr 2026)
    expect(startOfMonth('2026-04-18')).toBe('2026-04-01');
    expect(endOfMonth('2026-04-18')).toBe('2026-04-30');

    // 31-day month (Mar 2026)
    expect(startOfMonth('2026-03-14')).toBe('2026-03-01');
    expect(endOfMonth('2026-03-14')).toBe('2026-03-31');
  });

  it('enumerateDays handles inclusive range, single-day, and reversed range', () => {
    expect(enumerateDays('2026-03-01', '2026-03-03')).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
    ]);
    expect(enumerateDays('2026-03-14', '2026-03-14')).toEqual(['2026-03-14']);
    expect(enumerateDays('2026-03-15', '2026-03-14')).toEqual([]);
  });

  it('isValidDayKey validates shape and real-calendar validity', () => {
    expect(isValidDayKey('2026-03-14')).toBe(true);
    expect(isValidDayKey('2028-02-29')).toBe(true);

    expect(isValidDayKey('2026-02-30')).toBe(false);
    expect(isValidDayKey('2026-13-01')).toBe(false);
    expect(isValidDayKey('26-01-01')).toBe(false);
    expect(isValidDayKey('')).toBe(false);
    expect(isValidDayKey(null)).toBe(false);
    expect(isValidDayKey(12345)).toBe(false);
    expect(isValidDayKey('2027-02-29')).toBe(false);
  });

  it('compareDayKeys and parseDayKey and monthKey work properly', () => {
    expect(compareDayKeys('2026-03-14', '2026-03-15')).toBe(-1);
    expect(compareDayKeys('2026-03-15', '2026-03-14')).toBe(1);
    expect(compareDayKeys('2026-03-14', '2026-03-14')).toBe(0);

    expect(parseDayKey('2026-03-14')).toEqual({ year: 2026, month: 3, day: 14 });
    expect(monthKey('2026-03-14')).toBe('2026-03');
  });
});
