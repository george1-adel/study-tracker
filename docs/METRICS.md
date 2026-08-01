# METRICS.md — every formula, verbatim

Normative. All of these are **pure functions in `src/domain/stats/`**, recomputed from `tasks[]` and
`sessions[]` on every call. Nothing here is ever stored or incremented.

Ambiguity here becomes wrong numbers in the product. Where the product spec was ambiguous, the
decision made is recorded in `docs/DECISIONS.md`.

---

## Vocabulary

- **Focus session** — a session whose `kind` is `stopwatch`, `countdown`, or `pomodoro_work`.
- **Break session** — `pomodoro_short_break` or `pomodoro_long_break`.
- **focusMs(day)** — sum of `durationMs` over focus sessions with that `dayKey`. Breaks excluded.
- **Active task on day D** — a task with `deletedAt === null`, `createdAt` on or before the end of D,
  and not completed before D.

---

## DayRecord

Computed for any day that has at least one session or one task completion.

```
focusMs            sum of durationMs over focus sessions on that day
breakMs            sum of durationMs over break sessions on that day
completedTasks     count of tasks with completedDayKey === day
unfinishedTasks    count of active tasks on that day that were not completed on or before it
sessionsCompleted  count of sessions on that day with completed === true
pomodoroSessions   count of sessions on that day with kind === 'pomodoro_work'
stopwatchSessions  count of sessions on that day with kind === 'stopwatch'
productivityPct    see below
```

### productivityPct

The product spec does not define this. **Definition used:**

```
productivityPct(day) = min(100, round(focusMs(day) / settings.dailyGoalMs * 100))
```

- `dailyGoalMs` defaults to 4 hours and is editable in Settings.
- If `dailyGoalMs <= 0`, `productivityPct` is `0` — never `NaN`, never `Infinity`.
- A day with no sessions is `0`.
- The task-completion ratio (`completedTasks / (completedTasks + unfinishedTasks)`) is a **separate,
  separately-labelled** number. It is not "productivity". When the denominator is 0, it renders as
  `—`, not `NaN%` or `0%`.

---

## Streaks

A day **counts for the streak** if and only if **at least one task has `completedDayKey === day`**.
Logging time without completing a task does not count. (This follows the product spec literally:
"if I complete at least one study/work task during the day".)

```
currentStreak
  Let D = today's day key.
  If D counts: currentStreak = D plus the run of consecutive counting days immediately before it.
  Else if yesterday counts: currentStreak = the run ending at yesterday, and state = 'at_risk'.
  Else: currentStreak = 0.
```

**The streak does not reset at midnight.** A day you have not finished yet cannot break a streak.
`state` is one of `'active'` (today counts), `'at_risk'` (yesterday counts, today does not yet), or
`'broken'` (neither).

```
longestStreak    the longest run of consecutive counting days in all history
totalStreakDays  the total number of counting days ever (not necessarily consecutive)
streakHistory    every maximal run, as { startDay, endDay, length }, most recent first
```

Consecutiveness is evaluated with the noon-anchored day helpers, so a DST transition never breaks or
merges a run.

---

## Totals and averages

```
totalFocusMs        sum of durationMs over all focus sessions
weeklyFocusMs       totalFocusMs restricted to the current week, honouring settings.weekStartsOn
monthlyFocusMs      totalFocusMs restricted to the current calendar month
avgDailyFocusMs     totalFocusMs / (number of days with at least one focus session)
                    -> 0 when there are no such days. NOT divided by calendar days elapsed.
avgTaskCompletionMs mean, over completed tasks, of the summed durationMs of that task's focus
                    sessions. Tasks with no sessions are excluded from both numerator and
                    denominator. -> 0 when the set is empty.
completedTaskCount  tasks with completedAt !== null and deletedAt === null
incompleteTaskCount tasks with completedAt === null and deletedAt === null
pomodoroCount       sessions with kind === 'pomodoro_work'
stopwatchCount      sessions with kind === 'stopwatch'
longestSessionMs    max durationMs over focus sessions -> 0 when there are none
shortestSessionMs   min durationMs over focus sessions -> 0 when there are none
```

**Empty-set rule:** every aggregate above returns `0` (or `null` where the UI shows `—`) on empty
input. `Math.max(...[])` returning `-Infinity` and `x / 0` returning `NaN` are defects, not edge
cases. Every function in `src/domain/stats/` must have a test for empty input.

---

## "Most productive" — both senses, both shipped

The spec's "most productive day / week / month" is ambiguous. Ship both, with distinct labels:

```
bestDay      the single calendar DayKey with the highest focusMs         label: "Best day"
bestWeekday  the day OF THE WEEK with the highest mean focusMs           label: "Best weekday"
bestWeek     the calendar week (per weekStartsOn) with the highest focusMs
bestMonth    the calendar month with the highest focusMs
```

Ties break toward the **most recent** period. Each returns `null` on empty history, and the UI
renders `—`.

---

## Time by category

`Task.categoryId` exists in the schema but has no UI yet. The aggregation function
`focusMsByCategory()` must exist and be tested, grouping `null` under an "Uncategorised" bucket, so
the future feature is a UI task only. It is not surfaced in the analytics page yet.
