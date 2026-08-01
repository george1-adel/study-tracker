import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type {
  ActiveTimer,
  PersistedState,
  PomodoroPhase,
  Session,
  SessionKind,
  Settings,
  Task,
  TimerMode,
} from '../domain/types';
import { SCHEMA_VERSION, STORAGE_KEY, emptyState } from '../domain/types';
import { dayKeyFromTimestamp } from '../domain/time/dayKey';
import {
  finishTimer,
  isExpired,
  kindForPhase,
  nextPomodoroPhase,
  pauseTimer,
  phaseDurationMs,
  resumeTimer,
  startTimer,
} from '../domain/timer/engine';
import type { StorageAdapter } from '../platform/storage';
import {
  createLocalStorageAdapter,
  createMemoryAdapter,
  loadState,
  saveState,
} from '../platform/storage';

export interface AppState {
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
  recovered: boolean;
  lastCompletion: { sessionId: string; kind: SessionKind; silent: boolean } | null;
}

export interface AppActions {
  addTask(title: string, mode: TimerMode, targetMs?: number | null, now?: number): Task;
  editTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): void;
  deleteTask(id: string, now?: number): void;
  toggleTaskCompleted(id: string, now: number): void;
  startTimerFor(taskId: string, now: number): void;
  pause(now: number): void;
  resume(now: number): void;
  finish(now: number): void;
  startNextPomodoroPhase(now: number): void;
  updateSettings(patch: Partial<Settings>): void;
  exportState(): string;
  importState(raw: string): boolean;
  resetAll(): void;
  rehydrateFromStorage(now: number): void;
  clearLastCompletion(): void;
  clearRecovered(): void;
}

export type AppStore = AppState & AppActions;

function getPersistedSlice(state: AppState): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: state.tasks,
    sessions: state.sessions,
    settings: state.settings,
    activeTimer: state.activeTimer,
  };
}

