import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../store/useAppStore';
import { TodayTape } from './TodayTape';

describe('TodayTape Feature Component', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.getState().resetAll();
    });
  });

  it('renders tape container with dir="ltr" and empty state placeholder when no sessions exist', () => {
    render(<TodayTape />);
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('dir', 'ltr');
    expect(screen.getAllByText('Nothing on the tape yet. Start a timer.')[0]).toBeInTheDocument();
  });

  it('renders recorded sessions on the tape bed', () => {
    const now = Date.now();
    const dayKey = '2026-08-01' as const;

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
});
