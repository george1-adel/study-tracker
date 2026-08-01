import { describe, expect, it } from 'vitest';
import {
  BREAK_KINDS,
  DEFAULT_SETTINGS,
  FOCUS_KINDS,
  SCHEMA_VERSION,
  STORAGE_KEY,
  emptyState,
  isFocusKind,
} from './types';

describe('domain/types', () => {
  it('classifies focus and break kinds correctly for all five SessionKind values', () => {
    expect(isFocusKind('stopwatch')).toBe(true);
    expect(isFocusKind('countdown')).toBe(true);
    expect(isFocusKind('pomodoro_work')).toBe(true);
    expect(isFocusKind('pomodoro_short_break')).toBe(false);
    expect(isFocusKind('pomodoro_long_break')).toBe(false);

    expect(FOCUS_KINDS).toEqual(['stopwatch', 'countdown', 'pomodoro_work']);
    expect(BREAK_KINDS).toEqual(['pomodoro_short_break', 'pomodoro_long_break']);
  });

  it('matches DEFAULT_SETTINGS from docs/DOMAIN.md exactly', () => {
    expect(DEFAULT_SETTINGS).toEqual({
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
      sound: {
        enabled: true,
        volume: 0.7,
      },
      notifications: {
        enabled: true,
      },
    });
  });

  it('returns valid empty state', () => {
    const state = emptyState();
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.tasks).toEqual([]);
    expect(state.sessions).toEqual([]);
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.activeTimer).toBeNull();
    expect(STORAGE_KEY).toBe('study-tracker:v1');
  });
});
