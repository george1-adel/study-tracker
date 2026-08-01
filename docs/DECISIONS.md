# DECISIONS.md — judgement calls and why

Where the product spec was silent or ambiguous, this is what was decided and the reasoning. The
orchestrator owns this file; the implementer must not edit it.

---

**D1 — Productivity % is goal-relative, not task-relative.**
The spec lists "productivity percentage" per day with no formula. Defined as
`min(100, focusMs / dailyGoalMs)` with a 4h default goal. A task-count ratio was rejected as the
primary figure because it rewards creating many trivial tasks and collapses to `NaN` on a day with
no tasks. The task ratio is still shown, separately labelled. *Revisit if the user prefers a
task-based definition.*

**D2 — Streaks count logged focus time, not task completions.** *(User decision, 2026-08-01.)*
The spec's wording was "if I complete at least one study/work task during the day", which was first
implemented literally. Raised with the user because it fails the common case: open-ended study where
you work for hours without finishing a discrete, tickable item would not have counted. The user
chose time-based. A day counts when `focusMs(day) >= settings.streakMinFocusMs`, default 15 minutes.
The floor exists so an accidental start/stop cannot count a day.

**D3 — A streak is not broken until a full day is missed.**
The spec's "if I miss Day 4, streak resets to 0" was not applied at midnight, because that would
show `0` every morning before the user has done anything. Today-not-yet-done is reported as
`at_risk` with the streak intact. It becomes `broken` once yesterday also fails to count.

**D4 — `dayStartHour` defaults to 0, not 4.**
A study app arguably wants a 4am day boundary — working at 01:30 means "tonight", not "tomorrow".
Shipped at 0 because a plain calendar day is what a reviewer can verify at a glance, with the
parameter threaded through every day-key computation and exposed in Settings. *Recommend switching
the default to 4 once the recompute path is proven.*

**D5 — Pomodoro work-phase end does not complete the task.**
A pomodoro is one slice of work, not the whole task. Only a stopwatch `Finish` and a countdown
reaching zero auto-complete a task. Otherwise a 4-pomodoro task would be marked done after 25
minutes.

**D6 — Break time is recorded but excluded from study totals.**
Sessions are written for breaks so pomodoro history is complete, but every "hours studied" figure
sums focus kinds only. Counting breaks as study would inflate totals by ~20%.

**D7 — Deletes are soft.**
`deletedAt` hides a task; its sessions still count toward history. Hard deletion would let a user
silently rewrite past statistics and streaks by deleting old tasks.

**D8 — Both "best day" and "best weekday" ship.**
"Most productive day" is ambiguous between a calendar date and a day of the week. Both are computed
and distinctly labelled rather than picking one and being wrong half the time.

**D9 — Aggregates are always recomputed, never stored.**
Stored counters drift the moment any edit, undo, or import happens, and the drift is silent and
unfixable. Recomputation from an append-only session log is cheap at this data scale (thousands of
sessions) and always correct.

**D10 — zustand over Context + reducer.**
A timer ticking once per second under a React Context re-renders every consumer. zustand's selector
subscriptions keep the tick local to the components showing digits.

**D11 — Vitest for unit tests, Playwright for E2E.**
The pure domain is fully unit-testable. The things that actually break — background-tab throttling,
refresh mid-timer, denied notification permission, corrupt storage — are only observable in a real
browser, and Playwright's `clock.fastForward()` is the only honest way to test a 25-minute pomodoro.

**D12 — Spec docs are written by the orchestrator, not the implementer.**
`AGENTS.md` and `docs/` are the substitute for the implementer's missing memory between runs. They
are written once, by the reviewer, and are read-only to the implementer — otherwise each run would
drift the contract it is meant to be held to.
