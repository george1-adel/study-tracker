# DOMAIN.md — entities and invariants

Normative. All types live in `src/domain/types.ts`. All timestamps are epoch milliseconds (`number`).
All ids are strings (`crypto.randomUUID()`, generated in `src/platform/`, never in `src/domain/`).

---

## DayKey

```ts
type DayKey = string; // "YYYY-MM-DD", a LOCAL calendar day
```

Produced only by `src/domain/time/dayKey.ts`. See `AGENTS.md` for the banned APIs.

---

## Task

```ts
type TimerMode = 'stopwatch' | 'countdown' | 'pomodoro';

interface Task {
  id: string;
  title: string;
  createdAt: number;
  dayKey: DayKey;               // the local day this task belongs to
  mode: TimerMode;
  targetMs: number | null;      // required for 'countdown', null for 'stopwatch'
  completedAt: number | null;
  completedDayKey: DayKey | null;
  deletedAt: number | null;     // soft delete
  // future-scalability hooks — carried through storage now, no UI yet
  categoryId: string | null;
  tags: string[];
  notes: string | null;
}
```

**Invariants**

0. **A task belongs to one day.** The Dashboard is a page for a single day and shows only tasks whose
   `dayKey` is today — at midnight it is empty and yesterday's tasks stay on yesterday, browsable
   from the Progress page. `dayKey` is stored, not derived from `createdAt`, because an unfinished
   task can be **moved** to today and the move must persist.
   Two rules make this safe: a task with a **running timer** is always shown on the Dashboard even
   when its `dayKey` is an earlier day, or a timer running across midnight could never be stopped;
   and moving a task **never re-dates its sessions**, because the time really was worked on the
   original day and the history must keep saying so.

1. `completedAt` and `completedDayKey` are set and cleared **together**. Never one without the other.
2. `deletedAt !== null` hides the task from all UI but its sessions remain in `sessions[]` and
   continue to count toward every statistic.
3. `mode === 'countdown'` requires `targetMs > 0`. `mode === 'pomodoro'` takes its durations from
   `Settings.pomodoro`, not from `targetMs`.
4. A task may be completed manually (checkbox) or by a timer. Both paths set the same two fields.
5. Unchecking a completed task clears both fields. Streaks and stats then recompute — they are
   never decremented.

---

## Session

An immutable record of time actually spent. Append-only: sessions are never mutated or deleted.

```ts
type SessionKind =
  | 'stopwatch'
  | 'countdown'
  | 'pomodoro_work'
  | 'pomodoro_short_break'
  | 'pomodoro_long_break';

interface Session {
  id: string;
  taskId: string;
  kind: SessionKind;
  startedAt: number;
  endedAt: number;
  durationMs: number;   // accumulated working time, NOT endedAt - startedAt
  dayKey: DayKey;       // derived from startedAt at write time
  completed: boolean;   // true if it ran to its natural end; false if stopped early
}
```

**Focus kinds** (count as study/work time) are `stopwatch`, `countdown`, `pomodoro_work`.
**Break kinds** are `pomodoro_short_break` and `pomodoro_long_break`. Break time is recorded but is
**excluded from every "time studied" figure**.

**Invariants**

1. `durationMs` comes from the timer engine's accumulated time. A timer paused for an hour must not
   gain an hour.
2. `dayKey` is computed once, when the session is written, from `startedAt`. A session that crosses
   midnight belongs to the day it started.
3. A session is written on every stop — early stops included. `completed` distinguishes them.
4. A session with `durationMs < 1000` is not written at all (accidental start/stop).

---

## ActiveTimer

At most **one** exists at a time. Persisted, so a running timer survives a refresh.

```ts
type TimerStatus = 'running' | 'paused';
type PomodoroPhase = 'work' | 'short_break' | 'long_break';

interface ActiveTimer {
  taskId: string;
  kind: SessionKind;
  status: TimerStatus;
  startedAt: number;       // when the CURRENT running stretch began
  accumulatedMs: number;   // completed running stretches before the current one
  targetMs: number | null; // null for stopwatch
  pomodoro: { phase: PomodoroPhase; completedWorkCycles: number } | null;
}
```

**Invariants**

1. `elapsed(now) = accumulatedMs + (status === 'running' ? now - startedAt : 0)`.
2. Starting a timer while another runs is an explicit transition: the running one is stopped and its
   session written first. Two timers must never exist.
3. On rehydrate, if a countdown/pomodoro's target was already reached while the app was closed, the
   completion is applied **silently** — no alarm, no notification. Alarms only fire live.
4. Pausing writes no session. Only stopping/finishing does.

---

## Settings

```ts
interface Settings {
  theme: 'dark' | 'light';              // default 'dark'
  language: 'en' | 'ar';                // default 'en'
  dayStartHour: number;                 // 0-23, default 0
  weekStartsOn: 0 | 1 | 6;              // Sun | Mon | Sat, default 1
  dailyGoalMs: number;                  // default 4h = 14_400_000
  streakMinFocusMs: number;             // default 15m = 900_000; floor for a day to count
  pomodoro: {
    workMinutes: number;                // default 25
    shortBreakMinutes: number;          // default 5
    longBreakMinutes: number;           // default 15
    cyclesBeforeLongBreak: number;      // default 4
    autoStartBreaks: boolean;           // default FALSE
    autoStartWork: boolean;             // default FALSE
  };
  sound: { enabled: boolean; volume: number };       // default true, 0.7
  notifications: { enabled: boolean };               // default true
}
```

`dayStartHour` shifts what counts as "today": with `dayStartHour = 4`, work at 01:30 belongs to the
previous calendar day. Changing it **recomputes** the `dayKey` of every stored session, every
task's `completedDayKey`, and every task's own `dayKey`.

---

## Persisted state

```ts
interface PersistedState {
  schemaVersion: 2;
  tasks: Task[];
  sessions: Session[];
  settings: Settings;
  activeTimer: ActiveTimer | null;
}
```

Stored under the single localStorage key `study-tracker:v1`.

**Boot contract:** unparseable JSON, a missing/unknown `schemaVersion`, or a structurally invalid
blob must boot the app to defaults. It must **never** throw, and must never render a white screen.
The same `migrate()` path validates imported JSON files.
