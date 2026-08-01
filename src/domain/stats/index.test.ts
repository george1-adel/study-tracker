import { describe, it, expect } from 'vitest';
import * as stats from './index';

describe('stats index exports', () => {
  it('exports all expected domain stats functions', () => {
    expect(typeof stats.buildDayRecords).toBe('function');
    expect(typeof stats.getDayRecord).toBe('function');
    expect(typeof stats.taskCompletionRatio).toBe('function');
    expect(typeof stats.totalFocusMs).toBe('function');
    expect(typeof stats.weeklyFocusMs).toBe('function');
    expect(typeof stats.monthlyFocusMs).toBe('function');
    expect(typeof stats.avgDailyFocusMs).toBe('function');
    expect(typeof stats.avgTaskCompletionMs).toBe('function');
    expect(typeof stats.completedTaskCount).toBe('function');
    expect(typeof stats.incompleteTaskCount).toBe('function');
    expect(typeof stats.pomodoroCount).toBe('function');
    expect(typeof stats.stopwatchCount).toBe('function');
    expect(typeof stats.longestSessionMs).toBe('function');
    expect(typeof stats.shortestSessionMs).toBe('function');
    expect(typeof stats.bestDay).toBe('function');
    expect(typeof stats.bestWeekday).toBe('function');
    expect(typeof stats.bestWeek).toBe('function');
    expect(typeof stats.bestMonth).toBe('function');
    expect(typeof stats.focusMsByCategory).toBe('function');
  });
});
