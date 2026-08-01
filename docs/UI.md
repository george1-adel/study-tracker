# UI.md — art direction and component contracts

Normative. See `AGENTS.md` for the hard rules (logical properties, `t()`, dark default).

---

## 1. The direction: strip chart

This is not a productivity SaaS dashboard. It is a **recording instrument** — the thing that sits
next to the work and writes down what actually happened.

The subject's world is measurement: chronographs, darkroom timers, seismograph drums, tide charts,
telemetry strips. That world's vernacular is **graduations, hairlines, tabular digits, and ink laid
down on a moving surface**. Everything visual in this app comes from there. Nothing comes from the
generic dashboard idiom of rounded stat cards with gradient accents.

**Why this and not a stat grid:** a total like "4h 12m today" tells you a quantity. It does not tell
you that you worked 40 minutes at 2am, stopped for five hours, then did three solid hours after
lunch. The *shape* of a day is the thing this app knows and Todoist doesn't. The direction exists to
show that shape.

---

## 2. The signature element: today's tape

The dashboard hero is **not** a number, a greeting, or a stat row. It is a horizontal band
representing **the 24 hours of today**, graduated with hour ticks, on which every session is inked
as a solid block positioned at the time it actually happened.

```
 00      03      06      09      12      15      18      21      24
 ├───────┼───────┼───────┼───────┼───────┼───────┼───────┼───────┤
 ▓▓▓                          ░░  ▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓▓▓▓▓▌
                                                              ▲ now
```

- **Amber blocks** = focus sessions. **Slate blocks** = breaks. Nothing else is inked.
- A **playhead** marks the current time. While a timer runs, the block extends from under it in
  real time. This is the one live, moving thing in the interface.
- Empty state is the graduations alone plus one line: *"Nothing on the tape yet. Start a timer."*
  An empty instrument is legible; an empty dashboard looks broken.

**The tape is the same object at three zooms, and that is the whole system:**

| Zoom | Where | What one tape is |
|------|-------|------------------|
| Day | Dashboard hero | 24 hours, sessions inked |
| Month | Progress page | one row per day, stacked into a month |
| Year | Analytics heatmap | 365 rows, compressed to intensity |

The "calendar heatmap" is therefore **not** a borrowed GitHub-squares widget. It is this app's own
object, zoomed out. Build it as one component family with a shared scale, not three unrelated
visualisations.

---

## 3. Palette

Instrument glass, not soot. The base is a blue-black, never neutral `#000`.

```css
/* dark — the default */
--ink:          #0C1116;   /* page */
--ink-raised:   #141B23;   /* cards, the tape bed */
--ink-sunken:   #090D11;   /* wells, inputs */
--rule:         #232E39;   /* hairline graduations, borders */
--rule-strong:  #35434F;
--text:         #E4E9ED;
--text-muted:   #93A1AC;
--text-faint:   #5C6A75;

--trace:        #E8B93B;   /* SODIUM AMBER — focus time. see the restraint rule below */
--trace-dim:    #6E5C2A;   /* amber at rest: past days, inactive marks */
--breath:       #4B7A8C;   /* desaturated slate-cyan — break time, secondary always */
--alarm:        #D9553F;   /* clay red — destructive actions only */
--focus-ring:   #E8B93B;
```

Light theme is a **cool neutral** (`--paper: #F2F4F6`), not cream. Cream + serif + terracotta is the
single most over-produced palette in this category and we are not shipping it.

### The restraint rule

`--trace` amber is reserved for **recorded focus time and the running clock**. That is it. It does
not appear on buttons, links, headings, borders, badges, or hover states. Primary buttons are
neutral (`--ink-raised` with `--rule-strong`); the amber earns its meaning by never being spent
anywhere else. If amber appears in a component that is not showing time, that is a bug.

This is deliberately a one-accent design. The boldness budget is spent entirely on the tape.

**Not** allowed anywhere: glows, scanlines, CRT effects, gradient fills, neon. Amber on dark reads
"retro terminal" the moment you add a glow. Flat ink on flat glass reads "instrument."

---

## 4. Typography

Three faces, three jobs, self-hosted via `@fontsource` packages. **No CDN links** — the app must
work offline.

| Role | Face | Use |
|------|------|-----|
| Display | **Bricolage Grotesque** | Page titles and the streak count only. Variable; use its width axis. Restraint: never below 24px, never for body copy. |
| UI / body | **IBM Plex Sans** + **IBM Plex Sans Arabic** | Everything else. |
| Data | **IBM Plex Mono** | Every digit: clocks, durations, dates, percentages, axis labels. `font-variant-numeric: tabular-nums` always. |

**The bilingual requirement drives this choice.** IBM Plex Sans and IBM Plex Sans Arabic are one
family, drawn together — the Arabic is not a bolted-on fallback with a different colour and rhythm,
which is what happens when you pair a Latin grotesk with whatever Arabic face is available. Arabic
and English pages will feel like the same product. That is worth more here than a more fashionable
Latin face.

If any of these is unavailable on `@fontsource`, **stop and report it** rather than substituting.

