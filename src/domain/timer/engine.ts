import { dayKeyFromTimestamp } from '../time/dayKey';
import type { ActiveTimer, PomodoroPhase, Session, SessionKind, Settings } from '../types';

export function elapsedMs(timer: ActiveTimer, now: number): number {
  return timer.accumulatedMs + (timer.status === 'running' ? now - timer.startedAt : 0);
}

export function remainingMs(timer: ActiveTimer, now: number): number | null {
  if (timer.targetMs === null) {
    return null;
  }
  return Math.max(0, timer.targetMs - elapsedMs(timer, now));
}

export function isExpired(timer: ActiveTimer, now: number): boolean {
  if (timer.targetMs === null) {
    return false;
  }
  return elapsedMs(timer, now) >= timer.targetMs;
}

export function startTimer(input: {
  taskId: string;
  kind: SessionKind;
  now: number;
  targetMs: number | null;
  pomodoro: { phase: PomodoroPhase; completedWorkCycles: number } | null;
}): ActiveTimer {
  return {
    taskId: input.taskId,
    kind: input.kind,
    status: 'running',
    startedAt: input.now,
    accumulatedMs: 0,
    targetMs: input.targetMs,
    pomodoro: input.pomodoro ? { ...input.pomodoro } : null,
  };
}

export function pauseTimer(timer: ActiveTimer, now: number): ActiveTimer {
  if (timer.status === 'paused') {
    return {
      ...timer,
      pomodoro: timer.pomodoro ? { ...timer.pomodoro } : null,
    };
  }
  return {
    ...timer,
    status: 'paused',
    accumulatedMs: timer.accumulatedMs + (now - timer.startedAt),
    startedAt: now,
    pomodoro: timer.pomodoro ? { ...timer.pomodoro } : null,
  };
}

export function resumeTimer(timer: ActiveTimer, now: number): ActiveTimer {
  if (timer.status === 'running') {
    return {
      ...timer,
      pomodoro: timer.pomodoro ? { ...timer.pomodoro } : null,
    };
  }
  return {
    ...timer,
    status: 'running',
    startedAt: now,
    pomodoro: timer.pomodoro ? { ...timer.pomodoro } : null,
  };
}

export function finishTimer(
  timer: ActiveTimer,
  now: number,
  dayStartHour: number,
  newId: string
): { session: Session | null; completesTask: boolean } {
  const elapsed = elapsedMs(timer, now);

  if (elapsed < 1000) {
    return { session: null, completesTask: false };
  }

  const durationMs = timer.targetMs !== null ? Math.min(elapsed, timer.targetMs) : elapsed;
  const completed = timer.targetMs === null ? true : elapsed >= timer.targetMs;

  let completesTask = false;
  if (timer.kind === 'stopwatch') {
    completesTask = true;
  } else if (timer.kind === 'countdown') {
    completesTask = completed;
  } else {
    completesTask = false;
  }

  const session: Session = {
    id: newId,
    taskId: timer.taskId,
    kind: timer.kind,
    startedAt: timer.startedAt,
    endedAt: now,
    durationMs,
    dayKey: dayKeyFromTimestamp(timer.startedAt, dayStartHour),
    completed,
  };

  return { session, completesTask };
}

export function nextPomodoroPhase(
  current: PomodoroPhase,
  completedWorkCycles: number,
  settings: Settings
): { phase: PomodoroPhase; completedWorkCycles: number } {
  if (current === 'work') {
    const newCompletedWorkCycles = completedWorkCycles + 1;
    const isLongBreak = newCompletedWorkCycles % settings.pomodoro.cyclesBeforeLongBreak === 0;
    return {
      phase: isLongBreak ? 'long_break' : 'short_break',
      completedWorkCycles: newCompletedWorkCycles,
    };
  }
  return {
    phase: 'work',
    completedWorkCycles,
  };
}

export function phaseDurationMs(phase: PomodoroPhase, settings: Settings): number {
  switch (phase) {
    case 'work':
      return settings.pomodoro.workMinutes * 60_000;
    case 'short_break':
      return settings.pomodoro.shortBreakMinutes * 60_000;
    case 'long_break':
      return settings.pomodoro.longBreakMinutes * 60_000;
  }
}

export function kindForPhase(phase: PomodoroPhase): SessionKind {
  switch (phase) {
    case 'work':
      return 'pomodoro_work';
    case 'short_break':
      return 'pomodoro_short_break';
    case 'long_break':
      return 'pomodoro_long_break';
  }
}
