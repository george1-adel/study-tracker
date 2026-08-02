import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { TodayTape } from './TodayTape';
import { dayKeyFromTimestamp } from '../../domain/time/dayKey';

describe('TodayTape Feature Component', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.getState().resetAll();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders tape container with dir="ltr" and empty state placeholder when no sessions exist', () => {
    render(<TodayTape />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('dir', 'ltr');
    expect(screen.getAllByText('Nothing on the tape yet. Start a timer.')[0]).toBeInTheDocument();
  });

  it('renders recorded sessions on the tape bed', () => {
    const now = Date.now();
    const dayKey = dayKeyFromTimestamp(now, 0);

    act(() => {
      useAppStore.setState({
        sessions: [
          {
            id: 'session-1',
            taskId: 'task-1',
            kind: 'stopwatch',
            startedAt: now - 3600_000,
            endedAt: now - 1800_000,
            durationMs: 1800_000,
            dayKey,
            completed: true,
          },
          {
            id: 'session-2',
            taskId: 'task-1',
            kind: 'pomodoro_short_break',
            startedAt: now - 1800_000,
            endedAt: now - 1500_000,
            durationMs: 300_000,
            dayKey,
            completed: true,
          },
        ],
      });
    });

    const { container } = render(<TodayTape />);
    const focusBlock = container.querySelector('.tape-block-focus');
    const breakBlock = container.querySelector('.tape-block-break');

    expect(focusBlock).toBeInTheDocument();
    expect(breakBlock).toBeInTheDocument();
  });

  it('a day containing a sub-minute focus session reports the EXACT true total (3h 5m, not 3h 9m)', () => {
    const baseTs = new Date(2026, 7, 1, 8, 0).getTime(); // 08:00 on 2026-08-01
    vi.useFakeTimers();
    vi.setSystemTime(baseTs);
    const dayKey = dayKeyFromTimestamp(baseTs, 0);

    const s1 = { id: 's1', taskId: 't1', kind: 'stopwatch' as const, startedAt: baseTs, endedAt: baseTs + 40 * 60_000, durationMs: 40 * 60_000, dayKey, completed: true }; // 40m
    const s2 = { id: 's2', taskId: 't1', kind: 'stopwatch' as const, startedAt: baseTs + 45 * 60_000, endedAt: baseTs + 70 * 60_000, durationMs: 25 * 60_000, dayKey, completed: true }; // 25m
    const s3 = { id: 's3', taskId: 't1', kind: 'stopwatch' as const, startedAt: baseTs + 75 * 60_000, endedAt: baseTs + 100 * 60_000, durationMs: 25 * 60_000, dayKey, completed: true }; // 25m
    const s4 = { id: 's4', taskId: 't1', kind: 'stopwatch' as const, startedAt: baseTs + 105 * 60_000, endedAt: baseTs + 200 * 60_000, durationMs: 95 * 60_000, dayKey, completed: true }; // 95m
    const s5 = { id: 's5', taskId: 't1', kind: 'stopwatch' as const, startedAt: baseTs + 205 * 60_000, endedAt: baseTs + 205 * 60_000 + 40_000, durationMs: 40_000, dayKey, completed: true }; // 40s

    act(() => {
      useAppStore.setState({
        sessions: [s1, s2, s3, s4, s5],
      });
    });

    render(<TodayTape />);
    const region = screen.getByRole('region');
    const summary = region.getAttribute('aria-label') ?? '';

    expect(summary).toContain('3h 5m');
    expect(summary).not.toContain('3h 9m');
  });

  it('a focus session that crosses midnight is not under-reported in the summary', () => {
    const startTs = new Date(2026, 7, 1, 22, 0).getTime(); // 22:00
    vi.useFakeTimers();
    vi.setSystemTime(startTs);
    const endTs = startTs + 4 * 3600_000; // 02:00 next day (4 hours total)
    const dayKey = dayKeyFromTimestamp(startTs, 0);

    act(() => {
      useAppStore.setState({
        sessions: [
          {
            id: 's-cross',
            taskId: 't1',
            kind: 'stopwatch',
            startedAt: startTs,
            endedAt: endTs,
            durationMs: 4 * 3600_000,
            dayKey,
            completed: true,
          },
        ],
      });
    });

    render(<TodayTape />);
    const region = screen.getByRole('region');
    const summary = region.getAttribute('aria-label') ?? '';

    expect(summary).toContain('4h');
  });

  it('the "most recent" clause names the most recent FOCUS session when a break started later', () => {
    const focusStart = new Date(2026, 7, 1, 10, 0).getTime();
    vi.useFakeTimers();
    vi.setSystemTime(focusStart);
    const focusEnd = new Date(2026, 7, 1, 11, 0).getTime();
    const breakStart = new Date(2026, 7, 1, 11, 0).getTime();
    const breakEnd = new Date(2026, 7, 1, 11, 15).getTime();
    const dayKey = dayKeyFromTimestamp(focusStart, 0);

    act(() => {
      useAppStore.setState({
        sessions: [
          {
            id: 's-focus',
            taskId: 't1',
            kind: 'stopwatch',
            startedAt: focusStart,
            endedAt: focusEnd,
            durationMs: 3600_000,
            dayKey,
            completed: true,
          },
          {
            id: 's-break',
            taskId: 't1',
            kind: 'pomodoro_short_break',
            startedAt: breakStart,
            endedAt: breakEnd,
            durationMs: 15 * 60_000,
            dayKey,
            completed: true,
          },
        ],
      });
    });

    render(<TodayTape />);
    const region = screen.getByRole('region');
    const summary = region.getAttribute('aria-label') ?? '';

    expect(summary).toContain('1 focus session');
    expect(summary).toContain('most recent 10:00 to 11:00');
    expect(summary).not.toContain('11:15');
  });
});
