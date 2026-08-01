import { describe, it, expect } from 'vitest';
import { buildDayRecords, getDayRecord, taskCompletionRatio } from './dayRecords';
import { makeTask, makeSession, makeSettings } from './fixtures';

describe('dayRecords', () => {
  const settings = makeSettings({ dailyGoalMs: 14_400_000, dayStartHour: 0 });

  describe('empty input', () => {
    it('buildDayRecords returns [] on empty input', () => {
      expect(buildDayRecords([], [], settings)).toEqual([]);
    });

    it('getDayRecord returns zero-filled record and Number.isFinite on numeric fields', () => {
      const rec = getDayRecord([], [], settings, '2026-08-01');
      expect(rec).toEqual({
        dayKey: '2026-08-01',
        focusMs: 0,
        breakMs: 0,
        completedTasks: 0,
        unfinishedTasks: 0,
        sessionsCompleted: 0,
        pomodoroSessions: 0,
        stopwatchSessions: 0,
        productivityPct: 0,
      });

      expect(Number.isFinite(rec.focusMs)).toBe(true);
      expect(Number.isFinite(rec.breakMs)).toBe(true);
      expect(Number.isFinite(rec.completedTasks)).toBe(true);
      expect(Number.isFinite(rec.unfinishedTasks)).toBe(true);
      expect(Number.isFinite(rec.sessionsCompleted)).toBe(true);
      expect(Number.isFinite(rec.pomodoroSessions)).toBe(true);
      expect(Number.isFinite(rec.stopwatchSessions)).toBe(true);
      expect(Number.isFinite(rec.productivityPct)).toBe(true);
    });

    it('taskCompletionRatio returns null on zero denominator', () => {
      expect(taskCompletionRatio({ completedTasks: 0, unfinishedTasks: 0 })).toBeNull();
    });
  });

  describe('day record scenarios', () => {
    it('one day, one session', () => {
      const session = makeSession({
        kind: 'stopwatch',
        durationMs: 3_600_000,
        dayKey: '2026-08-01',
        completed: true,
      });
      const records = buildDayRecords([], [session], settings);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        dayKey: '2026-08-01',
        focusMs: 3_600_000,
        breakMs: 0,
        stopwatchSessions: 1,
        sessionsCompleted: 1,
      });
    });

    it('one day, many sessions', () => {
      const s1 = makeSession({ id: 's1', kind: 'pomodoro_work', durationMs: 1_500_000, dayKey: '2026-08-01' });
      const s2 = makeSession({ id: 's2', kind: 'stopwatch', durationMs: 1_800_000, dayKey: '2026-08-01' });
      const records = buildDayRecords([], [s1, s2], settings);
      expect(records).toHaveLength(1);
      expect(records[0]!.focusMs).toBe(3_300_000);
      expect(records[0]!.pomodoroSessions).toBe(1);
      expect(records[0]!.stopwatchSessions).toBe(1);
      expect(records[0]!.sessionsCompleted).toBe(2);
    });

    it('many days spanning two months and a year boundary', () => {
      const s1 = makeSession({ id: 's1', dayKey: '2025-12-31', durationMs: 1_000_000 });
      const s2 = makeSession({ id: 's2', dayKey: '2026-01-01', durationMs: 2_000_000 });
      const s3 = makeSession({ id: 's3', dayKey: '2026-02-01', durationMs: 3_000_000 });

      const records = buildDayRecords([], [s1, s2, s3], settings);
      expect(records).toHaveLength(3);
      expect(records.map((r) => r.dayKey)).toEqual(['2025-12-31', '2026-01-01', '2026-02-01']);
    });

    it('a day containing both focus and break sessions: focusMs excludes break, breakMs has it, sessionsCompleted counts both', () => {
      const focus = makeSession({
        id: 's1',
        kind: 'pomodoro_work',
        durationMs: 1_500_000,
        dayKey: '2026-08-01',
        completed: true,
      });
      const breakS = makeSession({
        id: 's2',
        kind: 'pomodoro_short_break',
        durationMs: 300_000,
        dayKey: '2026-08-01',
        completed: true,
      });

      const rec = getDayRecord([], [focus, breakS], settings, '2026-08-01');
      expect(rec.focusMs).toBe(1_500_000);
      expect(rec.breakMs).toBe(300_000);
      expect(rec.sessionsCompleted).toBe(2);
      expect(rec.pomodoroSessions).toBe(1);
    });

    it('productivityPct: below goal, exactly at goal, above goal (clamps to 100), and dailyGoalMs = 0', () => {
      const goal = 10_000_000;
      const sBelow = makeSettings({ dailyGoalMs: goal });

      // Below goal: 50%
      const recBelow = getDayRecord(
        [],
        [makeSession({ durationMs: 5_000_000, dayKey: '2026-08-01' })],
        sBelow,
        '2026-08-01'
      );
      expect(recBelow.productivityPct).toBe(50);

      // Exactly at goal: 100%
      const recGoal = getDayRecord(
        [],
        [makeSession({ durationMs: 10_000_000, dayKey: '2026-08-01' })],
        sBelow,
        '2026-08-01'
      );
      expect(recGoal.productivityPct).toBe(100);

      // Above goal: clamped to 100%
      const recAbove = getDayRecord(
        [],
        [makeSession({ durationMs: 15_000_000, dayKey: '2026-08-01' })],
        sBelow,
        '2026-08-01'
      );
      expect(recAbove.productivityPct).toBe(100);

      // dailyGoalMs = 0: returns 0
      const sZero = makeSettings({ dailyGoalMs: 0 });
      const recZero = getDayRecord(
        [],
        [makeSession({ durationMs: 5_000_000, dayKey: '2026-08-01' })],
        sZero,
        '2026-08-01'
      );
      expect(recZero.productivityPct).toBe(0);
      expect(Number.isFinite(recZero.productivityPct)).toBe(true);
    });

    it('active task on day D for unfinishedTasks and completedTasks', () => {
      const day1 = '2026-08-01';
      const day2 = '2026-08-02';

      // Created before day1, completed on day2
      const task = makeTask({
        id: 't1',
        createdAt: 1_700_000_000_000, // dayKey '2023-11-14'
        completedAt: 1_700_100_000_000,
        completedDayKey: day2,
      });

      const recDay1 = getDayRecord([task], [], settings, day1);
      expect(recDay1.completedTasks).toBe(0);
      expect(recDay1.unfinishedTasks).toBe(1);

      const recDay2 = getDayRecord([task], [], settings, day2);
      expect(recDay2.completedTasks).toBe(1);
      expect(recDay2.unfinishedTasks).toBe(0);
    });
  });
});
