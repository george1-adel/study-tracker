import { describe, expect, it } from 'vitest';
import { createMemoryAdapter, loadState } from './storage';

// A realistic schemaVersion:1 blob shaped like the user's deployed data:
// two completed stopwatch tasks from Aug 1 with their sessions, no dayKey on tasks.
const V1 = JSON.stringify({
  schemaVersion: 1,
  tasks: [
    { id: 't1', title: 'study : (Web LLM attacks)', createdAt: new Date(2026,7,1,9,30).getTime(),
      mode: 'stopwatch', targetMs: null, completedAt: new Date(2026,7,1,11,0).getTime(),
      completedDayKey: '2026-08-01', deletedAt: null, categoryId: null, tags: [], notes: null },
    { id: 't2', title: 'hunt (reddit) Phone Number', createdAt: new Date(2026,7,1,14,0).getTime(),
      mode: 'stopwatch', targetMs: null, completedAt: new Date(2026,7,1,15,20).getTime(),
      completedDayKey: '2026-08-01', deletedAt: null, categoryId: null, tags: [], notes: null },
    { id: 't3', title: 'unfinished from july', createdAt: new Date(2026,6,28,20,0).getTime(),
      mode: 'countdown', targetMs: 1500000, completedAt: null,
      completedDayKey: null, deletedAt: null, categoryId: null, tags: [], notes: null },
  ],
  sessions: [
    { id: 's1', taskId: 't1', kind: 'stopwatch', startedAt: new Date(2026,7,1,9,30).getTime(),
      endedAt: new Date(2026,7,1,11,0).getTime(), durationMs: 5400000, dayKey: '2026-08-01', completed: true },
    { id: 's2', taskId: 't2', kind: 'stopwatch', startedAt: new Date(2026,7,1,14,0).getTime(),
      endedAt: new Date(2026,7,1,15,20).getTime(), durationMs: 4800000, dayKey: '2026-08-01', completed: true },
  ],
  settings: { theme: 'dark', language: 'en', dayStartHour: 0, weekStartsOn: 1,
    dailyGoalMs: 14400000, streakMinFocusMs: 900000,
    pomodoro: { workMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15,
      cyclesBeforeLongBreak: 4, autoStartBreaks: false, autoStartWork: false },
    sound: { enabled: true, volume: 0.7 }, notifications: { enabled: true } },
  activeTimer: null,
});

describe('v1 -> v2 upgrade of real deployed data', () => {
  it('keeps every task and session, and derives dayKey from createdAt', () => {
    const { state, recovered } = loadState(createMemoryAdapter(V1));
    expect(recovered).toBe(false);            // an upgrade is NOT a data-loss recovery
    expect(state.tasks).toHaveLength(3);
    expect(state.sessions).toHaveLength(2);
    expect(state.tasks.map(t => t.title)).toEqual([
      'study : (Web LLM attacks)', 'hunt (reddit) Phone Number', 'unfinished from july']);
    expect(state.tasks[0]!.dayKey).toBe('2026-08-01');
    expect(state.tasks[1]!.dayKey).toBe('2026-08-01');
    expect(state.tasks[2]!.dayKey).toBe('2026-07-28');
    // history untouched
    expect(state.sessions[0]!.dayKey).toBe('2026-08-01');
    expect(state.sessions[0]!.durationMs).toBe(5400000);
    expect(state.settings.dailyGoalMs).toBe(14400000);
  });

  it('repairs a v2 task with a missing or invalid dayKey instead of dropping it', () => {
    const v2 = JSON.parse(V1);
    v2.schemaVersion = 2;
    delete v2.tasks[0].dayKey;
    v2.tasks[1].dayKey = '2026-02-30';
    const { state } = loadState(createMemoryAdapter(JSON.stringify(v2)));
    expect(state.tasks).toHaveLength(3);
    expect(state.tasks[0]!.dayKey).toBe('2026-08-01');
    expect(state.tasks[1]!.dayKey).toBe('2026-08-01');
  });
});