Scale (1.25 ratio, clamped for mobile): 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49.
Body 16/1.55. Display tight: 1.05, `letter-spacing: -0.02em`. Mono `letter-spacing: 0`.
The running clock is the largest thing on the page after the tape: `clamp(39px, 8vw, 64px)`.

---

## 5. Structure

Structural devices must encode something true.

- **Use graduations** — hour ticks on the day tape, day ticks on the month, week rules on the year.
  Time is genuinely interval-measured, so tick marks carry information.
- **Do NOT use 01 / 02 / 03 numbering anywhere.** Nothing in this app is an ordered sequence. Tasks
  are a set, days are a continuum, sessions are events. Numbered markers here would be pure
  decoration.
- Hairline rules (`1px solid var(--rule)`) separate regions. No drop shadows for hierarchy — this
  is a flat instrument face, depth comes from the ink/raised/sunken triad.
- Radii are small and consistent: `--radius: 4px`, `--radius-lg: 8px`. No pill shapes except the
  ink blocks on the tape, which are square-ended — a pen doesn't round its strokes.

---

## 6. Motion

**One orchestrated moment, everything else still.**

The moment is **Start**: the playhead settles onto the tape (140ms), then the amber block begins
extending. That is the app's one piece of choreography and it happens at the instant that matters.

Everything else: `--dur-fast: 120ms` for hover/press, `--dur-med: 220ms` for enter/exit, both
`cubic-bezier(0.2, 0, 0, 1)`. No page transitions, no staggered list reveals, no parallax, no
ambient animation. A recording instrument is calm; it moves only when something is being recorded.

Under `@media (prefers-reduced-motion: reduce)` a single global rule collapses all durations to
`0.01ms` and the amber block simply appears at its new length.

---

## 7. Layout

- Routes: `/` (dashboard), `/progress`, `/analytics`, `/settings`.
- Shell: persistent left rail (icon + label) at ≥1024px; bottom tab bar below that.
- The tape is **full content width** and is the first thing below the header on the dashboard. The
  task list sits under it. Do not put stat cards above the tape.
- Breakpoints 360 / 768 / 1024 / 1280. Content max 1280px, `padding-inline: var(--space-4)`.
- No horizontal scroll at 360px in either direction or theme. Touch targets ≥44px.
- The tape stays legible at 360px by dropping to 6-hour graduations, never by scrolling.

---

## 8. Shared components (`src/components/`)

Dumb — props only, may not import from `src/store/`.

```
Tape           the signature. props: sessions, dayKey, now, zoom: 'day'|'month'|'year'
TapeScale      the graduation rule, shared by all three zooms
Button         variant: primary | secondary | ghost | danger. NEUTRAL — never amber.
IconButton     requires aria-label
Card           --ink-raised + hairline rule
Modal          focus-trapped, Escape closes, restores focus, aria-modal
Checkbox       real <input type="checkbox"> + associated <label>
Input, Select, NumberInput, Toggle
Ltr            bidi isolation for digit runs
Toast          the fallback channel when notifications are denied or sound is blocked
EmptyState     an invitation to act, never an apology
StatCard       label + mono value. "—" for null, never "NaN"
```

---

## 9. Direction and RTL

`<html>` carries `lang` and `dir`; `dir="rtl"` when `settings.language === 'ar'`.

- Every digit run sits inside `<Ltr>` (`dir="ltr"; unicode-bidi: isolate`).
- Arabic formatting uses `'ar-u-nu-latn'` so digits stay Latin and the mono face applies.
- **The tape always runs left-to-right, in both languages.** It is a time axis, and mirroring it
  would mirror the meaning of "later". Force `dir="ltr"` on the tape and all charts; translate only
  their labels. The month calendar is the exception and follows page direction, because calendars
  genuinely mirror in Arabic.

---

## 10. Writing

Words are design material. Copy is written from the user's side of the screen.

- Name things by what the person controls: "Start", "Finish", "Delete task" — not "Submit", not
  "Execute session".
- An action keeps its name through the whole flow: the button that says **Finish** produces a toast
  that says **Finished**.
- Sentence case everywhere. No exclamation marks. No emoji in the UI.
- Errors say what happened and what to do, in the interface's voice, and never apologise:
  *"Notifications are blocked. Turn them on in your browser settings to get alerts when a timer
  ends."* — not *"Oops! We couldn't send a notification :("*
- Empty states are invitations: *"Nothing on the tape yet. Start a timer."* — not "No data".
- Never congratulate the user in the product's voice. A streak of 12 shows **12**, not "Amazing
  work!". The number is the reward; commentary cheapens it.

---

## 11. Accessibility floor

- Visible focus ring on every interactive element; never `outline: none` alone.
- Timer readouts are `aria-live="off"` — a per-second live region is a screen-reader denial of
  service. Announce only phase changes and completion, via `role="status"`.
- The tape carries a text summary for screen readers ("3 focus sessions, 4 hours 12 minutes, most
  recent 14:20 to 15:45"). Colour is never the only signal — focus and break blocks differ in
  height as well as hue.
- Contrast ≥4.5:1 for text in both themes. Verify `--text-muted` on `--ink-raised` specifically.
