import { describe, it, expect } from 'vitest';
import { bestDay, bestWeekday, bestWeek, bestMonth } from './bests';
import { makeSession, makeSettings } from './fixtures';

describe('bests', () => {
  const settings = makeSettings({ weekStartsOn: 1 });

  describe('empty input', () => {
    it('all four functions return null on empty input', () => {
      expect(bestDay([])).toBeNull();
      expect(bestWeekday([])).toBeNull();
      expect(bestWeek([], settings)).toBeNull();
      expect(bestMonth([])).toBeNull();
    });
  });

  describe('bestWeekday mean vs total ranking', () => {
    it('ranks by mean focus time, not total (fixture where highest TOTAL weekday is not highest MEAN weekday)', () => {
      // Wednesday 2026-07-22 (index 3) and Wednesday 2026-07-29 (index 3)
      const wed1 = makeSession({ id: 'w1', dayKey: '2026-07-22', durationMs: 7_200_000 }); // 2h
      const wed2 = makeSession({ id: 'w2', dayKey: '2026-07-29', durationMs: 7_200_000 }); // 2h
      // Total Wednesday = 14_400_000 (4h), Count = 2, Mean = 7_200_000 (2h)

      // Thursday 2026-07-30 (index 4)
      const thu1 = makeSession({ id: 't1', dayKey: '2026-07-30', durationMs: 10_800_000 }); // 3h
      // Total Thursday = 10_800_000 (3h), Count = 1, Mean = 10_800_000 (3h)

      const result = bestWeekday([wed1, wed2, thu1]);

      expect(result).not.toBeNull();
      // Thursday (index 4) has lower total (10.8M vs 14.4M) but higher mean (10.8M vs 7.2M)
      expect(result?.weekday).toBe(4);
      expect(result?.meanFocusMs).toBe(10_800_000);
    });
  });

  describe('tie breaking toward most recent period', () => {
    it('bestDay tie-breaking picks most recent dayKey', () => {
      const d1 = makeSession({ id: 'd1', dayKey: '2026-08-01', durationMs: 1_000_000 });
      const d2 = makeSession({ id: 'd2', dayKey: '2026-08-02', durationMs: 1_000_000 });

      const result = bestDay([d1, d2]);
      expect(result).toEqual({ dayKey: '2026-08-02', focusMs: 1_000_000 });
    });

    it('bestWeekday tie-breaking picks weekday with most recent occurrence', () => {
      // Wed 2026-07-29 (index 3), 1000ms. Mean = 1000ms.
      const wed = makeSession({ id: 'w1', dayKey: '2026-07-29', durationMs: 1_000_000 });
      // Thu 2026-07-23 (index 4), 1000ms. Mean = 1000ms.
      const thu = makeSession({ id: 't1', dayKey: '2026-07-23', durationMs: 1_000_000 });

      const result = bestWeekday([wed, thu]);
      expect(result).toEqual({ weekday: 3, meanFocusMs: 1_000_000 });
    });

    it('bestWeek tie-breaking picks most recent week', () => {
      // Week 1: starts Mon 2026-07-20
      const w1 = makeSession({ id: 'w1', dayKey: '2026-07-21', durationMs: 1_000_000 });
      // Week 2: starts Mon 2026-07-27
      const w2 = makeSession({ id: 'w2', dayKey: '2026-07-28', durationMs: 1_000_000 });

      const result = bestWeek([w1, w2], settings);
      expect(result).toEqual({
        startDayKey: '2026-07-27',
        endDayKey: '2026-08-02',
        focusMs: 1_000_000,
      });
    });

    it('bestMonth tie-breaking picks most recent monthKey', () => {
      const m1 = makeSession({ id: 'm1', dayKey: '2026-06-15', durationMs: 1_000_000 });
      const m2 = makeSession({ id: 'm2', dayKey: '2026-07-15', durationMs: 1_000_000 });

      const result = bestMonth([m1, m2]);
      expect(result).toEqual({ monthKey: '2026-07', focusMs: 1_000_000 });
    });
  });
});
