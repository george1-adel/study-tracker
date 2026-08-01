import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppStore } from '../../store/useAppStore';
import { TimerPanel } from './TimerPanel';
import { TimerControls } from './TimerControls';
import { useTimerTick } from './useTimerTick';
import { useTimerCompletion } from './useTimerCompletion';
import { totalFocusMs } from '../../domain/stats/totals';
import * as soundModule from '../../platform/sound';
import * as notifyModule from '../../platform/notify';

vi.mock('../../platform/sound', async () => {
  const actual = await vi.importActual('../../platform/sound');
  return {
    ...actual,
    playAlarm: vi.fn().mockResolvedValue('played'),
    unlockAudio: vi.fn(),
  };
});

vi.mock('../../platform/notify', async () => {
  const actual = await vi.importActual('../../platform/notify');
  return {
    ...actual,
    notify: vi.fn().mockReturnValue('shown'),
    canNotify: vi.fn().mockReturnValue(true),
  };
});

describe('timer feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.getState().resetAll();
  });

  it('useTimerTick subscribes once while running, unsubscribes on stop, and leaves no subscription after unmount', () => {
    let subCount = 0;
    const unsubFn = vi.fn(() => {
      subCount--;
    });
    const fakeTicker = {
      subscribe: vi.fn(() => {
        subCount++;
        return unsubFn;
      }),
    };

    // Task is not running initially
    const { unmount, rerender } = renderHook(
      (props) => useTimerTick(props.ticker),
      { initialProps: { ticker: fakeTicker } }
    );
    expect(fakeTicker.subscribe).not.toHaveBeenCalled();
    expect(subCount).toBe(0);

    // Add task and start timer
    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Test Task', 'stopwatch');
      useAppStore.getState().startTimerFor(task.id, Date.now());
    });

    rerender({ ticker: fakeTicker });
    expect(fakeTicker.subscribe).toHaveBeenCalledTimes(1);
    expect(subCount).toBe(1);

    // Stop (finish) timer
    act(() => {
      useAppStore.getState().finish(Date.now());
    });

    rerender({ ticker: fakeTicker });
    expect(unsubFn).toHaveBeenCalled();
    expect(subCount).toBe(0);

    // Start again, then unmount
    act(() => {
      const task2 = useAppStore.getState().addTask('Test Task 2', 'stopwatch');
      useAppStore.getState().startTimerFor(task2.id, Date.now());
    });

    rerender({ ticker: fakeTicker });
    expect(subCount).toBe(1);

    unmount();
    expect(unsubFn).toHaveBeenCalled();
    expect(subCount).toBe(0);
  });

  it('a countdown whose target passes between two ticks completes exactly once, not twice', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Countdown Task', 'countdown', 5000, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    // Target passes (now + 6000)
    vi.setSystemTime(now + 6000);

    // Trigger tick twice
    act(() => {
      tickCallback();
      tickCallback();
    });

    const state = useAppStore.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0]?.durationMs).toBe(5000);

    vi.useRealTimers();
  });

  it('a SILENT completion fires neither sound nor notification; a non-silent one fires both', () => {
    // 1. Silent completion
    act(() => {
      useAppStore.setState({
        lastCompletion: { sessionId: 'sess-1', kind: 'stopwatch', silent: true },
      });
    });

    renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).not.toHaveBeenCalled();
    expect(notifyModule.notify).not.toHaveBeenCalled();

    // 2. Non-silent completion
    act(() => {
      useAppStore.setState({
        lastCompletion: { sessionId: 'sess-2', kind: 'stopwatch', silent: false },
      });
    });

    renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).toHaveBeenCalled();
    expect(notifyModule.notify).toHaveBeenCalled();
  });

  it('the clock element carries aria-live="off"', () => {
    act(() => {
      const task = useAppStore.getState().addTask('Running Task', 'stopwatch');
      useAppStore.getState().startTimerFor(task.id, Date.now());
    });

    render(<TimerPanel />);

    const clockEl = screen.getByText('00:00').closest('[aria-live="off"]');
    expect(clockEl).not.toBeNull();
    expect(clockEl).toHaveAttribute('aria-live', 'off');
  });

  it('starting task B while task A runs writes A\'s session and leaves exactly one active timer', () => {
    const startTs = 100000;
    let taskA: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    let taskB: ReturnType<typeof useAppStore.getState.prototype.addTask>;

    act(() => {
      taskA = useAppStore.getState().addTask('Task A', 'stopwatch', null, startTs);
      taskB = useAppStore.getState().addTask('Task B', 'stopwatch', null, startTs);
      useAppStore.getState().startTimerFor(taskA.id, startTs);
    });

    expect(useAppStore.getState().activeTimer?.taskId).toBe(taskA.id);

    act(() => {
      useAppStore.getState().startTimerFor(taskB.id, startTs + 10000);
    });

    const state = useAppStore.getState();
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0]?.taskId).toBe(taskA.id);
    expect(state.sessions[0]?.durationMs).toBe(10000);

    expect(state.activeTimer).not.toBeNull();
    expect(state.activeTimer?.taskId).toBe(taskB.id);
  });

  it('a work phase reaching zero writes a pomodoro_work session and DOES NOT set the task\'s completedAt or completedDayKey', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    const workDuration = 25 * 60_000;
    vi.setSystemTime(now + workDuration);

    act(() => {
      tickCallback();
    });

    const state = useAppStore.getState();
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0]?.kind).toBe('pomodoro_work');
    expect(state.sessions[0]?.durationMs).toBe(workDuration);
    expect(state.sessions[0]?.completed).toBe(true);

    const updatedTask = state.tasks.find((t) => t.id === task.id);
    expect(updatedTask?.completedAt).toBeNull();
    expect(updatedTask?.completedDayKey).toBeNull();

    vi.useRealTimers();
  });

  it('after work ends, the offered control starts a break; after a break ends, it starts work', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    // Work phase finishes (25 min)
    const workDuration = 25 * 60_000;
    vi.setSystemTime(now + workDuration);
    act(() => {
      tickCallback();
    });

    // Active timer is now paused short_break phase
    let state = useAppStore.getState();
    expect(state.activeTimer?.pomodoro?.phase).toBe('short_break');
    expect(state.activeTimer?.status).toBe('paused');

    // Press control to start break (resume)
    const breakStartTs = now + workDuration;
    act(() => {
      useAppStore.getState().resume(breakStartTs);
    });

    expect(useAppStore.getState().activeTimer?.status).toBe('running');

    // Break phase finishes (5 min)
    const breakDuration = 5 * 60_000;
    vi.setSystemTime(breakStartTs + breakDuration);
    act(() => {
      tickCallback();
    });

    // Active timer is now paused work phase
    state = useAppStore.getState();
    expect(state.activeTimer?.pomodoro?.phase).toBe('work');
    expect(state.activeTimer?.status).toBe('paused');

    // Press control to start work (resume)
    act(() => {
      useAppStore.getState().resume(breakStartTs + breakDuration);
    });

    expect(useAppStore.getState().activeTimer?.status).toBe('running');

    vi.useRealTimers();
  });

  it('the fourth work phase (cyclesBeforeLongBreak = 4) is followed by a LONG break, the first three by short breaks', () => {
    vi.useFakeTimers();
    let now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    const workMs = 25 * 60_000;
    const shortBreakMs = 5 * 60_000;

    // Cycle 1 work ends
    now += workMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('short_break');

    // Short break 1 ends
    act(() => { useAppStore.getState().resume(now); });
    now += shortBreakMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('work');

    // Cycle 2 work ends
    act(() => { useAppStore.getState().resume(now); });
    now += workMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('short_break');

    // Short break 2 ends
    act(() => { useAppStore.getState().resume(now); });
    now += shortBreakMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('work');

    // Cycle 3 work ends
    act(() => { useAppStore.getState().resume(now); });
    now += workMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('short_break');

    // Short break 3 ends
    act(() => { useAppStore.getState().resume(now); });
    now += shortBreakMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('work');

    // Cycle 4 work ends -> LONG BREAK!
    act(() => { useAppStore.getState().resume(now); });
    now += workMs;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });
    expect(useAppStore.getState().activeTimer?.pomodoro?.phase).toBe('long_break');

    vi.useRealTimers();
  });

  it('completedWorkCycles increments only when a work phase ends, not when a break ends', () => {
    vi.useFakeTimers();
    let now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    expect(useAppStore.getState().activeTimer?.pomodoro?.completedWorkCycles).toBe(0);

    // Work phase ends
    now += 25 * 60_000;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });

    expect(useAppStore.getState().activeTimer?.pomodoro?.completedWorkCycles).toBe(1);

    // Break phase ends
    act(() => { useAppStore.getState().resume(now); });
    now += 5 * 60_000;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });

    // Should still be 1 after break ends!
    expect(useAppStore.getState().activeTimer?.pomodoro?.completedWorkCycles).toBe(1);

    vi.useRealTimers();
  });

  it('with autoStartBreaks false, no timer is running after a work phase ends until the control is pressed', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    act(() => {
      useAppStore.getState().updateSettings({
        pomodoro: { ...useAppStore.getState().settings.pomodoro, autoStartBreaks: false },
      });
      const task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    vi.setSystemTime(now + 25 * 60_000);
    act(() => { tickCallback(); });

    const active = useAppStore.getState().activeTimer;
    expect(active?.status).toBe('paused');
    expect(active?.pomodoro?.phase).toBe('short_break');

    // Press control to resume
    act(() => { useAppStore.getState().resume(now + 25 * 60_000); });
    expect(useAppStore.getState().activeTimer?.status).toBe('running');

    vi.useRealTimers();
  });

  it('with autoStartBreaks true, the break starts automatically and exactly once under a double-invoked effect', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    act(() => {
      useAppStore.getState().updateSettings({
        pomodoro: { ...useAppStore.getState().settings.pomodoro, autoStartBreaks: true },
      });
      const task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    vi.setSystemTime(now + 25 * 60_000);

    // Double-invoked tick in StrictMode simulation
    act(() => {
      tickCallback();
      tickCallback();
    });

    const state = useAppStore.getState();
    expect(state.activeTimer?.status).toBe('running');
    expect(state.activeTimer?.pomodoro?.phase).toBe('short_break');
    // Only 1 work session written, not skipped
    expect(state.sessions.length).toBe(1);
    expect(state.sessions[0]?.kind).toBe('pomodoro_work');

    vi.useRealTimers();
  });

  it('a break session is recorded with a break kind and does not appear in focus totals', () => {
    vi.useFakeTimers();
    let now = 100000;
    vi.setSystemTime(now);

    let task: ReturnType<typeof useAppStore.getState.prototype.addTask>;
    act(() => {
      task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    let tickCallback: () => void = () => {};
    const fakeTicker = {
      subscribe: vi.fn((fn: () => void) => {
        tickCallback = fn;
        return () => {};
      }),
    };

    renderHook(() => useTimerTick(fakeTicker));

    // Finish work (25m)
    now += 25 * 60_000;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });

    // Start & finish short break (5m)
    act(() => { useAppStore.getState().resume(now); });
    now += 5 * 60_000;
    vi.setSystemTime(now);
    act(() => { tickCallback(); });

    const state = useAppStore.getState();
    expect(state.sessions.length).toBe(2);
    expect(state.sessions[0]?.kind).toBe('pomodoro_work');
    expect(state.sessions[1]?.kind).toBe('pomodoro_short_break');

    const focusMs = totalFocusMs(state.sessions);
    expect(focusMs).toBe(25 * 60_000); // 25 min, excluding 5 min break!

    vi.useRealTimers();
  });

  it('a silent (rehydrate) pomodoro completion fires neither alarm nor notification', () => {
    vi.useFakeTimers();
    const now = 100000;
    vi.setSystemTime(now);

    act(() => {
      const task = useAppStore.getState().addTask('Pomodoro Task', 'pomodoro', null, now);
      useAppStore.getState().startTimerFor(task.id, now);
    });

    // Advance past work duration while app was closed
    const expiredNow = now + 30 * 60_000;
    vi.setSystemTime(expiredNow);

    act(() => {
      useAppStore.getState().rehydrateFromStorage(expiredNow);
    });

    renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).not.toHaveBeenCalled();
    expect(notifyModule.notify).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('after a non-silent completion is handled, store.lastCompletion is null', () => {
    act(() => {
      useAppStore.setState({
        lastCompletion: { sessionId: 'sess-1', kind: 'stopwatch', silent: false },
      });
    });

    renderHook(() => useTimerCompletion());

    expect(useAppStore.getState().lastCompletion).toBeNull();
  });

  it('unmounting and remounting the hook after a completion fires playAlarm exactly ONCE in total', () => {
    act(() => {
      useAppStore.setState({
        lastCompletion: { sessionId: 'sess-1', kind: 'stopwatch', silent: false },
      });
    });

    const { unmount } = renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).toHaveBeenCalledTimes(1);

    unmount();

    renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).toHaveBeenCalledTimes(1);
  });

  it('a silent completion also clears lastCompletion and fires nothing', () => {
    act(() => {
      useAppStore.setState({
        lastCompletion: { sessionId: 'sess-1', kind: 'stopwatch', silent: true },
      });
    });

    renderHook(() => useTimerCompletion());

    expect(soundModule.playAlarm).not.toHaveBeenCalled();
    expect(notifyModule.notify).not.toHaveBeenCalled();
    expect(useAppStore.getState().lastCompletion).toBeNull();
  });

  it('TimerControls does not offer Pause or Finish buttons for a completed task even if activeTimer is set for it', () => {
    const task = {
      id: 'completed-task-1',
      title: 'Completed Task',
      createdAt: 1000,
      mode: 'stopwatch' as const,
      targetMs: null,
      completedAt: 5000,
      completedDayKey: '2026-08-01',
      deletedAt: null,
      categoryId: null,
      tags: [],
      notes: null,
    };

    act(() => {
      useAppStore.setState({
        tasks: [task],
        activeTimer: {
          taskId: 'completed-task-1',
          kind: 'stopwatch',
          status: 'running',
          startedAt: 1000,
          accumulatedMs: 0,
          targetMs: null,
          pomodoro: null,
        },
      });
    });

    const { container } = render(<TimerControls task={task} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /finish/i })).not.toBeInTheDocument();
  });
});
