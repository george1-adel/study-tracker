import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Task, Session, Settings } from '../../domain/types';
import { useAppStore } from '../../store/useAppStore';
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
  bestDay,
  bestWeekday,
  bestWeek,
  bestMonth,
} from '../../domain/stats';
import { StatGrid } from './StatGrid';
import { StreakPanel } from './StreakPanel';
import { StreakFlame } from '../../components/StreakFlame';
import { YearHeatmap } from './YearHeatmap';
import { AnalyticsCharts } from './AnalyticsCharts';
import { AnalyticsPage } from './AnalyticsPage';

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

describe('Analytics Feature', () => {
  beforeEach(() => {
    useAppStore.setState({
      tasks: [],
      sessions: [],
      settings: defaultSettings,
    });
  });

  describe('Empty History (Zero Data)', () => {
    it('renders cleanly with ZERO data without throwing and shows no "NaN", "Infinity", or "Invalid"', () => {
      const { container } = render(<AnalyticsPage />);

      const textContent = container.textContent || '';
      expect(textContent).not.toContain('NaN');
      expect(textContent).not.toContain('Infinity');
      expect(textContent).not.toContain('Invalid');

      // Stat cards should render em dashes for empty duration stats
      const emDashes = screen.getAllByText('—');
      expect(emDashes.length).toBeGreaterThan(0);
    });
  });

  describe('Stat Grid & Domain Functions', () => {
    it('traces stat card values to domain stats functions', () => {
      const now = new Date(2026, 7, 1, 12, 0).getTime(); // Aug 1, 2026

      const tasks: Task[] = [
        {
          id: 't-1',
          title: 'Task 1',
          mode: 'stopwatch',
          targetMs: null,
          completedAt: now,
          completedDayKey: '2026-08-01',
          deletedAt: null,
          createdAt: now - 86400_000,
          categoryId: null,
          tags: [],
          notes: null,
        },
        {
          id: 't-2',
          title: 'Task 2',
          mode: 'pomodoro',
          targetMs: 1500_000,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          createdAt: now,
          categoryId: null,
          tags: [],
          notes: null,
        },
      ];

      const sessions: Session[] = [
        {
          id: 's-1',
          taskId: 't-1',
          kind: 'stopwatch',
          startedAt: now - 3600_000,
          endedAt: now,
          durationMs: 3600_000,
          dayKey: '2026-08-01',
          completed: true,
        },
        {
          id: 's-2',
          taskId: 't-2',
          kind: 'pomodoro_work',
          startedAt: now - 86400_000,
          endedAt: now - 86400_000 + 1500_000,
          durationMs: 1500_000,
          dayKey: '2026-07-31',
          completed: true,
        },
      ];

      // Domain expectations
      expect(totalFocusMs(sessions)).toBe(5100_000);
      expect(weeklyFocusMs(sessions, now, defaultSettings)).toBe(5100_000);
      expect(monthlyFocusMs(sessions, now, defaultSettings)).toBe(3600_000);
      expect(avgDailyFocusMs(sessions)).toBe(2550_000);
      expect(avgTaskCompletionMs(tasks, sessions)).toBe(3600_000);
      expect(completedTaskCount(tasks)).toBe(1);
      expect(incompleteTaskCount(tasks)).toBe(1);
      expect(pomodoroCount(sessions)).toBe(1);
      expect(stopwatchCount(sessions)).toBe(1);
      expect(longestSessionMs(sessions)).toBe(3600_000);
      expect(shortestSessionMs(sessions)).toBe(1500_000);

      render(
        <StatGrid
          tasks={tasks}
          sessions={sessions}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      expect(screen.getByText('Completed tasks')).toBeInTheDocument();
      expect(screen.getByText('Incomplete tasks')).toBeInTheDocument();
      expect(screen.getAllByText('1h 25m').length).toBeGreaterThan(0); // totalFocusMs & weeklyFocusMs
    });

    it('renders "Best day", "Best weekday", "Best week", and "Best month" distinctly', () => {
      const now = new Date(2026, 7, 1, 12, 0).getTime();
      const sessions: Session[] = [
        {
          id: 's-1',
          taskId: 't-1',
          kind: 'stopwatch',
          startedAt: now,
          endedAt: now + 3600_000,
          durationMs: 3600_000,
          dayKey: '2026-08-01',
          completed: true,
        },
      ];

      // Domain function assertions
      expect(bestDay(sessions)).not.toBeNull();
      expect(bestWeekday(sessions)).not.toBeNull();
      expect(bestWeek(sessions, defaultSettings)).not.toBeNull();
      expect(bestMonth(sessions)).not.toBeNull();

      render(
        <StatGrid
          tasks={[]}
          sessions={sessions}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      expect(screen.getByText('Best day')).toBeInTheDocument();
      expect(screen.getByText('Best weekday')).toBeInTheDocument();
      expect(screen.getByText('Best week')).toBeInTheDocument();
      expect(screen.getByText('Best month')).toBeInTheDocument();
    });
  });

  describe('Streak Panel', () => {
    it('renders all three states correctly, and at_risk shows streak as intact rather than 0', () => {
      const now = new Date(2026, 7, 2, 12, 0).getTime(); // Sunday 2026-08-02

      // 1. Broken state
      const { rerender, container } = render(
        <StreakPanel
          sessions={[]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );
      expect(screen.getByText('Streak broken')).toBeInTheDocument();
      const badge = container.querySelector('.streak-state-badge');
      expect(badge).toHaveClass('streak-state-broken');
      expect(container.querySelector('.streak-flame')).toHaveClass('streak-flame-broken');

      // 2. At risk state (yesterday 2026-08-01 counted, today 2026-08-02 has not yet)
      const yesterdaySession: Session = {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: new Date(2026, 7, 1, 10, 0).getTime(),
        endedAt: new Date(2026, 7, 1, 10, 30).getTime(),
        durationMs: 1800_000, // 30m >= 15m min streak
        dayKey: '2026-08-01',
        completed: true,
      };

      rerender(
        <StreakPanel
          sessions={[yesterdaySession]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      // Should indicate streak is INTACT ("Streak intact. Today not counted yet.")
      expect(screen.getByText('Streak intact. Today not counted yet.')).toBeInTheDocument();
      expect(badge).toHaveClass('streak-state-at_risk');
      expect(container.querySelector('.streak-flame')).toHaveClass('streak-flame-at_risk');
      // Count display should show 1, not 0!
      const countDisplay = container.querySelector('.streak-count-display');
      expect(countDisplay?.textContent).toBe('1');

      // 3. Active state (today 2026-08-02 counted as well)
      const todaySession: Session = {
        id: 's-2',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: new Date(2026, 7, 2, 10, 0).getTime(),
        endedAt: new Date(2026, 7, 2, 10, 30).getTime(),
        durationMs: 1800_000,
        dayKey: '2026-08-02',
        completed: true,
      };

      rerender(
        <StreakPanel
          sessions={[yesterdaySession, todaySession]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      expect(screen.getByText('Streak active')).toBeInTheDocument();
      expect(badge).toHaveClass('streak-state-active');
      expect(container.querySelector('.streak-flame')).toHaveClass('streak-flame-active');
      expect(countDisplay?.textContent).toBe('2');
    });

    it('displays unobtrusive rule notice regarding streakMinFocusMs', () => {
      const now = Date.now();
      render(
        <StreakPanel
          sessions={[]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      expect(
        screen.getByText(/A day counts toward your streak when you log at least 15m of focus time/i)
      ).toBeInTheDocument();
    });

    it('renders distinct outer and inner paths for the active flame state', () => {
      const { container } = render(<StreakFlame state="active" />);
      const outerPath = container.querySelector('.streak-flame-outer');
      const innerPath = container.querySelector('.streak-flame-inner');

      expect(outerPath).not.toBeNull();
      expect(innerPath).not.toBeNull();

      const outerD = outerPath?.getAttribute('d');
      const innerD = innerPath?.getAttribute('d');

      expect(outerD).toBeTruthy();
      expect(innerD).toBeTruthy();
      expect(outerD).not.toEqual(innerD);
    });
  });

  describe('Year Heatmap', () => {
    it('renders 365 or more cells for a full year and does not drop a week at boundary', () => {
      const now = new Date(2026, 7, 1, 12, 0).getTime();
      const { container } = render(
        <YearHeatmap
          sessions={[]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      const heatmapCells = container.querySelectorAll('.heatmap-cell');
      // Full year anchored to week boundaries should render at least 365 cells
      expect(heatmapCells.length).toBeGreaterThanOrEqual(365);
    });

    it('renders a day with NO sessions distinctly from a day with focus time', () => {
      const now = new Date(2026, 7, 1, 12, 0).getTime();
      const focusSession: Session = {
        id: 's-1',
        taskId: 't-1',
        kind: 'stopwatch',
        startedAt: now,
        endedAt: now + 1800_000,
        durationMs: 1800_000,
        dayKey: '2026-08-01',
        completed: true,
      };

      const { container } = render(
        <YearHeatmap
          sessions={[focusSession]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      const emptyCells = container.querySelectorAll('.heatmap-cell-empty');
      const activeCells = container.querySelectorAll('.heatmap-cell-active');

      expect(emptyCells.length).toBeGreaterThan(0);
      expect(activeCells.length).toBe(1);
    });
  });

  describe('Analytics Charts', () => {
    it('renders chart components cleanly with zero data', () => {
      const now = Date.now();
      const { container } = render(
        <AnalyticsCharts
          tasks={[]}
          sessions={[]}
          settings={defaultSettings}
          now={now}
          locale="en"
        />
      );

      expect(container.querySelectorAll('.chart-card').length).toBe(4);
    });
  });
});
