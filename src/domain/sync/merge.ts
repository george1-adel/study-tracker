import type { Task, Session, Settings } from '../types';

export interface SyncableState {
  schemaVersion: number;
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  settingsUpdatedAt: number;
}

export function mergeStates(a: SyncableState, b: SyncableState): SyncableState {
  const schemaVersion = Math.max(a.schemaVersion, b.schemaVersion);

  // 1. Sessions: Union by id. Sort by startedAt, tie-break by id
  const sessionMap = new Map<string, Session>();
  for (const s of a.sessions) {
    sessionMap.set(s.id, s);
  }
  for (const s of b.sessions) {
    const existing = sessionMap.get(s.id);
    if (existing === undefined) {
      sessionMap.set(s.id, s);
    } else if (existing !== s) {
      // Sessions are immutable, so the same id should always carry identical content and
      // this branch is unreachable in normal operation. It is reachable via importState,
      // which accepts arbitrary JSON and could carry two different sessions sharing an id.
      // Without a content tie-break the winner would depend on argument order, and two
      // devices would then converge on different states forever. Keep the lexicographically
      // smaller serialisation so the choice is order-independent.
      const ex = JSON.stringify(existing);
      const next = JSON.stringify(s);
      if (next < ex) {
        sessionMap.set(s.id, s);
      }
    }
  }
  const mergedSessions = Array.from(sessionMap.values()).sort((s1, s2) => {
    if (s1.startedAt !== s2.startedAt) {
      return s1.startedAt - s2.startedAt;
    }
    return s1.id.localeCompare(s2.id);
  });

  // 2. Tasks: By id, LWW on updatedAt. Equal updatedAt tie-break on JSON string comparison
  const taskMap = new Map<string, Task>();
  const allTaskIds = new Set<string>();
  for (const t of a.tasks) allTaskIds.add(t.id);
  for (const t of b.tasks) allTaskIds.add(t.id);

  const aTaskMap = new Map(a.tasks.map((t) => [t.id, t]));
  const bTaskMap = new Map(b.tasks.map((t) => [t.id, t]));

  for (const id of allTaskIds) {
    const taskA = aTaskMap.get(id);
    const taskB = bTaskMap.get(id);

    if (taskA && !taskB) {
      taskMap.set(id, taskA);
    } else if (!taskA && taskB) {
      taskMap.set(id, taskB);
    } else if (taskA && taskB) {
      if (taskA.updatedAt > taskB.updatedAt) {
        taskMap.set(id, taskA);
      } else if (taskB.updatedAt > taskA.updatedAt) {
        taskMap.set(id, taskB);
      } else {
        // Equal updatedAt: compare JSON string representation lexicographically
        const strA = JSON.stringify(taskA);
        const strB = JSON.stringify(taskB);
        if (strA <= strB) {
          taskMap.set(id, taskA);
        } else {
          taskMap.set(id, taskB);
        }
      }
    }
  }

  const mergedTasks = Array.from(taskMap.values()).sort((t1, t2) => t1.id.localeCompare(t2.id));

  // 3. Settings: Whole-object LWW on settingsUpdatedAt. Tie-break on JSON string comparison
  let mergedSettings: Settings;
  let mergedSettingsUpdatedAt: number;

  if (a.settingsUpdatedAt > b.settingsUpdatedAt) {
    mergedSettings = a.settings;
    mergedSettingsUpdatedAt = a.settingsUpdatedAt;
  } else if (b.settingsUpdatedAt > a.settingsUpdatedAt) {
    mergedSettings = b.settings;
    mergedSettingsUpdatedAt = b.settingsUpdatedAt;
  } else {
    const strA = JSON.stringify(a.settings);
    const strB = JSON.stringify(b.settings);
    if (strA <= strB) {
      mergedSettings = a.settings;
    } else {
      mergedSettings = b.settings;
    }
    mergedSettingsUpdatedAt = a.settingsUpdatedAt;
  }

  return {
    schemaVersion,
    tasks: mergedTasks,
    sessions: mergedSessions,
    settings: mergedSettings,
    settingsUpdatedAt: mergedSettingsUpdatedAt,
  };
}
