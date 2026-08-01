declare const process: { env: Record<string, string> };
process.env.TZ = 'Africa/Cairo';

import { describe, expect, it } from 'vitest';
import {
  formatClock,
  formatDayLabel,
  formatDuration,
  formatMonthLabel,
  formatPercent,
} from './format';

describe('format module', () => {
  describe('formatClock', () => {
    it('formats 0ms as "00:00"', () => {
      expect(formatClock(0)).toBe('00:00');
    });

    it('formats 999ms as "00:00"', () => {
      expect(formatClock(999)).toBe('00:00');
    });

    it('formats 59s (59,000ms) as "00:59"', () => {
      expect(formatClock(59_000)).toBe('00:59');
    });

    it('formats 60s (60,000ms) as "01:00"', () => {
      expect(formatClock(60_000)).toBe('01:00');
    });

    it('formats 3599s (3,599,000ms) as "59:59"', () => {
      expect(formatClock(3_599_000)).toBe('59:59');
    });

    it('formats 3600s (3,600,000ms) as "1:00:00"', () => {
      expect(formatClock(3_600_000)).toBe('1:00:00');
    });

    it('formats 86399s (86,399,000ms) as "23:59:59"', () => {
      expect(formatClock(86_399_000)).toBe('23:59:59');
    });

    it('clamps negative input to 0 ("00:00")', () => {
      expect(formatClock(-1000)).toBe('00:00');
    });

    it('returns "00:00" for non-finite inputs (NaN, Infinity)', () => {
      expect(formatClock(NaN)).toBe('00:00');
      expect(formatClock(Infinity)).toBe('00:00');
      expect(formatClock(-Infinity)).toBe('00:00');
    });
  });

  describe('formatDuration', () => {
    it('formats zero duration as "0m"', () => {
      expect(formatDuration(0, 'en')).toBe('0m');
      expect(formatDuration(0, 'ar-u-nu-latn')).toBe('0m');
      expect(formatDuration(-500, 'en')).toBe('0m');
    });

    it('formats sub-minute durations (e.g. 30s)', () => {
      expect(formatDuration(30_000, 'en')).toBe('30s');
      expect(formatDuration(30_000, 'ar-u-nu-latn')).toBe('30s');
    });

    it('formats exact hour durations (e.g. 1h)', () => {
      expect(formatDuration(3_600_000, 'en')).toBe('1h');
      expect(formatDuration(3_600_000, 'ar-u-nu-latn')).toBe('1h');
    });

    it('formats multi-hour durations (e.g. 2h 15m)', () => {
      const ms = 2 * 3_600_000 + 15 * 60_000;
      expect(formatDuration(ms, 'en')).toBe('2h 15m');
      expect(formatDuration(ms, 'ar-u-nu-latn')).toBe('2h 15m');
    });

    it('formats exact minute durations without seconds (e.g. 45m)', () => {
      expect(formatDuration(45 * 60_000, 'en')).toBe('45m');
    });
  });

  describe('formatPercent', () => {
    it('returns "—" for null, undefined, NaN, and Infinity', () => {
      expect(formatPercent(null, 'en')).toBe('—');
      expect(formatPercent(undefined as unknown as null, 'en')).toBe('—');
      expect(formatPercent(NaN, 'en')).toBe('—');
      expect(formatPercent(Infinity, 'en')).toBe('—');
      expect(formatPercent(-Infinity, 'en')).toBe('—');
    });

    it('formats numeric percentage values properly', () => {
      expect(formatPercent(75, 'en')).toBe('75%');
      expect(formatPercent(0, 'en')).toBe('0%');
      expect(formatPercent(75.5, 'en')).toBe('75.5%');
      expect(formatPercent(75, 'ar-u-nu-latn')).toBe('75%');
    });
  });

  describe('formatDayLabel', () => {
    it('formats short and long day labels', () => {
      const key = '2026-03-14';
      expect(formatDayLabel(key, 'en', 'short')).toBe('Mar 14');
      const longEn = formatDayLabel(key, 'en', 'long');
      expect(longEn).toContain('Saturday');
      expect(longEn).toContain('14');
      expect(longEn).toContain('March');
      expect(longEn).toContain('2026');
    });
  });

  describe('formatMonthLabel', () => {
    it('formats month key into localized month label', () => {
      expect(formatMonthLabel('2026-03', 'en')).toBe('March 2026');
      expect(formatMonthLabel('2026-03', 'ar-u-nu-latn')).toBe('مارس 2026');
    });
  });
});