export function createAppStore(
  adapter: StorageAdapter,
  initialNow?: number
): StoreApi<AppStore> {
  const loaded = loadState(adapter);
  let tasks = loaded.state.tasks;
  let sessions = loaded.state.sessions;
  const settings = loaded.state.settings;
  let activeTimer = loaded.state.activeTimer;
  const recovered = loaded.recovered;
  let lastCompletion: AppState['lastCompletion'] = null;

  if (activeTimer !== null && initialNow !== undefined && isExpired(activeTimer, initialNow)) {
    const { session, completesTask } = finishTimer(
      activeTimer,
      initialNow,
      settings.dayStartHour,
      crypto.randomUUID()
    );
    if (session !== null) {
      sessions = [...sessions, session];
      lastCompletion = {
        sessionId: session.id,
        kind: session.kind,
        silent: true,
      };
    }
    if (completesTask) {
      const dayKey = dayKeyFromTimestamp(initialNow, settings.dayStartHour);
      tasks = tasks.map((t) =>
        t.id === activeTimer!.taskId ? { ...t, completedAt: initialNow, completedDayKey: dayKey } : t
      );
    }
    activeTimer = null;
    saveState(adapter, {
      schemaVersion: SCHEMA_VERSION,
      tasks,
      sessions,
      settings,
      activeTimer,
    });
  }

  return createStore<AppStore>((set, get) => ({
    tasks,
    sessions,
    settings,
    activeTimer,
    recovered,
    lastCompletion,

    addTask(title: string, mode: TimerMode, targetMs?: number | null, now?: number): Task {
      const timestamp = now ?? Date.now();
      const trimmedTitle = title.trim();
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: trimmedTitle,
        createdAt: timestamp,
        mode,
        targetMs: mode === 'countdown' ? (targetMs ?? null) : null,
        completedAt: null,
        completedDayKey: null,
        deletedAt: null,
        categoryId: null,
        tags: [],
        notes: null,
      };

      const nextTasks = [...get().tasks, newTask];
      set({ tasks: nextTasks });
      saveState(adapter, getPersistedSlice(get()));
      return newTask;
    },

    editTask(id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>): void {
      const { tasks } = get();
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;

      const updated: Task = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
      };

      if (updated.mode === 'countdown') {
        if (typeof updated.targetMs !== 'number' || updated.targetMs <= 0) {
          return;
        }
      } else {
        updated.targetMs = null;
      }

      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      set({ tasks: nextTasks });
      saveState(adapter, getPersistedSlice(get()));
    },

    deleteTask(id: string, now?: number): void {
      const { tasks } = get();
      const existing = tasks.find((t) => t.id === id);
      if (!existing || existing.deletedAt !== null) return;

      const timestamp = now ?? Date.now();
      const updated: Task = {
        ...existing,
        deletedAt: timestamp,
      };

      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      set({ tasks: nextTasks });
      saveState(adapter, getPersistedSlice(get()));
    },

    toggleTaskCompleted(id: string, now: number): void {
      const { tasks, settings } = get();
      const existing = tasks.find((t) => t.id === id);
      if (!existing) return;

      const isCompleted = existing.completedAt !== null || existing.completedDayKey !== null;
      const updated: Task = isCompleted
        ? { ...existing, completedAt: null, completedDayKey: null }
        : {
            ...existing,
            completedAt: now,
            completedDayKey: dayKeyFromTimestamp(now, settings.dayStartHour),
          };

      const nextTasks = tasks.map((t) => (t.id === id ? updated : t));
      set({ tasks: nextTasks });
      saveState(adapter, getPersistedSlice(get()));
    },

    startTimerFor(taskId: string, now: number): void {
      const { tasks, activeTimer, settings, sessions } = get();
      const task = tasks.find((t) => t.id === taskId && t.deletedAt === null);
      if (!task) return;

      let nextSessions = sessions;
      let nextTasks = tasks;
      let nextLastCompletion = get().lastCompletion;

      if (activeTimer !== null) {
        const { session, completesTask } = finishTimer(
          activeTimer,
          now,
          settings.dayStartHour,
          crypto.randomUUID()
        );
        if (session !== null) {
          nextSessions = [...nextSessions, session];
          if (session.completed) {
            nextLastCompletion = {
              sessionId: session.id,
              kind: session.kind,
              silent: false,
            };
          }
        }
        if (completesTask) {
          const dayKey = dayKeyFromTimestamp(now, settings.dayStartHour);
          nextTasks = nextTasks.map((t) =>
            t.id === activeTimer.taskId ? { ...t, completedAt: now, completedDayKey: dayKey } : t
          );
        }
      }

      let kind: SessionKind;
      let targetMs: number | null = null;
      let pomodoro: { phase: PomodoroPhase; completedWorkCycles: number } | null = null;

      if (task.mode === 'stopwatch') {
        kind = 'stopwatch';
        targetMs = null;
        pomodoro = null;
      } else if (task.mode === 'countdown') {
        kind = 'countdown';
        targetMs = task.targetMs;
        pomodoro = null;
      } else {
        kind = 'pomodoro_work';
        targetMs = phaseDurationMs('work', settings);
        pomodoro = { phase: 'work', completedWorkCycles: 0 };
      }

      const newTimer = startTimer({ taskId, kind, now, targetMs, pomodoro });

      set({
        tasks: nextTasks,
        sessions: nextSessions,
        activeTimer: newTimer,
        lastCompletion: nextLastCompletion,
      });
      saveState(adapter, getPersistedSlice(get()));
    },

    pause(now: number): void {
      const { activeTimer } = get();
      if (activeTimer === null || activeTimer.status === 'paused') return;

      const updatedTimer = pauseTimer(activeTimer, now);
      set({ activeTimer: updatedTimer });
      saveState(adapter, getPersistedSlice(get()));
    },

    resume(now: number): void {
      const { activeTimer } = get();
      if (activeTimer === null || activeTimer.status === 'running') return;

      const updatedTimer = resumeTimer(activeTimer, now);
      set({ activeTimer: updatedTimer });
      saveState(adapter, getPersistedSlice(get()));
    },

    finish(now: number): void {
      const { activeTimer, settings, tasks, sessions } = get();
      if (activeTimer === null) return;

      const { session, completesTask } = finishTimer(
        activeTimer,
        now,
        settings.dayStartHour,
        crypto.randomUUID()
      );

      let nextSessions = sessions;
      let nextLastCompletion = get().lastCompletion;
      if (session !== null) {
        nextSessions = [...sessions, session];
        if (session.completed) {
          nextLastCompletion = {
            sessionId: session.id,
            kind: session.kind,
            silent: false,
          };
        }
      }

      let nextTasks = tasks;
      if (completesTask) {
        const dayKey = dayKeyFromTimestamp(now, settings.dayStartHour);
        nextTasks = tasks.map((t) =>
          t.id === activeTimer.taskId ? { ...t, completedAt: now, completedDayKey: dayKey } : t
        );
      }

      set({
        tasks: nextTasks,
        sessions: nextSessions,
        activeTimer: null,
        lastCompletion: nextLastCompletion,
      });
      saveState(adapter, getPersistedSlice(get()));
    },

    startNextPomodoroPhase(now: number): void {
      const { activeTimer, settings, tasks, sessions } = get();
      if (activeTimer === null || activeTimer.pomodoro === null) return;

      const { session, completesTask } = finishTimer(
        activeTimer,
        now,
        settings.dayStartHour,
        crypto.randomUUID()
      );

      let nextSessions = sessions;
      let nextLastCompletion = get().lastCompletion;
      if (session !== null) {
        nextSessions = [...sessions, session];
        if (session.completed) {
          nextLastCompletion = {
            sessionId: session.id,
            kind: session.kind,
            silent: false,
          };
        }
      }

      let nextTasks = tasks;
      if (completesTask) {
        const dayKey = dayKeyFromTimestamp(now, settings.dayStartHour);
        nextTasks = tasks.map((t) =>
          t.id === activeTimer.taskId ? { ...t, completedAt: now, completedDayKey: dayKey } : t
        );
      }

      const nextP = nextPomodoroPhase(
        activeTimer.pomodoro.phase,
        activeTimer.pomodoro.completedWorkCycles,
        settings
      );
      const nextKind = kindForPhase(nextP.phase);
      const nextTargetMs = phaseDurationMs(nextP.phase, settings);
      const newTimer = startTimer({
        taskId: activeTimer.taskId,
        kind: nextKind,
        now,
        targetMs: nextTargetMs,
        pomodoro: nextP,
      });

      set({
        tasks: nextTasks,
        sessions: nextSessions,
        activeTimer: newTimer,
        lastCompletion: nextLastCompletion,
      });
      saveState(adapter, getPersistedSlice(get()));
    },

    updateSettings(patch: Partial<Settings>): void {
      const { settings, sessions, tasks } = get();
      const newSettings: Settings = {
        ...settings,
        ...patch,
        pomodoro: patch.pomodoro ? { ...settings.pomodoro, ...patch.pomodoro } : settings.pomodoro,
        sound: patch.sound ? { ...settings.sound, ...patch.sound } : settings.sound,
        notifications: patch.notifications
          ? { ...settings.notifications, ...patch.notifications }
          : settings.notifications,
      };

      let nextSessions = sessions;
      let nextTasks = tasks;

      if (patch.dayStartHour !== undefined && patch.dayStartHour !== settings.dayStartHour) {
        const newDayStart = patch.dayStartHour;
        nextSessions = sessions.map((s) => ({
          ...s,
          dayKey: dayKeyFromTimestamp(s.startedAt, newDayStart),
        }));
        nextTasks = tasks.map((t) =>
          t.completedAt !== null
            ? { ...t, completedDayKey: dayKeyFromTimestamp(t.completedAt, newDayStart) }
            : t
        );
      }

      set({
        settings: newSettings,
        sessions: nextSessions,
        tasks: nextTasks,
      });
      saveState(adapter, getPersistedSlice(get()));
    },

    exportState(): string {
      return JSON.stringify(getPersistedSlice(get()));
    },

    importState(raw: string): boolean {
      const memoryAdapter = createMemoryAdapter(raw);
      const { state: importedState, recovered } = loadState(memoryAdapter);
      if (recovered) {
        return false;
      }

      set({
        tasks: importedState.tasks,
        sessions: importedState.sessions,
        settings: importedState.settings,
        activeTimer: importedState.activeTimer,
        recovered: false,
      });
      saveState(adapter, getPersistedSlice(get()));
      return true;
    },

    resetAll(): void {
      const empty = emptyState();
      set({
        tasks: empty.tasks,
        sessions: empty.sessions,
        settings: empty.settings,
        activeTimer: empty.activeTimer,
        recovered: false,
        lastCompletion: null,
      });
      saveState(adapter, empty);
    },

    rehydrateFromStorage(now: number): void {
      const { state: loadedState, recovered } = loadState(adapter);
      let activeTimer = loadedState.activeTimer;
      let tasks = loadedState.tasks;
      let sessions = loadedState.sessions;
      let lastCompletion = get().lastCompletion;

      if (activeTimer !== null && isExpired(activeTimer, now)) {
        const { session, completesTask } = finishTimer(
          activeTimer,
          now,
          loadedState.settings.dayStartHour,
          crypto.randomUUID()
        );
        if (session !== null) {
          sessions = [...sessions, session];
          lastCompletion = {
            sessionId: session.id,
            kind: session.kind,
            silent: true,
          };
        }
        if (completesTask) {
          const dayKey = dayKeyFromTimestamp(now, loadedState.settings.dayStartHour);
          tasks = tasks.map((t) =>
            t.id === activeTimer!.taskId ? { ...t, completedAt: now, completedDayKey: dayKey } : t
          );
        }
        activeTimer = null;
      }

      set({
        tasks,
        sessions,
        settings: loadedState.settings,
        activeTimer,
        recovered,
        lastCompletion,
      });
      saveState(adapter, {
        schemaVersion: SCHEMA_VERSION,
        tasks,
        sessions,
        settings: loadedState.settings,
        activeTimer,
      });
    },

    clearLastCompletion(): void {
      set({ lastCompletion: null });
    },

    clearRecovered(): void {
      set({ recovered: false });
    },
  }));
}

