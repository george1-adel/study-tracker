export interface StreakFlameProps {
  state: 'active' | 'at_risk' | 'broken';
}

export function StreakFlame({ state }: StreakFlameProps) {
  if (state === 'broken') {
    return (
      <svg
        className="streak-flame streak-flame-broken"
        width="34"
        height="44"
        viewBox="0 0 34 44"
        aria-hidden="true"
      >
        <line
          x1="17"
          y1="28"
          x2="17"
          y2="40"
          stroke="var(--rule-strong)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="17" cy="26.5" r="2" fill="var(--text-faint)" />
      </svg>
    );
  }

  const isAtRisk = state === 'at_risk';

  return (
    <svg
      className={`streak-flame streak-flame-${state}`}
      width="34"
      height="44"
      viewBox="0 0 34 44"
      aria-hidden="true"
    >
      <path
        className="streak-flame-outer"
        fill="var(--flame-outer)"
        d={
          isAtRisk
            ? 'M 17 40 C 10 40 7 34 8 27 C 9 21 10 18 13 16 C 16 18 22 21 24 27 C 26 34 24 40 17 40 Z'
            : 'M 17 40 C 10 40 5 36 6 30 C 7 24 9 20 11 16 C 13 12 18 8 22 4 C 21 10 24 16 26 22 C 28 28 27 40 17 40 Z'
        }
      />
      <path
        className="streak-flame-inner"
        fill="var(--flame-inner)"
        d={
          isAtRisk
            ? 'M 17 40 C 13 40 10 35 11 30 C 12 26 13 24 14 22 C 16 24 19 26 20 30 C 21 35 20 40 17 40 Z'
            : 'M 17 40 C 12 40 9 36 10 32 C 11 28 12 24 14 21 C 16 18 18 16 20 15 C 19 18 21 23 22 27 C 23 31 22 40 17 40 Z'
        }
      />
    </svg>
  );
}
