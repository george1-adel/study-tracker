# UI.md — design system and component contracts

Normative. See `AGENTS.md` for the hard rules (logical properties, `t()`, dark default).

---

## Tokens

All visual values live in `src/styles/tokens.css` as CSS custom properties on `:root`, with a
`[data-theme='light']` override block. Component CSS references variables only — **no hex literals**.

```
--bg, --bg-elevated, --bg-sunken
--surface, --surface-hover, --border, --border-strong
--text, --text-muted, --text-faint
--accent, --accent-hover, --accent-contrast
--success, --warning, --danger
--focus-ring
--space-1..--space-8        4px scale
--radius-sm/-md/-lg/-full
--shadow-sm/-md/-lg
--font-sans, --font-mono    mono is used for all clock digits
--dur-fast/-med             animation durations
```

Theme is applied by setting `data-theme="dark" | "light"` on `<html>`. **Dark is the initial value,
always** — never read `prefers-color-scheme` to choose it.

## Direction

`<html>` carries `lang` and `dir`. `dir="rtl"` when `settings.language === 'ar'`, else `dir="ltr"`.
Switching language must flip the whole layout with no reload.

**The `<Ltr>` primitive** (`src/components/Ltr.tsx`) wraps any run of digits — clock readouts,
durations, dates, percentages, counts inside a sentence — in `dir="ltr"; unicode-bidi: isolate` so
they are not reordered by the bidi algorithm. Every numeric readout uses it.

Arabic formatting uses the locale string `'ar-u-nu-latn'` (Arabic language, Latin digits) for
`Intl.NumberFormat` and `Intl.DateTimeFormat`.

**Charts** are forced `dir="ltr"` on their container so axes are not mirrored. Their labels,
tooltips and legends are still translated. The **month calendar is the exception** — calendars are
genuinely mirrored in Arabic, so it follows page direction.

## Motion

Transitions are `--dur-fast` (120ms) for hover/press and `--dur-med` (220ms) for enter/exit. Under
`@media (prefers-reduced-motion: reduce)` all animation and transition durations collapse to `0.01ms`
via a single global rule.

## Layout

- Dashboard shell: persistent sidebar (icon + label) on ≥1024px, bottom tab bar below that.
- Routes: `/` (dashboard), `/progress`, `/analytics`, `/settings`.
- Breakpoints: 360 (floor), 768 (tablet), 1024 (sidebar appears), 1280 (max content width).
- No horizontal scroll at 360px, in either direction, in either theme.
- Touch targets ≥44×44px.
- Content max width 1280px, centred, `padding-inline: var(--space-4)`.

## Shared components (`src/components/`)

Dumb — they take props and may not import from `src/store/`.

```
Button      variant: primary | secondary | ghost | danger; size: sm | md; loading; iconOnly needs aria-label
IconButton  wraps Button with a required aria-label
Card        surface + border + radius container
Modal       focus-trapped, Escape closes, restores focus, aria-modal
Checkbox    real <input type="checkbox"> with an associated <label>
Input, Select, NumberInput, Toggle
Ltr         bidi isolation for digit runs
Toast       the fallback channel when notifications are denied or sound is blocked
EmptyState  icon + title + hint, used by every list and chart on empty data
StatCard    label + value + optional delta; renders "—" for null, never "NaN"
```

## Empty and error states

Every list, chart, page and stat must render cleanly with **zero data**. First-run is the most
common state a new user sees and it must look deliberate, not broken. `null` aggregates render as
`—`. No `NaN`, no `-Infinity`, no `Invalid Date`, ever.

## Accessibility floor

- Visible focus ring on every interactive element (`--focus-ring`), never `outline: none` alone.
- Timer readouts use `aria-live="off"` (a per-second live region is a screen-reader denial of
  service); announce only on phase change and completion, via `role="status"`.
- Charts carry a text summary or accessible `<title>`; colour is never the only signal.
- Contrast ≥4.5:1 for text in both themes.
