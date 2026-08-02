import { describe, expect, it } from 'vitest';
import { mergeStates, type SyncableState } from './merge';
import { DEFAULT_SETTINGS } from '../types';
import type { Task, Session } from '../types';

// Deterministic PRNG so a failure is reproducible.
let seed = 1337;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T,>(a: T[]): T => a[Math.floor(rnd() * a.length)]!;

const mkTask = (id: string, updatedAt: number): Task => ({
  id, title: 'task-' + id, createdAt: 1000, dayKey: '2026-08-01',
  mode: 'stopwatch', targetMs: null,
  completedAt: rnd() > 0.6 ? updatedAt : null,
  completedDayKey: rnd() > 0.6 ? '2026-08-01' : null,
  deletedAt: rnd() > 0.85 ? updatedAt : null,
  updatedAt, categoryId: null, tags: [], notes: null,
});
// Sessions are immutable and append-only: a given id ALWAYS has identical content,
// so derive every field deterministically from the id rather than from the PRNG.
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0x7fffffff, 7);
const mkSession = (id: string): Session => ({
  id, taskId: 't' + (hash(id) % 5), kind: 'stopwatch',
  startedAt: hash(id) % 1000000, endedAt: 2e6, durationMs: hash(id) % 100000,
  dayKey: '2026-08-01', completed: true,
});
const mkState = (taskIds: string[], sessionIds: string[], sUpd: number): SyncableState => ({
  schemaVersion: 3,
  tasks: taskIds.map(id => mkTask(id, Math.floor(rnd() * 5000))),
  sessions: sessionIds.map(mkSession),
  settings: { ...DEFAULT_SETTINGS, dailyGoalMs: Math.floor(rnd() * 1e7) },
  settingsUpdatedAt: sUpd,
});
const ids = <T extends { id: string }>(xs: T[]) => xs.map(x => x.id).sort();
const randIds = (p: string, n: number) => Array.from({ length: n }, () => p + Math.floor(rnd() * 8));
const uniq = (a: string[]) => [...new Set(a)];

describe('mergeStates algebraic properties (randomised)', () => {
  const cases: Array<[SyncableState, SyncableState, SyncableState]> = [];
  for (let i = 0; i < 120; i++) {
    cases.push([
      mkState(uniq(randIds('t', 5)), uniq(randIds('s', 6)), Math.floor(rnd() * 5000)),
      mkState(uniq(randIds('t', 5)), uniq(randIds('s', 6)), Math.floor(rnd() * 5000)),
      mkState(uniq(randIds('t', 4)), uniq(randIds('s', 4)), Math.floor(rnd() * 5000)),
    ]);
  }

  it('is commutative: merge(a,b) === merge(b,a)', () => {
    for (const [a, b] of cases) expect(mergeStates(a, b)).toEqual(mergeStates(b, a));
  });

  it('is idempotent: merge(a, merge(a,b)) === merge(a,b)', () => {
    for (const [a, b] of cases) {
      const ab = mergeStates(a, b);
      expect(mergeStates(a, ab)).toEqual(ab);
    }
  });

  it('is associative: merge(merge(a,b),c) === merge(a,merge(b,c))', () => {
    for (const [a, b, c] of cases) {
      expect(mergeStates(mergeStates(a, b), c)).toEqual(mergeStates(a, mergeStates(b, c)));
    }
  });

  it('never loses a session or a task', () => {
    for (const [a, b] of cases) {
      const m = mergeStates(a, b);
      expect(ids(m.sessions)).toEqual([...new Set([...ids(a.sessions), ...ids(b.sessions)])].sort());
      expect(ids(m.tasks)).toEqual([...new Set([...ids(a.tasks), ...ids(b.tasks)])].sort());
    }
  });

  it('merging with an empty state is an identity', () => {
    const empty: SyncableState = { schemaVersion: 3, tasks: [], sessions: [],
      settings: DEFAULT_SETTINGS, settingsUpdatedAt: 0 };
    for (const [a] of cases) {
      const m = mergeStates(a, empty);
      expect(ids(m.tasks)).toEqual(ids(a.tasks));
      expect(ids(m.sessions)).toEqual(ids(a.sessions));
    }
  });
});

describe('duplicate session ids with differing content (only reachable via import)', () => {
  it('resolves order-independently instead of diverging', () => {
    const mk = (durationMs: number) => ({
      schemaVersion: 3, tasks: [], settings: DEFAULT_SETTINGS, settingsUpdatedAt: 0,
      sessions: [{ id: 'dup', taskId: 't1', kind: 'stopwatch' as const, startedAt: 10,
                   endedAt: 20, durationMs, dayKey: '2026-08-01', completed: true }],
    });
    const a = mk(1000), b = mk(9999);
    expect(mergeStates(a, b)).toEqual(mergeStates(b, a));
  });
});
