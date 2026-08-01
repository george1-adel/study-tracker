import { describe, it, expect } from 'vitest';
import {
  totalFocusMs,
  weeklyFocusMs,
  monthlyFocusMs,
  avgDailyFocusMs,
  avgTaskCompletionMs,
  completedTaskCount,
  incompleteTaskCount,
  pomodoroCount,
  stopwatchCount,
  longestSessionMs,
  shortestSessionMs,
} from './totals';
import { makeTask, makeSession, makeSettings } from './fixtures';

describe('totals', () => {
  const settings = makeSettings({ weekStartsOn: 1, dayStartHour: 0 });

  describe('empty input for every exported function', () => {
    it('returns exact 0 and Number.isFinite on empty input', () => {
      const results = [
        totalFocusMs([]),
        weeklyFocusMs([], '2026-08-01', settings),
        monthlyFocusMs([], '2026-08-01', settings),
        avgDailyFocusMs([]),
        avgTaskCompletionMs([], []),
        completedTaskCount([]),
        incompleteTaskCount([]),
        pomodoroCount([]),
        stopwatchCount([]),
        longestSessionMs([]),
        shortestSessionMs([]),
      ];

      for (const val of results) {
        expect(val).toBe(0);
        expect(Number.isFinite(val)).toBe(true);
      }
    });
  });

  describe('soft-deleted tasks', () => {
    it('sessions of soft-deleted task contribute to focusMs but task is excluded from completedTaskCount', () => {
      const deletedTask = makeTask({
        id: 't-deleted',
        completedAt: 1_700_000_000_000,
        completedDayKey: '2026-08-01',
        deletedAt: 1_700_000_000_100,
      });
      const session = makeSession({
        taskId: 't-deleted',
        kind: 'stopwatch',
        durationMs: 1_800_000,
        dayKey: '2026-08-01',
      });

      expect(totalFocusMs([session])).toBe(1_800_000);
      expect(completedTaskCount([deletedTask])).toBe(0);
      expect(incompleteTaskCount([deletedTask])).toBe(0);
    });
  });

  describe('avgDailyFocusMs', () => {
    it('divides by days WITH focus, not by calendar days elapsed', () => {
      const s1 = makeSession({ id: 's1', dayKey: '2026-08-01', durationMs: 7_200_000 }); // 2h
      const sBreak = makeSession({ id: 's2', kind: 'pomodoro_short_break', dayKey: '2026-08-02', durationMs: 300_000 }); // break on day 2
      const s3 = makeSession({ id: 's3', dayKey: '2026-08-03', durationMs: 14_400_000 }); // 4h

      // Days with focus: 2 (2026-08-01 and 2026-08-03). Total focus = 6h = 21_600_000.
      // Average = 21_600_000 / 2 = 10_800_000 (3h), NOT divided by 3 calendar days.
      expect(avgDailyFocusMs([s1, sBreak, s3])).toBe(10_800_000);
    });
  });

  describe('avgTaskCompletionMs', () => {
    it('excludes completed tasks that have no sessions', () => {
      const taskWithSession = makeTask({
        id: 't1',
        completedAt: 1_700_000_000_000,
        completedDayKey: '2026-08-01',
      });
      const taskWithoutSession = makeTask({
        id: 't2',
        completedAt: 1_700_000_000_000,
        completedDayKey: '2026-08-01',
      });

      const session = makeSession({ taskId: 't1', durationMs: 7_200_000 }); // 2h

      // Total focus for t1 = 2h. t2 has no focus sessions and is excluded.
      // Average = 7_200_000 / 1 = 7_200_000.
      expect(avgTaskCompletionMs([taskWithSession, taskWithoutSession], [session])).toBe(
        7_200_000
      );
    });
  });

  describe('weeklyFocusMs', () => {
    it('honours all three weekStartsOn values (0: Sun, 1: Mon, 6: Sat)', () => {
      // 2026-08-02 is a Sunday.
      // 2026-08-03 is a Monday.
      const sunSession = makeSession({ id: 's-sun', dayKey: '2026-08-02', durationMs: 1_000_000 });
      const monSession = makeSession({ id: 's-mon', dayKey: '2026-08-03', durationMs: 2_000_000 });

      // Anchor = 2026-08-03 (Monday)
      // If weekStartsOn = 1 (Monday): week is 2026-08-03 to 2026-08-09. Mon session is included, Sun session is previous week.
      const settingsMon = makeSettings({ weekStartsOn: 1, dayStartHour: 0 });
      expect(weeklyFocusMs([sunSession, monSession], '2026-08-03', settingsMon)).toBe(2_000_000);

      // If weekStartsOn = 0 (Sunday): week is 2026-08-02 to 2026-08-08. Both Sun and Mon sessions are included!
      const settingsSun = makeSettings({ weekStartsOn: 0, dayStartHour: 0 });
      expect(weeklyFocusMs([sunSession, monSession], '2026-08-03', settingsSun)).toBe(3_000_000);

      // If weekStartsOn = 6 (Saturday): week starting Sat 2026-08-01 covers Sat 08-01 to Fri 08-07. Both Sun and Mon are in week!
      const settingsSat = makeSettings({ weekStartsOn: 6, dayStartHour: 0 });
      expect(weeklyFocusMs([sunSession, monSession], '2026-08-03', settingsSat)).toBe(3_000_000);
    });
  });

  describe('monthlyFocusMs', () => {
    it('a session exactly on a month boundary lands in exactly one month', () => {
      const july31 = makeSession({ id: 's1', dayKey: '2026-07-31', durationMs: 1_000_000 });
      const aug1 = makeSession({ id: 's2', dayKey: '2026-08-01', durationMs: 2_000_000 });

      expect(monthlyFocusMs([july31, aug1], '2026-07-31', settings)).toBe(1_000_000);
      expect(monthlyFocusMs([july31, aug1], '2026-08-01', settings)).toBe(2_000_000);
    });
  });

  describe('longest and shortest session', () => {
    it('correctly calculates longest and shortest focus sessions', () => {
      const s1 = makeSession({ id: 's1', durationMs: 1_000_000 });
      const s2 = makeSession({ id: 's2', durationMs: 5_000_000 });
      const s3 = makeSession({ id: 's3', durationMs: 2_500_000 });
      const sBreak = makeSession({ id: 's4', kind: 'pomodoro_short_break', durationMs: 100_000 });

      expect(longestSessionMs([s1, s2, s3, sBreak])).toBe(5_000_000);
      expect(shortestSessionMs([s1, s2, s3, sBreak])).toBe(1_000_000);
    });
  });
});
