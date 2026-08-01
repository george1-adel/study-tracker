declare const process: { env: Record<string, string> };
process.env.TZ = 'Africa/Cairo';


import { describe, it, expect } from 'vitest';
import { countingDays, streakRuns, streakSummary } from './streaks';
import { makeSession, makeSettings } from './fixtures';
import { dayKeyToNoonTimestamp } from '../time/dayKey';

describe('streaks', () => {
  const settings = makeSettings({ streakMinFocusMs: 900_000, dayStartHour: 0 });

  it('empty input -> the exact zero summary', () => {
    const summary = streakSummary([], settings, 1_700_000_000_000);
    expect(summary).toEqual({
      current: 0,
      state: 'broken',
      longest: 0,
      totalDays: 0,
      history: [],
    });
  });

  it('three consecutive days ending today -> current 3, state active', () => {
    const todayKey = '2026-08-03';
    const now = dayKeyToNoonTimestamp(todayKey);

    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-02', durationMs: 900_000, kind: 'stopwatch' });
    const s3 = makeSession({ dayKey: '2026-08-03', durationMs: 900_000, kind: 'stopwatch' });

    const summary = streakSummary([s1, s2, s3], settings, now);
    expect(summary.current).toBe(3);
    expect(summary.state).toBe('active');
    expect(summary.longest).toBe(3);
    expect(summary.totalDays).toBe(3);
  });

  it('THE MORNING CASE: three consecutive days ending YESTERDAY, nothing logged today -> current 3, state at_risk', () => {
    const todayKey = '2026-08-04';
    const now = dayKeyToNoonTimestamp(todayKey);

    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-02', durationMs: 900_000, kind: 'stopwatch' });
    const s3 = makeSession({ dayKey: '2026-08-03', durationMs: 900_000, kind: 'stopwatch' });

    const summary = streakSummary([s1, s2, s3], settings, now);
    expect(summary.current).toBe(3);
    expect(summary.state).toBe('at_risk');
    expect(summary.longest).toBe(3);
    expect(summary.totalDays).toBe(3);
  });

  it('nothing yesterday and nothing today, but a run ending three days ago -> current 0, state broken, longest still reflects that run', () => {
    const todayKey = '2026-08-05';
    const now = dayKeyToNoonTimestamp(todayKey);

    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-02', durationMs: 900_000, kind: 'stopwatch' });

    const summary = streakSummary([s1, s2], settings, now);
    expect(summary.current).toBe(0);
    expect(summary.state).toBe('broken');
    expect(summary.longest).toBe(2);
    expect(summary.totalDays).toBe(2);
  });

  it('a gap in the middle: runs are split correctly and longest is the longest run, not the total', () => {
    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-02', durationMs: 900_000, kind: 'stopwatch' });
    // Gap on 2026-08-03
    const s3 = makeSession({ dayKey: '2026-08-04', durationMs: 900_000, kind: 'stopwatch' });
    const s4 = makeSession({ dayKey: '2026-08-05', durationMs: 900_000, kind: 'stopwatch' });
    const s5 = makeSession({ dayKey: '2026-08-06', durationMs: 900_000, kind: 'stopwatch' });

    const cDays = countingDays([s1, s2, s3, s4, s5], settings);
    const runs = streakRuns(cDays);

    expect(runs).toEqual([
      { startDay: '2026-08-04', endDay: '2026-08-06', length: 3 },
      { startDay: '2026-08-01', endDay: '2026-08-02', length: 2 },
    ]);

    const now = dayKeyToNoonTimestamp('2026-08-06');
    const summary = streakSummary([s1, s2, s3, s4, s5], settings, now);
    expect(summary.longest).toBe(3);
    expect(summary.totalDays).toBe(5);
  });

  it('longest comes from a PAST run that is longer than the current one', () => {
    // Past run of 5 days: 2026-08-01 to 2026-08-05
    const past = ['2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05'].map((dk) =>
      makeSession({ dayKey: dk, durationMs: 900_000, kind: 'stopwatch' })
    );
    // Gap on 2026-08-06
    // Current run of 2 days: 2026-08-07 to 2026-08-08 (today = 2026-08-08)
    const current = ['2026-08-07', '2026-08-08'].map((dk) =>
      makeSession({ dayKey: dk, durationMs: 900_000, kind: 'stopwatch' })
    );

    const now = dayKeyToNoonTimestamp('2026-08-08');
    const summary = streakSummary([...past, ...current], settings, now);

    expect(summary.current).toBe(2);
    expect(summary.state).toBe('active');
    expect(summary.longest).toBe(5);
    expect(summary.totalDays).toBe(7);
  });

  it('totalDays counts non-consecutive days correctly', () => {
    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-05', durationMs: 900_000, kind: 'stopwatch' });
    const s3 = makeSession({ dayKey: '2026-08-10', durationMs: 900_000, kind: 'stopwatch' });

    const now = dayKeyToNoonTimestamp('2026-08-10');
    const summary = streakSummary([s1, s2, s3], settings, now);

    expect(summary.totalDays).toBe(3);
    expect(summary.current).toBe(1);
    expect(summary.longest).toBe(1);
  });

  it('history is ordered most recent first, with correct startDay/endDay/length for each run', () => {
    const s1 = makeSession({ dayKey: '2026-08-01', durationMs: 900_000, kind: 'stopwatch' });
    const s2 = makeSession({ dayKey: '2026-08-02', durationMs: 900_000, kind: 'stopwatch' });

    const s3 = makeSession({ dayKey: '2026-08-05', durationMs: 900_000, kind: 'stopwatch' });
    const s4 = makeSession({ dayKey: '2026-08-06', durationMs: 900_000, kind: 'stopwatch' });
    const s5 = makeSession({ dayKey: '2026-08-07', durationMs: 900_000, kind: 'stopwatch' });

    const now = dayKeyToNoonTimestamp('2026-08-07');
    const summary = streakSummary([s1, s2, s3, s4, s5], settings, now);

    expect(summary.history).toEqual([
      { startDay: '2026-08-05', endDay: '2026-08-07', length: 3 },
      { startDay: '2026-08-01', endDay: '2026-08-02', length: 2 },
    ]);
  });

  it('a day with 14 minutes of focus does NOT count; exactly 15 minutes DOES count', () => {
    const sBelow = makeSession({ dayKey: '2026-08-01', durationMs: 14 * 60_000, kind: 'stopwatch' });
    const sExact = makeSession({ dayKey: '2026-08-02', durationMs: 15 * 60_000, kind: 'stopwatch' });

    const cDays = countingDays([sBelow, sExact], settings);
    expect(cDays).toEqual(['2026-08-02']);
  });

  it('a day with 3 hours of BREAK sessions only does NOT count', () => {
    const sBreak1 = makeSession({
      dayKey: '2026-08-01',
      durationMs: 90 * 60_000,
      kind: 'pomodoro_short_break',
    });
    const sBreak2 = makeSession({
      dayKey: '2026-08-01',
      durationMs: 90 * 60_000,
      kind: 'pomodoro_long_break',
    });

    const cDays = countingDays([sBreak1, sBreak2], settings);
    expect(cDays).toEqual([]);
  });

  it("a day whose 15 minutes is split across three 5-minute sessions DOES count (threshold is on day's total)", () => {
    const s1 = makeSession({ id: 's1', dayKey: '2026-08-01', durationMs: 5 * 60_000, kind: 'stopwatch' });
    const s2 = makeSession({ id: 's2', dayKey: '2026-08-01', durationMs: 5 * 60_000, kind: 'pomodoro_work' });
    const s3 = makeSession({ id: 's3', dayKey: '2026-08-01', durationMs: 5 * 60_000, kind: 'countdown' });

    const cDays = countingDays([s1, s2, s3], settings);
    expect(cDays).toEqual(['2026-08-01']);
  });

  it('a run spanning the Africa/Cairo spring-forward and autumn transitions stays a single unbroken run', () => {
    // 2026 Spring Forward in Egypt: April 24/25
    const springDays = ['2026-04-23', '2026-04-24', '2026-04-25', '2026-04-26'];
    const springSessions = springDays.map((dk) =>
      makeSession({ dayKey: dk, durationMs: 900_000, kind: 'stopwatch' })
    );

    const cSpring = countingDays(springSessions, settings);
    const runsSpring = streakRuns(cSpring);
    expect(runsSpring).toEqual([{ startDay: '2026-04-23', endDay: '2026-04-26', length: 4 }]);

    // 2026 Autumn Fall Back in Egypt: Oct 29/30
    const autumnDays = ['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31'];
    const autumnSessions = autumnDays.map((dk) =>
      makeSession({ dayKey: dk, durationMs: 900_000, kind: 'stopwatch' })
    );

    const cAutumn = countingDays(autumnSessions, settings);
    const runsAutumn = streakRuns(cAutumn);
    expect(runsAutumn).toEqual([{ startDay: '2026-10-28', endDay: '2026-10-31', length: 4 }]);
  });

  it('a run spanning a year boundary (2026-12-30, 12-31, 2027-01-01) is one run of 3', () => {
    const yearDays = ['2026-12-30', '2026-12-31', '2027-01-01'];
    const yearSessions = yearDays.map((dk) =>
      makeSession({ dayKey: dk, durationMs: 900_000, kind: 'stopwatch' })
    );

    const cDays = countingDays(yearSessions, settings);
    const runs = streakRuns(cDays);
    expect(runs).toEqual([{ startDay: '2026-12-30', endDay: '2027-01-01', length: 3 }]);

    const now = dayKeyToNoonTimestamp('2027-01-01');
    const summary = streakSummary(yearSessions, settings, now);
    expect(summary.current).toBe(3);
    expect(summary.state).toBe('active');
    expect(summary.longest).toBe(3);
    expect(summary.totalDays).toBe(3);
  });
});
