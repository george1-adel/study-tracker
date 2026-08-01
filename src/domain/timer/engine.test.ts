import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type PomodoroPhase } from '../types';
import {
  elapsedMs,
  finishTimer,
  isExpired,
  kindForPhase,
  nextPomodoroPhase,
  pauseTimer,
  phaseDurationMs,
  remainingMs,
  resumeTimer,
  startTimer,
} from './engine';

describe('timer engine', () => {
  it('elapsedMs while running, paused, and after pause->resume->pause (central assertion)', () => {
    const t0 = 1000;
    let timer = startTimer({
      taskId: 'task-1',
      kind: 'stopwatch',
      now: t0,
      targetMs: null,
      pomodoro: null,
    });

    // Run for 10s (10_000ms)
    const t1 = t0 + 10_000;
    expect(elapsedMs(timer, t1)).toBe(10_000);

    // Pause at t1
    timer = pauseTimer(timer, t1);
    expect(elapsedMs(timer, t1)).toBe(10_000);

    // Paused for 60s (60_000ms)
    const t2 = t1 + 60_000;
    expect(elapsedMs(timer, t2)).toBe(10_000);

    // Resume at t2
    timer = resumeTimer(timer, t2);
    expect(elapsedMs(timer, t2)).toBe(10_000);

    // Run for 5s (5_000ms)
    const t3 = t2 + 5_000;
    expect(elapsedMs(timer, t3)).toBe(15_000);

    // Pause again at t3
    timer = pauseTimer(timer, t3);
    expect(elapsedMs(timer, t3)).toBe(15_000);

    // Central assertion: timer run 10s, paused 60s, resumed and run 5s reports 15s, NOT 75s
    expect(elapsedMs(timer, t3 + 100_000)).toBe(15_000);
  });

  it('pauseTimer applied twice does not change elapsed; resumeTimer applied twice does not change it', () => {
    const t0 = 1000;
    let timer = startTimer({
      taskId: 'task-1',
      kind: 'countdown',
      now: t0,
      targetMs: 60_000,
      pomodoro: null,
    });

    // Run 10s
    const t1 = t0 + 10_000;
    timer = pauseTimer(timer, t1);
    const elapsedFirstPause = elapsedMs(timer, t1);
    expect(elapsedFirstPause).toBe(10_000);

    // Pause second time 20s later
    const t2 = t1 + 20_000;
    timer = pauseTimer(timer, t2);
    expect(elapsedMs(timer, t2)).toBe(10_000);

    // Resume at t2
    timer = resumeTimer(timer, t2);
    expect(elapsedMs(timer, t2)).toBe(10_000);

    // Resume second time 5s later while still running
    const t3 = t2 + 5_000;
    timer = resumeTimer(timer, t3);
    expect(elapsedMs(timer, t3)).toBe(15_000);
  });

  it('countdown read 10 minutes after target expired: isExpired is true, durationMs clamped to target', () => {
    const t0 = 1_000_000;
    const targetMs = 25 * 60_000; // 25 minutes
    const timer = startTimer({
      taskId: 'task-1',
      kind: 'countdown',
      now: t0,
      targetMs,
      pomodoro: null,
    });

    // Read 35 minutes after start (10 mins after 25-min target expired)
    const tExpired = t0 + 35 * 60_000;
    expect(isExpired(timer, tExpired)).toBe(true);
    expect(remainingMs(timer, tExpired)).toBe(0);

    const { session, completesTask } = finishTimer(timer, tExpired, 0, 'sess-1');
    expect(completesTask).toBe(true);
    expect(session).not.toBeNull();
    expect(session?.durationMs).toBe(targetMs);
    expect(session?.durationMs).not.toBe(35 * 60_000);
  });

  it('THE BACKGROUND-TAB CASE: throttled-tab regression check without intermediate calls', () => {
    // throttled-tab regression: background tabs in browsers may throttle timer callbacks to ~1/min.
    // Start a 25-minute countdown at t, then read elapsedMs/isExpired at t + 25min with NO intermediate calls.
    const t0 = 500_000;
    const targetMs = 25 * 60_000;
    const timer = startTimer({
      taskId: 'task-1',
      kind: 'countdown',
      now: t0,
      targetMs,
      pomodoro: null,
    });

    const t25min = t0 + 25 * 60_000;
    expect(isExpired(timer, t25min)).toBe(true);
    expect(elapsedMs(timer, t25min)).toBe(targetMs);

    const { session } = finishTimer(timer, t25min, 0, 'sess-bg');
    expect(session?.durationMs).toBe(targetMs);
  });

  it('finishTimer on a paused timer: durationMs equals accumulated time, NOT endedAt - startedAt', () => {
    const tStart = 1000;
    let timer = startTimer({
      taskId: 'task-1',
      kind: 'stopwatch',
      now: tStart,
      targetMs: null,
      pomodoro: null,
    });

    // Run 10s, then pause
    const tPause = tStart + 10_000;
    timer = pauseTimer(timer, tPause);

    // Wait 60s while paused, then finish at tFinish
    const tFinish = tPause + 60_000;
    const { session } = finishTimer(timer, tFinish, 0, 'sess-pause');

    expect(session).not.toBeNull();
    expect(session?.durationMs).toBe(10_000);
    expect(session?.durationMs).not.toBe(tFinish - session!.startedAt);
  });

  it('session that crosses local midnight is keyed to the day it STARTED', () => {
    // 2026-03-14 at 23:50 (11:50 PM)
    const tStart = new Date(2026, 2, 14, 23, 50, 0, 0).getTime();
    const timer = startTimer({
      taskId: 'task-1',
      kind: 'stopwatch',
      now: tStart,
      targetMs: null,
      pomodoro: null,
    });

    // Finish next day at 00:20 AM
    const tEnd = new Date(2026, 2, 15, 0, 20, 0, 0).getTime();
    const { session } = finishTimer(timer, tEnd, 0, 'sess-midnight');

    expect(session).not.toBeNull();
    expect(session?.dayKey).toBe('2026-03-14');
  });

  it('dayStartHour = 4 changes which day a 01:30 start is keyed to', () => {
    // 2026-03-15 at 01:30 AM
    const tStart = new Date(2026, 2, 15, 1, 30, 0, 0).getTime();
    const timer = startTimer({
      taskId: 'task-1',
      kind: 'stopwatch',
      now: tStart,
      targetMs: null,
      pomodoro: null,
    });

    const tEnd = tStart + 30 * 60_000;

    // With dayStartHour = 0 -> 2026-03-15
    const res0 = finishTimer(timer, tEnd, 0, 'sess-h0');
    expect(res0.session?.dayKey).toBe('2026-03-15');

    // With dayStartHour = 4 -> 2026-03-14
    const res4 = finishTimer(timer, tEnd, 4, 'sess-h4');
    expect(res4.session?.dayKey).toBe('2026-03-14');
  });

  it('elapsedMs < 1000 -> null session', () => {
    const t0 = 1000;
    const timer = startTimer({
      taskId: 'task-1',
      kind: 'stopwatch',
      now: t0,
      targetMs: null,
      pomodoro: null,
    });

    const result = finishTimer(timer, t0 + 500, 0, 'sess-short');
    expect(result).toEqual({ session: null, completesTask: false });
  });

  it('completesTask: true for stopwatch, true for countdown reaching target, FALSE for pomodoro_work, FALSE for countdown stopped early', () => {
    const t0 = 1000;

    // Stopwatch finished
    const swTimer = startTimer({
      taskId: 't1',
      kind: 'stopwatch',
      now: t0,
      targetMs: null,
      pomodoro: null,
    });
    expect(finishTimer(swTimer, t0 + 5000, 0, 's1').completesTask).toBe(true);

    // Countdown reached target
    const cdReached = startTimer({
      taskId: 't2',
      kind: 'countdown',
      now: t0,
      targetMs: 10_000,
      pomodoro: null,
    });
    expect(finishTimer(cdReached, t0 + 10_000, 0, 's2').completesTask).toBe(true);

    // Countdown stopped early
    const cdEarly = startTimer({
      taskId: 't3',
      kind: 'countdown',
      now: t0,
      targetMs: 10_000,
      pomodoro: null,
    });
    expect(finishTimer(cdEarly, t0 + 5_000, 0, 's3').completesTask).toBe(false);

    // Pomodoro work (even when target reached)
    const pomWork = startTimer({
      taskId: 't4',
      kind: 'pomodoro_work',
      now: t0,
      targetMs: 25 * 60_000,
      pomodoro: { phase: 'work', completedWorkCycles: 0 },
    });
    expect(finishTimer(pomWork, t0 + 25 * 60_000, 0, 's4').completesTask).toBe(false);

    // Pomodoro break
    const pomBreak = startTimer({
      taskId: 't5',
      kind: 'pomodoro_short_break',
      now: t0,
      targetMs: 5 * 60_000,
      pomodoro: { phase: 'short_break', completedWorkCycles: 1 },
    });
    expect(finishTimer(pomBreak, t0 + 5 * 60_000, 0, 's5').completesTask).toBe(false);
  });

  it('nextPomodoroPhase across a full cycle with cyclesBeforeLongBreak = 4', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      pomodoro: {
        ...DEFAULT_SETTINGS.pomodoro,
        cyclesBeforeLongBreak: 4,
      },
    };

    // Initial state: work phase with 0 completed work cycles
    let phase: PomodoroPhase = 'work';
    let completedWorkCycles = 0;

    // 1st transition: work phase ends -> short_break, completedWorkCycles = 1
    const p1 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p1).toEqual({ phase: 'short_break', completedWorkCycles: 1 });
    phase = p1.phase;
    completedWorkCycles = p1.completedWorkCycles;

    // 2nd transition: short break ends -> work, completedWorkCycles = 1
    const p2 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p2).toEqual({ phase: 'work', completedWorkCycles: 1 });
    phase = p2.phase;
    completedWorkCycles = p2.completedWorkCycles;

    // 3rd transition: work phase ends -> short_break, completedWorkCycles = 2
    const p3 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p3).toEqual({ phase: 'short_break', completedWorkCycles: 2 });
    phase = p3.phase;
    completedWorkCycles = p3.completedWorkCycles;

    // 4th transition: short break ends -> work, completedWorkCycles = 2
    const p4 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p4).toEqual({ phase: 'work', completedWorkCycles: 2 });
    phase = p4.phase;
    completedWorkCycles = p4.completedWorkCycles;

    // 5th transition: work phase ends -> short_break, completedWorkCycles = 3
    const p5 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p5).toEqual({ phase: 'short_break', completedWorkCycles: 3 });
    phase = p5.phase;
    completedWorkCycles = p5.completedWorkCycles;

    // 6th transition: short break ends -> work, completedWorkCycles = 3
    const p6 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p6).toEqual({ phase: 'work', completedWorkCycles: 3 });
    phase = p6.phase;
    completedWorkCycles = p6.completedWorkCycles;

    // 7th transition: work phase 4 ends -> LONG_BREAK, completedWorkCycles = 4
    const p7 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p7).toEqual({ phase: 'long_break', completedWorkCycles: 4 });
    phase = p7.phase;
    completedWorkCycles = p7.completedWorkCycles;

    // 8th transition: long break ends -> work, completedWorkCycles = 4
    const p8 = nextPomodoroPhase(phase, completedWorkCycles, settings);
    expect(p8).toEqual({ phase: 'work', completedWorkCycles: 4 });
  });

  it('phaseDurationMs for all three phases', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      pomodoro: {
        ...DEFAULT_SETTINGS.pomodoro,
        workMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
      },
    };

    expect(phaseDurationMs('work', settings)).toBe(25 * 60_000);
    expect(phaseDurationMs('short_break', settings)).toBe(5 * 60_000);
    expect(phaseDurationMs('long_break', settings)).toBe(15 * 60_000);
  });

  it('kindForPhase for all three phases', () => {
    expect(kindForPhase('work')).toBe('pomodoro_work');
    expect(kindForPhase('short_break')).toBe('pomodoro_short_break');
    expect(kindForPhase('long_break')).toBe('pomodoro_long_break');
  });

  it('all functions leave their input object unmutated', () => {
    const t0 = 1000;
    const timerInput = {
      taskId: 'task-mut-1',
      kind: 'pomodoro_work' as const,
      now: t0,
      targetMs: 1500_000,
      pomodoro: { phase: 'work' as const, completedWorkCycles: 2 },
    };

    const timerInputSnapshot = JSON.parse(JSON.stringify(timerInput));
    const activeTimer = startTimer(timerInput);
    expect(timerInput).toEqual(timerInputSnapshot);

    const activeTimerSnapshot = JSON.parse(JSON.stringify(activeTimer));

    elapsedMs(activeTimer, t0 + 5000);
    expect(activeTimer).toEqual(activeTimerSnapshot);

    remainingMs(activeTimer, t0 + 5000);
    expect(activeTimer).toEqual(activeTimerSnapshot);

    isExpired(activeTimer, t0 + 5000);
    expect(activeTimer).toEqual(activeTimerSnapshot);

    const paused = pauseTimer(activeTimer, t0 + 5000);
    expect(activeTimer).toEqual(activeTimerSnapshot);

    const pausedSnapshot = JSON.parse(JSON.stringify(paused));
    const resumed = resumeTimer(paused, t0 + 10_000);
    expect(paused).toEqual(pausedSnapshot);

    finishTimer(resumed, t0 + 20_000, 4, 'sess-mut');
    expect(activeTimer).toEqual(activeTimerSnapshot);

    const settingsSnapshot = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    nextPomodoroPhase('work', 2, DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual(settingsSnapshot);

    phaseDurationMs('work', DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual(settingsSnapshot);
  });
});
