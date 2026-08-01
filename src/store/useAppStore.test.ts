import { describe, expect, it } from 'vitest';
import { createAppStore } from './useAppStore';
import { createMemoryAdapter, saveState } from '../platform/storage';
import { DEFAULT_SETTINGS, SCHEMA_VERSION, type PersistedState } from '../domain/types';
import { dayKeyFromTimestamp } from '../domain/time/dayKey';

describe('useAppStore', () => {
  it('adds, edits, and soft-deletes a task', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const now = 10000;
    const task = store.getState().addTask('Study Math', 'stopwatch', null, now);
    expect(store.getState().tasks).toHaveLength(1);
    expect(store.getState().tasks[0]?.title).toBe('Study Math');
    expect(store.getState().tasks[0]?.deletedAt).toBeNull();

    store.getState().editTask(task.id, { title: 'Study Advanced Math' });
    expect(store.getState().tasks[0]?.title).toBe('Study Advanced Math');

    // Simulate session created for this task before deletion
    store.getState().startTimerFor(task.id, now);
    store.getState().finish(now + 5000);
    expect(store.getState().sessions).toHaveLength(1);

    // Soft delete
    const deleteTime = now + 10000;
    store.getState().deleteTask(task.id, deleteTime);
    expect(store.getState().tasks[0]?.deletedAt).toBe(deleteTime);

    // Session remains in sessions[] after task soft-delete
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().sessions[0]?.taskId).toBe(task.id);
  });

  it('starting a timer while one runs writes the first session and leaves exactly one activeTimer', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const t1 = store.getState().addTask('Task 1', 'stopwatch', null, 1000);
    const t2 = store.getState().addTask('Task 2', 'stopwatch', null, 1000);

    store.getState().startTimerFor(t1.id, 1000);
    expect(store.getState().activeTimer?.taskId).toBe(t1.id);

    // Start timer for t2 at now = 5000
    store.getState().startTimerFor(t2.id, 5000);

    // First session written with duration 4000ms
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().sessions[0]?.taskId).toBe(t1.id);
    expect(store.getState().sessions[0]?.durationMs).toBe(4000);

    // Exactly one activeTimer remaining (for t2)
    expect(store.getState().activeTimer?.taskId).toBe(t2.id);
  });

  it('pause/resume/finish are no-ops when not applicable (calling each twice)', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    // Calling pause, resume, finish without active timer are no-ops
    expect(() => {
      store.getState().pause(1000);
      store.getState().pause(1000);
      store.getState().resume(1000);
      store.getState().resume(1000);
      store.getState().finish(1000);
      store.getState().finish(1000);
    }).not.toThrow();

    const task = store.getState().addTask('Task', 'stopwatch', null, 1000);
    store.getState().startTimerFor(task.id, 1000);

    // Pause twice
    store.getState().pause(2000);
    const pausedState = store.getState().activeTimer;
    expect(pausedState?.status).toBe('paused');
    store.getState().pause(3000); // second call is no-op
    expect(store.getState().activeTimer).toEqual(pausedState);

    // Resume twice
    store.getState().resume(4000);
    const resumedState = store.getState().activeTimer;
    expect(resumedState?.status).toBe('running');
    store.getState().resume(5000); // second call is no-op
    expect(store.getState().activeTimer).toEqual(resumedState);

    // Finish twice
    store.getState().finish(6000);
    expect(store.getState().activeTimer).toBeNull();
    expect(store.getState().sessions).toHaveLength(1);
    store.getState().finish(7000); // second call is no-op
    expect(store.getState().sessions).toHaveLength(1);
  });

  it('finish writes a session whose durationMs matches engine elapsed, and clears activeTimer', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const task = store.getState().addTask('Study Physics', 'stopwatch', null, 1000);
    store.getState().startTimerFor(task.id, 1000);

    store.getState().finish(6000); // 5000ms elapsed

    expect(store.getState().activeTimer).toBeNull();
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().sessions[0]?.durationMs).toBe(5000);
    expect(store.getState().sessions[0]?.taskId).toBe(task.id);
  });

  it('a stopwatch finish completes the task; a pomodoro_work finish does NOT', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const stopwatchTask = store.getState().addTask('Stopwatch Task', 'stopwatch', null, 1000);
    store.getState().startTimerFor(stopwatchTask.id, 1000);
    store.getState().finish(5000);

    const updatedStopwatchTask = store.getState().tasks.find((t) => t.id === stopwatchTask.id);
    expect(updatedStopwatchTask?.completedAt).toBe(5000);
    expect(updatedStopwatchTask?.completedDayKey).toBe(dayKeyFromTimestamp(5000, 0));

    const pomodoroTask = store.getState().addTask('Pomodoro Task', 'pomodoro', null, 6000);
    store.getState().startTimerFor(pomodoroTask.id, 6000);
    store.getState().finish(10000);

    const updatedPomodoroTask = store.getState().tasks.find((t) => t.id === pomodoroTask.id);
    expect(updatedPomodoroTask?.completedAt).toBeNull();
    expect(updatedPomodoroTask?.completedDayKey).toBeNull();
  });

  it('REHYDRATE: countdown target already passed completes with silent === true; not passed stays running', () => {
    const adapter = createMemoryAdapter();

    const initialPersistedState: PersistedState = {
      schemaVersion: SCHEMA_VERSION,
      tasks: [
        {
          id: 'task-1',
          title: 'Expired Countdown',
          createdAt: 1000,
          mode: 'countdown',
          targetMs: 5000,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
        {
          id: 'task-2',
          title: 'Active Countdown',
          createdAt: 1000,
          mode: 'countdown',
          targetMs: 30000,
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
      activeTimer: {
        taskId: 'task-1',
        kind: 'countdown',
        status: 'running',
        startedAt: 1000,
        accumulatedMs: 0,
        targetMs: 5000,
        pomodoro: null,
      },
    };

    saveState(adapter, initialPersistedState);

    // Rehydrate at now = 10000 (target was reached at 6000, while app closed)
    const store = createAppStore(adapter, 10000);

    expect(store.getState().activeTimer).toBeNull();
    expect(store.getState().sessions).toHaveLength(1);
    expect(store.getState().sessions[0]?.completed).toBe(true);
    expect(store.getState().lastCompletion).toEqual({
      sessionId: store.getState().sessions[0]?.id,
      kind: 'countdown',
      silent: true,
    });
    expect(store.getState().tasks[0]?.completedAt).toBe(10000);

    // Now test a countdown that has NOT passed target yet
    const adapter2 = createMemoryAdapter();
    saveState(adapter2, {
      ...initialPersistedState,
      activeTimer: {
        taskId: 'task-2',
        kind: 'countdown',
        status: 'running',
        startedAt: 1000,
        accumulatedMs: 0,
        targetMs: 30000,
        pomodoro: null,
      },
    });

    const store2 = createAppStore(adapter2, 5000); // 4000ms elapsed out of 30000ms
    expect(store2.getState().activeTimer).not.toBeNull();
    expect(store2.getState().activeTimer?.taskId).toBe('task-2');
    expect(store2.getState().sessions).toHaveLength(0);
    expect(store2.getState().lastCompletion).toBeNull();
  });

  it('toggleTaskCompleted sets both completedAt and completedDayKey, and clearing clears both', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const now = 5000;
    const task = store.getState().addTask('Task', 'stopwatch', null, now);
    expect(task.completedAt).toBeNull();
    expect(task.completedDayKey).toBeNull();

    store.getState().toggleTaskCompleted(task.id, now);
    let updated = store.getState().tasks.find((t) => t.id === task.id);
    expect(updated?.completedAt).toBe(now);
    expect(updated?.completedDayKey).toBe(dayKeyFromTimestamp(now, 0));

    // Clear completion
    store.getState().toggleTaskCompleted(task.id, now + 1000);
    updated = store.getState().tasks.find((t) => t.id === task.id);
    expect(updated?.completedAt).toBeNull();
    expect(updated?.completedDayKey).toBeNull();
  });

  it('importState with a hostile blob returns false and leaves existing state untouched', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const task = store.getState().addTask('Original Task', 'stopwatch', null, 1000);

    const hostileBlobs = [
      'invalid json {{{',
      '12345',
      '"just a string"',
      '{"schemaVersion": 999}',
      '{"schemaVersion": 1, "tasks": "not an array"}',
      '{"schemaVersion": 1, "tasks": [{"invalid": true}]}',
    ];

    for (const blob of hostileBlobs) {
      const result = store.getState().importState(blob);
      expect(result).toBe(false);
      expect(store.getState().tasks).toHaveLength(1);
      expect(store.getState().tasks[0]?.id).toBe(task.id);
    }
  });

  it('state survives a save/load round trip through a memory adapter', () => {
    const adapter = createMemoryAdapter();
    const store1 = createAppStore(adapter);

    const t = store1.getState().addTask('Persistent Task', 'countdown', 1500000, 1000);
    store1.getState().startTimerFor(t.id, 1000);
    store1.getState().pause(5000);
    store1.getState().updateSettings({ theme: 'light', dayStartHour: 4 });

    const rawExported = store1.getState().exportState();

    // Create a second store loading from the same adapter
    const store2 = createAppStore(adapter);

    expect(store2.getState().tasks).toEqual(store1.getState().tasks);
    expect(store2.getState().settings).toEqual(store1.getState().settings);
    expect(store2.getState().activeTimer).toEqual(store1.getState().activeTimer);

    // Also import state into a fresh store
    const store3 = createAppStore(createMemoryAdapter());
    const importSuccess = store3.getState().importState(rawExported);
    expect(importSuccess).toBe(true);
    expect(store3.getState().tasks).toEqual(store1.getState().tasks);
    expect(store3.getState().settings).toEqual(store1.getState().settings);
  });
});
