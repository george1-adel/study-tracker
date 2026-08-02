import { describe, expect, it, vi } from 'vitest';
import type { PersistedState, Session, Task } from '../domain/types';
import { DEFAULT_SETTINGS, emptyState } from '../domain/types';
import {
  createLocalStorageAdapter,
  createMemoryAdapter,
  loadState,
  saveState,
} from './storage';

describe('platform/storage', () => {
  it('round trip: saveState then loadState returns a deep-equal state with recovered === false', () => {
    const adapter = createMemoryAdapter();
    const state: PersistedState = {
      ...emptyState(),
      tasks: [
        {
          id: 'task-1',
          title: 'Math Study',
          createdAt: 1700000000000,
          dayKey: '2023-11-14',
          mode: 'stopwatch',
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: ['school'],
          notes: 'Chapter 1',
        },
      ],
    };

    saveState(adapter, state);
    const loaded = loadState(adapter);
    expect(loaded.recovered).toBe(false);
    expect(loaded.state).toEqual(state);
  });

  it('handles adapter empty (null) -> defaults, recovered true', () => {
    const adapter = createMemoryAdapter(null);
    const loaded = loadState(adapter);
    expect(loaded.recovered).toBe(true);
    expect(loaded.state).toEqual(emptyState());
  });

  it("handles '', 'null', 'undefined', '{' -> defaults, recovered true, no throw", () => {
    const badStrings = ['', 'null', 'undefined', '{'];
    for (const str of badStrings) {
      const adapter = createMemoryAdapter(str);
      let loaded: { state: PersistedState; recovered: boolean } | undefined;
      expect(() => {
        loaded = loadState(adapter);
      }).not.toThrow();
      expect(loaded?.recovered).toBe(true);
      expect(loaded?.state).toEqual(emptyState());
    }
  });

  it("handles '[]', '\"a string\"', and '42' -> defaults, recovered true", () => {
    const nonObjects = ['[]', '"a string"', '42'];
    for (const str of nonObjects) {
      const adapter = createMemoryAdapter(str);
      const loaded = loadState(adapter);
      expect(loaded.recovered).toBe(true);
      expect(loaded.state).toEqual(emptyState());
    }
  });

  it("handles schemaVersion 0, 3, missing, 'x' -> defaults, recovered true", () => {
    const badVersions = [
      JSON.stringify({ ...emptyState(), schemaVersion: 0 }),
      JSON.stringify({ ...emptyState(), schemaVersion: 3 }),
      JSON.stringify({ tasks: [], sessions: [], settings: DEFAULT_SETTINGS }),
      JSON.stringify({ ...emptyState(), schemaVersion: 'x' }),
    ];

    for (const str of badVersions) {
      const adapter = createMemoryAdapter(str);
      const loaded = loadState(adapter);
      expect(loaded.recovered).toBe(true);
      expect(loaded.state).toEqual(emptyState());
    }
  });

  it('preserves two good tasks when one malformed task is present', () => {
    const task1: Task = {
      id: 'task-1',
      title: 'Valid 1',
      createdAt: 1000,
      dayKey: '1970-01-01',
      mode: 'stopwatch',
      targetMs: null,
      completedAt: null,
      completedDayKey: null,
      deletedAt: null,
      categoryId: null,
      tags: [],
      notes: null,
    };
    const task2: Task = {
      id: 'task-2',
      title: 'Valid 2',
      createdAt: 2000,
      dayKey: '1970-01-01',
      mode: 'countdown',
      targetMs: 1800000,
      completedAt: null,
      completedDayKey: null,
      deletedAt: null,
      categoryId: null,
      tags: [],
      notes: null,
    };
    const malformedTask = {
      id: 'task-bad',
      title: 'Bad Task',
      createdAt: 'invalid-timestamp',
      mode: 'stopwatch',
    };

    const raw = {
      ...emptyState(),
      tasks: [task1, malformedTask, task2],
    };

    const adapter = createMemoryAdapter(JSON.stringify(raw));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(true);
    expect(loaded.state.tasks).toEqual([task1, task2]);
  });

  it('preserves two good sessions when one malformed session is present', () => {
    const session1: Session = {
      id: 's1',
      taskId: 't1',
      kind: 'stopwatch',
      startedAt: 1700000000000,
      endedAt: 1700001000000,
      durationMs: 1000000,
      dayKey: '2023-11-14',
      completed: true,
    };
    const session2: Session = {
      id: 's2',
      taskId: 't1',
      kind: 'pomodoro_work',
      startedAt: 1700002000000,
      endedAt: 1700003000000,
      durationMs: 1000000,
      dayKey: '2023-11-14',
      completed: false,
    };
    const malformedSession = {
      id: 's-bad',
      taskId: 't1',
      kind: 'unknown_kind',
      startedAt: 1000,
    };

    const raw = {
      ...emptyState(),
      sessions: [session1, malformedSession, session2],
    };

    const adapter = createMemoryAdapter(JSON.stringify(raw));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(true);
    expect(loaded.state.sessions).toEqual([session1, session2]);
  });

  it('partially recovers settings with invalid fields while keeping valid ones', () => {
    const rawSettings = {
      ...DEFAULT_SETTINGS,
      dayStartHour: 25,
      weekStartsOn: 3,
      sound: { enabled: true, volume: 5 },
      theme: 'blue',
      dailyGoalMs: 7200000,
    };

    const raw = {
      ...emptyState(),
      settings: rawSettings,
    };

    const adapter = createMemoryAdapter(JSON.stringify(raw));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(true);
    expect(loaded.state.settings.dayStartHour).toBe(DEFAULT_SETTINGS.dayStartHour);
    expect(loaded.state.settings.weekStartsOn).toBe(DEFAULT_SETTINGS.weekStartsOn);
    expect(loaded.state.settings.sound.volume).toBe(DEFAULT_SETTINGS.sound.volume);
    expect(loaded.state.settings.sound.enabled).toBe(true);
    expect(loaded.state.settings.theme).toBe(DEFAULT_SETTINGS.theme);
    expect(loaded.state.settings.dailyGoalMs).toBe(7200000);
  });

  it('recomputes dayKey from startedAt when dayKey is invalid', () => {
    const startedAt = new Date(2026, 7, 1, 10, 0, 0).getTime();
    const badSession = {
      id: 's1',
      taskId: 't1',
      kind: 'stopwatch',
      startedAt,
      endedAt: startedAt + 1000,
      durationMs: 1000,
      dayKey: 'invalid-day-key',
      completed: true,
    };

    const raw = {
      ...emptyState(),
      sessions: [badSession],
    };

    const adapter = createMemoryAdapter(JSON.stringify(raw));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(true);
    expect(loaded.state.sessions.length).toBe(1);
    expect(loaded.state.sessions[0]?.dayKey).toBe('2026-08-01');
  });

  it('resets activeTimer to null if missing taskId or bad status', () => {
    const rawBadStatus = {
      ...emptyState(),
      activeTimer: {
        taskId: 't1',
        kind: 'stopwatch',
        status: 'invalid_status',
        startedAt: 1000,
        accumulatedMs: 0,
        targetMs: null,
        pomodoro: null,
      },
    };

    const loaded1 = loadState(createMemoryAdapter(JSON.stringify(rawBadStatus)));
    expect(loaded1.recovered).toBe(true);
    expect(loaded1.state.activeTimer).toBeNull();

    const rawMissingTask = {
      ...emptyState(),
      activeTimer: {
        taskId: '',
        kind: 'stopwatch',
        status: 'running',
        startedAt: 1000,
        accumulatedMs: 0,
        targetMs: null,
        pomodoro: null,
      },
    };

    const loaded2 = loadState(createMemoryAdapter(JSON.stringify(rawMissingTask)));
    expect(loaded2.recovered).toBe(true);
    expect(loaded2.state.activeTimer).toBeNull();
  });

  it('does not throw when localStorage adapter write throws', () => {
    const localStorageAdapter = createLocalStorageAdapter('test_key');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      saveState(localStorageAdapter, emptyState());
    }).not.toThrow();

    vi.restoreAllMocks();
  });

  it("a v1 blob migrates to v2 with each task's dayKey derived from its createdAt, and NO data lost", () => {
    // 2026-08-01 10:00:00 local time timestamp
    const createdAt = new Date(2026, 7, 1, 10, 0, 0).getTime();
    const v1Blob = {
      schemaVersion: 1,
      tasks: [
        {
          id: 'v1-task-1',
          title: 'V1 Task',
          createdAt,
          mode: 'stopwatch',
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
      ],
      sessions: [],
      settings: DEFAULT_SETTINGS,
      activeTimer: null,
    };

    const adapter = createMemoryAdapter(JSON.stringify(v1Blob));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(false);
    expect(loaded.state.schemaVersion).toBe(2);
    expect(loaded.state.tasks.length).toBe(1);
    expect(loaded.state.tasks[0]?.dayKey).toBe('2026-08-01');
  });

  it('a v2 task with a missing or invalid dayKey is repaired from createdAt, not dropped', () => {
    const createdAt = new Date(2026, 7, 1, 10, 0, 0).getTime();
    const v2BlobMissingDayKey = {
      schemaVersion: 2,
      tasks: [
        {
          id: 'v2-task-missing',
          title: 'Missing DayKey Task',
          createdAt,
          // dayKey omitted
          mode: 'stopwatch',
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
        {
          id: 'v2-task-invalid',
          title: 'Invalid DayKey Task',
          createdAt,
          dayKey: 'invalid-day-key-str',
          mode: 'stopwatch',
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
      ],
      sessions: [],
      settings: DEFAULT_SETTINGS,
      activeTimer: null,
    };

    const adapter = createMemoryAdapter(JSON.stringify(v2BlobMissingDayKey));
    const loaded = loadState(adapter);

    expect(loaded.recovered).toBe(true);
    expect(loaded.state.tasks.length).toBe(2);
    expect(loaded.state.tasks[0]?.dayKey).toBe('2026-08-01');
    expect(loaded.state.tasks[1]?.dayKey).toBe('2026-08-01');
  });
});
