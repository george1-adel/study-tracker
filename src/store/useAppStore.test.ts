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
          updatedAt: 1000,
          dayKey: '1970-01-01',
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
          updatedAt: 1000,
          dayKey: '1970-01-01',
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
      settingsUpdatedAt: 0,
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

  it("ticking a running task's checkbox writes a session, clears activeTimer, completes the task, and leaves lastCompletion null", () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const startTs = 10000;
    const finishTs = 15000;
    const task = store.getState().addTask('Task A', 'stopwatch', null, startTs);
    store.getState().startTimerFor(task.id, startTs);

    expect(store.getState().activeTimer?.taskId).toBe(task.id);

    store.getState().toggleTaskCompleted(task.id, finishTs);

    const state = store.getState();

    // clears activeTimer, completes task, and writes session, ALL in one action
    expect(state.activeTimer).toBeNull();
    expect(state.lastCompletion).toBeNull();

    const updatedTask = state.tasks.find((t) => t.id === task.id);
    expect(updatedTask?.completedAt).toBe(finishTs);
    expect(updatedTask?.completedDayKey).toBe(dayKeyFromTimestamp(finishTs, 0));

    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]?.taskId).toBe(task.id);
    expect(state.sessions[0]?.durationMs).toBe(5000);
  });

  it("ticking task B's checkbox while task A's timer runs leaves A's timer untouched and running", () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const startTs = 10000;
    const toggleTs = 15000;
    const taskA = store.getState().addTask('Task A', 'stopwatch', null, startTs);
    const taskB = store.getState().addTask('Task B', 'stopwatch', null, startTs);

    store.getState().startTimerFor(taskA.id, startTs);
    expect(store.getState().activeTimer?.taskId).toBe(taskA.id);

    store.getState().toggleTaskCompleted(taskB.id, toggleTs);

    const state = store.getState();
    expect(state.activeTimer?.taskId).toBe(taskA.id);
    expect(state.activeTimer?.status).toBe('running');

    const updatedTaskB = state.tasks.find((t) => t.id === taskB.id);
    expect(updatedTaskB?.completedAt).toBe(toggleTs);

    expect(state.sessions).toHaveLength(0);
  });

  it('unchecking a completed task starts no timer and leaves activeTimer null', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const task = store.getState().addTask('Task A', 'stopwatch', null, 10000);
    store.getState().toggleTaskCompleted(task.id, 10000);

    expect(store.getState().activeTimer).toBeNull();

    store.getState().toggleTaskCompleted(task.id, 15000);

    const state = store.getState();
    const updatedTask = state.tasks.find((t) => t.id === task.id);
    expect(updatedTask?.completedAt).toBeNull();
    expect(state.activeTimer).toBeNull();
  });

  it('a sub-second timer ticked complete writes no session but still completes the task and clears the timer', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const startTs = 10000;
    const toggleTs = 10500; // 500ms elapsed (< 1000ms sub-second)
    const task = store.getState().addTask('Task A', 'stopwatch', null, startTs);
    store.getState().startTimerFor(task.id, startTs);

    store.getState().toggleTaskCompleted(task.id, toggleTs);

    const state = store.getState();
    expect(state.activeTimer).toBeNull();
    expect(state.sessions).toHaveLength(0);

    const updatedTask = state.tasks.find((t) => t.id === task.id);
    expect(updatedTask?.completedAt).toBe(toggleTs);
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

  it('moveTaskToDay moves an unfinished task and leaves createdAt and sessions untouched', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    const createdAt = new Date(2026, 7, 1, 10, 0).getTime();
    const task = store.getState().addTask('Unfinished Task', 'pomodoro', null, createdAt);
    expect(task.dayKey).toBe('2026-08-01');

    // Add a session logged on day 1
    store.getState().startTimerFor(task.id, createdAt);
    store.getState().finish(createdAt + 1800_000);
    expect(store.getState().sessions).toHaveLength(1);
    const sessionDayKeyBefore = store.getState().sessions[0]?.dayKey;

    const newDayKey = '2026-08-02';
    store.getState().moveTaskToDay(task.id, newDayKey);

    const updatedTask = store.getState().tasks.find((t) => t.id === task.id);
    expect(updatedTask?.dayKey).toBe('2026-08-02');
    expect(updatedTask?.createdAt).toBe(createdAt);
    expect(store.getState().sessions[0]?.dayKey).toBe(sessionDayKeyBefore);
  });

  it('changing dayStartHour recomputes task dayKeys as well as session dayKeys', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    // 01:30 AM local time timestamp on Aug 2, 2026
    const ts = new Date(2026, 7, 2, 1, 30, 0).getTime();
    const task = store.getState().addTask('Night Task', 'stopwatch', null, ts);
    expect(task.dayKey).toBe('2026-08-02');

    // Start & finish a session at 01:30 AM
    store.getState().startTimerFor(task.id, ts);
    store.getState().finish(ts + 1800_000);

    expect(store.getState().sessions[0]?.dayKey).toBe('2026-08-02');

    // Change dayStartHour to 4 (so 01:30 AM belongs to Aug 1)
    store.getState().updateSettings({ dayStartHour: 4 });

    const updatedTask = store.getState().tasks.find((t) => t.id === task.id);
    expect(updatedTask?.dayKey).toBe('2026-08-01');
    expect(store.getState().sessions[0]?.dayKey).toBe('2026-08-01');
  });

  it('updates task updatedAt on addTask, editTask, deleteTask, toggleTaskCompleted, moveTaskToDay, and timer finish', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    // addTask
    const t1 = store.getState().addTask('Task 1', 'stopwatch', null, 1000);
    expect(t1.updatedAt).toBe(1000);

    // editTask
    store.getState().editTask(t1.id, { title: 'Task 1 Edited' }, 2000);
    expect(store.getState().tasks[0]?.updatedAt).toBe(2000);

    // toggleTaskCompleted
    store.getState().toggleTaskCompleted(t1.id, 3000);
    expect(store.getState().tasks[0]?.updatedAt).toBe(3000);

    // moveTaskToDay
    const t2 = store.getState().addTask('Task 2', 'stopwatch', null, 4000);
    store.getState().moveTaskToDay(t2.id, '2026-08-10', 5000);
    expect(store.getState().tasks.find((t) => t.id === t2.id)?.updatedAt).toBe(5000);

    // deleteTask
    store.getState().deleteTask(t1.id, 6000);
    expect(store.getState().tasks.find((t) => t.id === t1.id)?.updatedAt).toBe(6000);
  });

  it('updates settingsUpdatedAt on updateSettings', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    expect(store.getState().settingsUpdatedAt).toBe(0);
    store.getState().updateSettings({ theme: 'light' }, 12345);
    expect(store.getState().settingsUpdatedAt).toBe(12345);
  });
});