export const defaultStore = createAppStore(createLocalStorageAdapter(STORAGE_KEY));

export interface UseAppStoreHook {
  (): AppStore;
  <T>(selector: (state: AppStore) => T): T;
  getState: typeof defaultStore.getState;
  setState: typeof defaultStore.setState;
  subscribe: typeof defaultStore.subscribe;
}

const useAppStoreImpl = ((selector?: (state: AppStore) => unknown) => {
  return useStore(defaultStore, selector as (state: AppStore) => unknown);
}) as UseAppStoreHook;

useAppStoreImpl.getState = defaultStore.getState;
useAppStoreImpl.setState = defaultStore.setState;
useAppStoreImpl.subscribe = defaultStore.subscribe;

export const useAppStore = useAppStoreImpl;
export default useAppStore;

// Primitive and slice selector hooks
export const useActiveTaskId = () => useAppStore((s) => s.activeTimer?.taskId ?? null);
export const useActiveTimerStatus = () => useAppStore((s) => s.activeTimer?.status ?? null);
export const useActiveTimerKind = () => useAppStore((s) => s.activeTimer?.kind ?? null);
export const useIsTimerRunning = () => useAppStore((s) => s.activeTimer?.status === 'running');
export const useTaskCount = () => useAppStore((s) => s.tasks.filter((t) => t.deletedAt === null).length);
export const useSessionCount = () => useAppStore((s) => s.sessions.length);
export const useRecovered = () => useAppStore((s) => s.recovered);
export const useLastCompletion = () => useAppStore((s) => s.lastCompletion);
export const useTasks = () => useAppStore((s) => s.tasks);
export const useSessions = () => useAppStore((s) => s.sessions);
export const useSettings = () => useAppStore((s) => s.settings);
export const useActiveTimer = () => useAppStore((s) => s.activeTimer);
