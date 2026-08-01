# AGENTS.md — house rules

You are the **implementer**. An orchestrator writes your briefs, reviews your diff, and commits.
This file and everything under `docs/` are **normative**. Read them before writing code.

**Never edit `AGENTS.md` or any file under `docs/`.** If you believe one of them is wrong, say so in
your final report and stop — do not "fix" it.

---

## Process

- Do **not** run `git add`, `git commit`, `git push`, `git checkout`, `git reset`, or `git stash`.
  Leave all work uncommitted in the working tree.
- Do **not** run long-running or watch-mode commands: no `npm run dev`, no bare `vitest`, no
  `--watch`, no `--ui`, no `vite preview`. They never exit and your run will be killed by a watchdog.
- Do **not** run `npm install` unless the brief gives you the exact command to run.
- Do **not** create summary, notes, plan, or scratch `.md` files. Your report is the final message.
- Stay in scope. No unrelated refactors, renames, or "while I was here" cleanup.
- If the brief is ambiguous or a premise looks wrong, do the part you are sure about and report the
  question. Do not guess and do not silently expand the task.

## Architecture boundaries

```
src/domain/     PURE. No React, no browser globals, no Date.now(), no imports from
                platform/ store/ components/ features/. Time enters as a `now: number` argument.
src/platform/   The ONLY place browser APIs live (localStorage, Notification, Audio, setInterval).
src/store/      zustand. May import domain/ and platform/.
src/components/ Dumb, reusable. May NOT import from store/ or features/.
src/features/   Feature UI. May import everything above.
```

There is **exactly one `setInterval` in the repo**: `src/platform/ticker.ts`. Nothing else may
create one.

## Time and dates

- Timers are computed from timestamps: `elapsed = accumulatedMs + (now - startedAt)`.
  **Never** decrement a counter on a tick. **Never** derive a session's `durationMs` from
  `endedAt - startedAt` (that is wrong for any timer that was paused).
- Day keys are **local calendar days**, format `YYYY-MM-DD`, built from
  `getFullYear()/getMonth()/getDate()`. `toISOString()`, `toJSON()`, `Date.parse()` and
  `new Date(string)` are **banned** and eslint will fail on them.
- **Never** do day arithmetic by adding `86400000`. Use the helpers in `src/domain/time/dayKey.ts`,
  which anchor at 12:00 local noon so DST transitions cannot skip or repeat a day.

## Derived data

- `tasks[]` and `sessions[]` are the **only** sources of truth.
- Every statistic, day record, streak, total, average, maximum and minimum is **recomputed** by a
  pure function in `src/domain/stats/`. Never store an aggregate, never increment a counter, never
  persist a running maximum.
- Deleting a task is a **soft delete** (`deletedAt`). Its sessions are never removed, so history
  cannot be rewritten by deleting a task.

## i18n and RTL

- Every user-facing string goes through `t()`. No hardcoded text in JSX, in any language, ever.
- Every new key must be added to **both** `src/i18n/en.ts` and `src/i18n/ar.ts`. A missing Arabic key
  is a typecheck failure.
- Counts use `Intl.PluralRules` via `t(key, { count })`. Never concatenate sentence fragments.
- CSS uses **logical properties only**: `margin-inline-start`, `padding-inline`,
  `inset-inline-start`, `text-align: start`, `border-inline-end`. The physical forms
  (`margin-left/right`, `padding-left/right`, bare `left:`/`right:`, `text-align: left/right`) are
  banned and `npm run check:rtl` will fail on them.
- All digits, clocks, durations and dates render inside the `<Ltr>` primitive.
- Number/date formatting for Arabic uses the `ar-u-nu-latn` locale so digits stay Latin.
- Chart containers are forced `dir="ltr"`; only their labels and tooltips are translated.

## UI

- **Dark mode is the default, unconditionally.** Do not use `prefers-color-scheme` to pick the
  initial theme. Light mode is opt-in from Settings.
- Colours, spacing, radii and shadows come from CSS variables in `src/styles/tokens.css`. No hex
  literals in component CSS.
- All animation must be disabled under `prefers-reduced-motion: reduce`.
- Interactive controls must be real elements (`<button>`, `<input type="checkbox">`), keyboard
  operable, with accessible labels. Not styled `<div>`s.

## React

- `StrictMode` is on: every effect runs twice in development. All side effects and state transitions
  must be idempotent and guarded on the current status.
- zustand v5 has **no default shallow equality**. Selectors must return primitives, or use
  `useShallow`. Never return a freshly constructed object or array from a selector.
- Never compute statistics inside JSX. Call a function from `src/domain/stats/`.

## The gate

Before finishing, run and fix everything it surfaces — do not merely report failures:

```
npm run verify
```

Then confirm `git status --porcelain` shows only the files your brief named.
