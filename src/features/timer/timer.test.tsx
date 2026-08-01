import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppStore } from '../../store/useAppStore';
import { TimerPanel } from './TimerPanel';
import { useTimerTick } from './useTimerTick';
import { useTimerCompletion } from './useTimerCompletion';
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
});
