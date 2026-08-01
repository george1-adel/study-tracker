# Study Tracker

A study tracker web application built with React 19, TypeScript, and Vite.

## Documentation
The authoritative specs and architecture rules for this project are located in:
- `AGENTS.md` — Process rules, architecture boundaries, and quality requirements.
- `docs/` — Spec files defining UI design, domain models, decisions, and metrics.

## NPM Scripts & Quality Gates

- `npm run dev` — Launches the Vite development server.
- `npm run build` — Builds the production bundle using Vite.
- `npm run preview` — Previews the built production app locally.
- `npm run typecheck` — Runs TypeScript compiler check (`tsc --noEmit`).
- `npm run lint` — Runs ESLint with flat configuration enforcement (bans UTC date methods, non-ticker `setInterval`, domain/component boundary violations, hex colors in TS/TSX).
- `npm run check:rtl` — Runs custom script to enforce CSS logical properties and ban hardcoded JSX string literals.
- `npm run test` — Runs unit and component tests with Vitest in single-run mode.
- `npm run verify` — Runs all quality gates sequentially (`typecheck` -> `lint` -> `check:rtl` -> `test` -> `build`).
