import { describe, expect, it } from 'vitest';
import { mergeStates, type SyncableState } from './merge';
import { makeTask, makeSession, makeSettings } from '../stats/fixtures';

function assertMergeCommutative(a: SyncableState, b: SyncableState): SyncableState {
  const ab = mergeStates(a, b);
  const ba = mergeStates(b, a);
  expect(ab).toEqual(ba);
  return ab;
}

function emptySyncableState(): SyncableState {
  return {
    schemaVersion: 3,
    tasks: [],
    sessions: [],
    settings: makeSettings(),
    settingsUpdatedAt: 0,
  };
}

describe('mergeStates', () => {
  it('merging two identical states returns the same state', () => {
    const state: SyncableState = {
      schemaVersion: 3,
      tasks: [makeTask({ id: 't1', title: 'Task 1', createdAt: 1000, updatedAt: 2000 })],
      sessions: [makeSession({ id: 's1', taskId: 't1', startedAt: 1000 })],
      settings: makeSettings({ theme: 'dark' }),
      settingsUpdatedAt: 500,
    };

    const merged = assertMergeCommutative(state, state);
    expect(merged).toEqual(state);

    // Idempotency check
    expect(mergeStates(state, merged)).toEqual(merged);
  });

  it('merging with an empty state returns the non-empty one unchanged', () => {
    const empty = emptySyncableState();
    const state: SyncableState = {
      schemaVersion: 3,
      tasks: [makeTask({ id: 't1', title: 'Task 1', createdAt: 1000, updatedAt: 2000 })],
      sessions: [makeSession({ id: 's1', taskId: 't1', startedAt: 1000 })],
      settings: makeSettings({ theme: 'light' }),
      settingsUpdatedAt: 500,
    };

    const merged = assertMergeCommutative(empty, state);
    expect(merged.tasks).toEqual(state.tasks);
    expect(merged.sessions).toEqual(state.sessions);
    expect(merged.settings).toEqual(state.settings);
    expect(merged.settingsUpdatedAt).toBe(500);

    // Idempotency
    expect(mergeStates(state, mergeStates(state, empty))).toEqual(merged);
  });

  it('unions sessions by id and sorts by startedAt without losing any session', () => {
    const stateA: SyncableState = {
      ...emptySyncableState(),
      sessions: [
        makeSession({ id: 's1', startedAt: 3000 }),
        makeSession({ id: 's2', startedAt: 1000 }),
      ],
    };
    const stateB: SyncableState = {
      ...emptySyncableState(),
      sessions: [
        makeSession({ id: 's2', startedAt: 1000 }), // duplicate of s2
        makeSession({ id: 's3', startedAt: 2000 }),
      ],
    };

    const merged = assertMergeCommutative(stateA, stateB);
    expect(merged.sessions.map((s) => s.id)).toEqual(['s2', 's3', 's1']);
    expect(merged.sessions).toHaveLength(3);

    // Idempotency
    expect(mergeStates(stateA, mergeStates(stateA, stateB))).toEqual(merged);
  });

  it('unions tasks by id, choosing the one with greater updatedAt', () => {
    const taskA_older = makeTask({ id: 't1', title: 'Task A (Old)', updatedAt: 1000 });
    const taskA_newer = makeTask({ id: 't1', title: 'Task A (New)', updatedAt: 2000 });

    const stateA: SyncableState = {
      ...emptySyncableState(),
      tasks: [taskA_older],
    };
    const stateB: SyncableState = {
      ...emptySyncableState(),
      tasks: [taskA_newer],
    };

    const merged = assertMergeCommutative(stateA, stateB);
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0]!.title).toBe('Task A (New)');
    expect(merged.tasks[0]!.updatedAt).toBe(2000);

    // Vice versa: A has newer task
    const stateA_newer: SyncableState = { ...emptySyncableState(), tasks: [taskA_newer] };
    const stateB_older: SyncableState = { ...emptySyncableState(), tasks: [taskA_older] };
    const mergedReverse = assertMergeCommutative(stateA_newer, stateB_older);
    expect(mergedReverse.tasks[0]!.title).toBe('Task A (New)');

    // Idempotency
    expect(mergeStates(stateA, mergeStates(stateA, stateB))).toEqual(merged);
  });

  it('resolves equal updatedAt deterministically and order-independently', () => {
    const task1 = makeTask({ id: 't1', title: 'Alpha', updatedAt: 1000 });
    const task2 = makeTask({ id: 't1', title: 'Beta', updatedAt: 1000 });

    const stateA: SyncableState = { ...emptySyncableState(), tasks: [task1] };
    const stateB: SyncableState = { ...emptySyncableState(), tasks: [task2] };

    const mergedAB = mergeStates(stateA, stateB);
    const mergedBA = mergeStates(stateB, stateA);
    expect(mergedAB).toEqual(mergedBA);

    // Idempotency
    expect(mergeStates(stateA, mergeStates(stateA, stateB))).toEqual(mergedAB);
  });

  it('keeps soft-deleted task if deletedAt setting had a later updatedAt', () => {
    const activeTask = makeTask({ id: 't1', title: 'Study', updatedAt: 1000, deletedAt: null });
    const deletedTask = makeTask({ id: 't1', title: 'Study', updatedAt: 2000, deletedAt: 2000 });

    const stateA: SyncableState = { ...emptySyncableState(), tasks: [activeTask] };
    const stateB: SyncableState = { ...emptySyncableState(), tasks: [deletedTask] };

    const merged = assertMergeCommutative(stateA, stateB);
    expect(merged.tasks[0]!.deletedAt).toBe(2000);

    // If soft-deleted on A earlier and edited later on B, edited version wins
    const deletedTaskEarlier = makeTask({ id: 't1', title: 'Study', updatedAt: 1000, deletedAt: 1000 });
    const editedTaskLater = makeTask({ id: 't1', title: 'Study (Updated)', updatedAt: 2000, deletedAt: null });

    const stateC: SyncableState = { ...emptySyncableState(), tasks: [deletedTaskEarlier] };
    const stateD: SyncableState = { ...emptySyncableState(), tasks: [editedTaskLater] };

    const merged2 = assertMergeCommutative(stateC, stateD);
    expect(merged2.tasks[0]!.title).toBe('Study (Updated)');
    expect(merged2.tasks[0]!.deletedAt).toBeNull();
  });

  it('merges settings using whole-object last-write-wins based on settingsUpdatedAt', () => {
    const settingsA = makeSettings({ theme: 'dark', language: 'en' });
    const settingsB = makeSettings({ theme: 'light', language: 'ar' });

    const stateA: SyncableState = {
      ...emptySyncableState(),
      settings: settingsA,
      settingsUpdatedAt: 100,
    };
    const stateB: SyncableState = {
      ...emptySyncableState(),
      settings: settingsB,
      settingsUpdatedAt: 200,
    };

    const merged = assertMergeCommutative(stateA, stateB);
    expect(merged.settings.theme).toBe('light');
    expect(merged.settings.language).toBe('ar');
    expect(merged.settingsUpdatedAt).toBe(200);

    // Idempotency
    expect(mergeStates(stateA, mergeStates(stateA, stateB))).toEqual(merged);
  });

  it('satisfies associativity for three states (a, b, c)', () => {
    const stateA: SyncableState = {
      schemaVersion: 2,
      tasks: [makeTask({ id: 't1', title: 'Task 1 v1', updatedAt: 1000 })],
      sessions: [makeSession({ id: 's1', startedAt: 1000 })],
      settings: makeSettings({ theme: 'dark' }),
      settingsUpdatedAt: 100,
    };
    const stateB: SyncableState = {
      schemaVersion: 3,
      tasks: [
        makeTask({ id: 't1', title: 'Task 1 v2', updatedAt: 2000 }),
        makeTask({ id: 't2', title: 'Task 2', updatedAt: 1500 }),
      ],
      sessions: [makeSession({ id: 's2', startedAt: 2000 })],
      settings: makeSettings({ theme: 'light' }),
      settingsUpdatedAt: 300,
    };
    const stateC: SyncableState = {
      schemaVersion: 3,
      tasks: [
        makeTask({ id: 't2', title: 'Task 2 (Edited)', updatedAt: 2500 }),
        makeTask({ id: 't3', title: 'Task 3', updatedAt: 1800 }),
      ],
      sessions: [makeSession({ id: 's3', startedAt: 1500 })],
      settings: makeSettings({ theme: 'light' }),
      settingsUpdatedAt: 200,
    };

    const ab_then_c = mergeStates(mergeStates(stateA, stateB), stateC);
    const a_then_bc = mergeStates(stateA, mergeStates(stateB, stateC));

    expect(ab_then_c).toEqual(a_then_bc);
  });

  it('handles realistic scenario: device A logs 2 offline sessions, device B logs 3 sessions and renames a task', () => {
    const initialTask = makeTask({ id: 't1', title: 'Initial Name', createdAt: 1000, updatedAt: 1000 });

    // Device A offline changes
    const stateA: SyncableState = {
      schemaVersion: 3,
      tasks: [initialTask],
      sessions: [
        makeSession({ id: 'sA1', taskId: 't1', startedAt: 2000 }),
        makeSession({ id: 'sA2', taskId: 't1', startedAt: 3000 }),
      ],
      settings: makeSettings(),
      settingsUpdatedAt: 1000,
    };

    // Device B offline changes
    const renamedTask = makeTask({ id: 't1', title: 'Renamed Task', createdAt: 1000, updatedAt: 4000 });
    const stateB: SyncableState = {
      schemaVersion: 3,
      tasks: [renamedTask],
      sessions: [
        makeSession({ id: 'sB1', taskId: 't1', startedAt: 2500 }),
        makeSession({ id: 'sB2', taskId: 't1', startedAt: 3500 }),
        makeSession({ id: 'sB3', taskId: 't1', startedAt: 4500 }),
      ],
      settings: makeSettings(),
      settingsUpdatedAt: 1000,
    };

    const merged = assertMergeCommutative(stateA, stateB);

    // Both devices converge on 5 sessions
    expect(merged.sessions).toHaveLength(5);
    expect(merged.sessions.map((s) => s.id)).toEqual(['sA1', 'sB1', 'sA2', 'sB2', 'sB3']);

    // Convergence on renamed task
    expect(merged.tasks).toHaveLength(1);
    expect(merged.tasks[0]!.title).toBe('Renamed Task');
    expect(merged.tasks[0]!.updatedAt).toBe(4000);
  });
});
