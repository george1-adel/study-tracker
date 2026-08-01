declare const process: { env: Record<string, string> };
process.env.TZ = 'Europe/Berlin';

import { describe, expect, it } from 'vitest';
import {
  addDays,
  dayKeyFromTimestamp,
  dayKeyToNoonTimestamp,
  diffDays,
  endOfWeek,
  enumerateDays,
  isValidDayKey,
  startOfWeek,
} from './dayKey';

describe('dayKey (Europe/Berlin timezone)', () => {
  it('3-year round trip property test under Europe/Berlin DST', () => {
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

  it('diffDays over DST transition in Europe/Berlin is exact calendar day count', () => {
    // Berlin 2026 spring forward: Sunday, Mar 29, 2026 (02:00 -> 03:00)
    expect(diffDays('2026-03-28', '2026-03-29')).toBe(1);
    expect(diffDays('2026-03-29', '2026-03-28')).toBe(-1);

    // Berlin 2026 fall back: Sunday, Oct 25, 2026 (03:00 -> 02:00)
    expect(diffDays('2026-10-24', '2026-10-25')).toBe(1);
    expect(diffDays('2026-10-25', '2026-10-24')).toBe(-1);
  });

  it('dayStartHour = 4 in Europe/Berlin on a standard day', () => {
    const ts0130 = new Date(2026, 2, 15, 1, 30, 0, 0).getTime();
    const ts0359 = new Date(2026, 2, 15, 3, 59, 59, 0).getTime();
    const ts0400 = new Date(2026, 2, 15, 4, 0, 0, 0).getTime();

    expect(dayKeyFromTimestamp(ts0130, 4)).toBe('2026-03-14');
    expect(dayKeyFromTimestamp(ts0359, 4)).toBe('2026-03-14');
    expect(dayKeyFromTimestamp(ts0400, 4)).toBe('2026-03-15');
  });

  it('startOfWeek and endOfWeek under Europe/Berlin', () => {
    expect(startOfWeek('2026-03-29', 1)).toBe('2026-03-23');
    expect(endOfWeek('2026-03-29', 1)).toBe('2026-03-29');
  });

  it('enumerateDays and isValidDayKey under Europe/Berlin', () => {
    expect(enumerateDays('2026-03-28', '2026-03-30')).toEqual([
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
    ]);
    expect(isValidDayKey('2026-03-29')).toBe(true);
  });
});
