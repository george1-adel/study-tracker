import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { Session, Settings } from '../../domain/types';
import { formatPercent } from '../../domain/time/format';
import { DayTimeline } from './DayTimeline';
import { CalendarMonth } from './CalendarMonth';
import { LineChartCard } from '../../components/charts/LineChartCard';
import { buildDayRecords } from '../../domain/stats/dayRecords';

const defaultSettings: Settings = {
  theme: 'dark',
  language: 'en',
  dayStartHour: 0,
  weekStartsOn: 1,
  dailyGoalMs: 14_400_000,
  streakMinFocusMs: 900_000,
  pomodoro: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
    autoStartBreaks: false,
    autoStartWork: false,
  },
  sound: { enabled: true, volume: 0.7 },
  notifications: { enabled: true },
};

describe('Progress Feature & Components', () => {
  it('formatPercent(null) path: returns an em dash and never "NaN%"', () => {
    expect(formatPercent(null, 'en')).toBe('—');
    expect(formatPercent(undefined as unknown as number, 'en')).toBe('—');
    expect(formatPercent(NaN, 'en')).toBe('—');
  });

  it('DayTimeline orders most-recent-first', () => {
    const ts1 = new Date(2026, 2, 10, 10, 0).getTime();
    const ts2 = new Date(2026, 2, 12, 10, 0).getTime();

    const sessions: Session[] = [
      {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts1,
        endedAt: ts1 + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-03-10',
        completed: true,
      },
      {
        id: 's-2',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts2,
        endedAt: ts2 + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-03-12',
        completed: true,
      },
    ];

    const records = buildDayRecords([], sessions, defaultSettings);

    const { container } = render(
      <DayTimeline
        records={records}
        tasks={[]}
        sessions={sessions}
        settings={defaultSettings}
        locale="en"
      />
    );

    const dateHeadings = container.querySelectorAll('.day-card-date');
    expect(dateHeadings.length).toBe(2);
    // March 12, 2026 should be first (most recent), then March 10, 2026
    expect(dateHeadings[0]?.textContent).toContain('March 12');
    expect(dateHeadings[1]?.textContent).toContain('March 10');
  });

  it('selecting a day on the Progress page lists that day\'s tasks; a day with none shows the empty state', () => {
    const ts1 = new Date(2026, 2, 10, 10, 0).getTime();
    const sessions: Session[] = [
      {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts1,
        endedAt: ts1 + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-03-10',
        completed: true,
      },
    ];

    const tasks = [
      {
        id: 't-1',
        title: 'March 10 Task',
        createdAt: ts1,
        dayKey: '2026-03-10',
        mode: 'stopwatch' as const,
        targetMs: null,
        completedAt: null,
        completedDayKey: null,
        deletedAt: null,
        categoryId: null,
        tags: [],
        notes: null,
      },
    ];

    const records = buildDayRecords(tasks, sessions, defaultSettings);

    const { rerender } = render(
      <DayTimeline
        records={records}
        tasks={tasks}
        sessions={sessions}
        settings={defaultSettings}
        locale="en"
        selectedDayKey="2026-03-10"
      />
    );

    expect(screen.getByText('March 10 Task')).toBeInTheDocument();

    // Rerender with empty tasks for March 10
    rerender(
      <DayTimeline
        records={records}
        tasks={[]}
        sessions={sessions}
        settings={defaultSettings}
        locale="en"
        selectedDayKey="2026-03-10"
      />
    );

    expect(screen.queryByText('March 10 Task')).not.toBeInTheDocument();
    expect(screen.getByText('No tasks yet. Add a task above to get started.')).toBeInTheDocument();
  });

  it('previous/next month controls disable at the data edges', () => {
    const ts1 = new Date(2026, 0, 15, 10, 0).getTime(); // Jan 2026
    const ts2 = new Date(2026, 1, 15, 10, 0).getTime(); // Feb 2026

    const sessions: Session[] = [
      {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts1,
        endedAt: ts1 + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-01-15',
        completed: true,
      },
      {
        id: 's-2',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts2,
        endedAt: ts2 + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-02-15',
        completed: true,
      },
    ];

    render(
      <CalendarMonth
        tasks={[]}
        sessions={sessions}
        settings={defaultSettings}
        locale="en"
      />
    );

    const prevBtn = screen.getByRole('button', { name: /previous month/i });
    const nextBtn = screen.getByRole('button', { name: /next month/i });

    // Initial view: latest month (Feb 2026 or today's month).
    // Next button should be disabled if at max edge.
    expect(nextBtn).toBeDisabled();

    // Click previous month -> moves to Jan 2026
    fireEvent.click(prevBtn);
    expect(prevBtn).toBeDisabled();
  });

  it('calendar follows document direction while chart container stays dir="ltr"', () => {
    const ts = new Date(2026, 2, 14, 10, 0).getTime();
    const sessions: Session[] = [
      {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: ts,
        endedAt: ts + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-03-14',
        completed: true,
      },
    ];

    const { container: calContainer } = render(
      <div dir="rtl">
        <CalendarMonth
          tasks={[]}
          sessions={sessions}
          settings={defaultSettings}
          locale="ar"
        />
      </div>
    );

    const calCard = calContainer.querySelector('.calendar-month-card');
    expect(calCard).toBeInTheDocument();
    // CalendarMonth card does NOT force dir="ltr", so it inherits document direction (rtl)
    expect(calCard).not.toHaveAttribute('dir', 'ltr');

    const { container: chartContainer } = render(
      <div dir="rtl">
        <LineChartCard
          title="Chart"
          data={[{ x: 'A', y: 1 }]}
          xKey="x"
          series={[{ key: 'y', name: 'Y', colorType: 'focus' }]}
        />
      </div>
    );

    const chartInner = chartContainer.querySelector('.chart-container');
    expect(chartInner).toBeInTheDocument();
    // Chart container IS explicitly forced dir="ltr"
    expect(chartInner).toHaveAttribute('dir', 'ltr');
  });
});
