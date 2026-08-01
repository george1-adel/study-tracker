import { describe, expect, it } from 'vitest';
import { createMemoryAdapter, loadState } from './storage';

const load = (raw: string) => loadState(createMemoryAdapter(raw));

describe('adversarial storage input', () => {
  it('does not pollute Object.prototype via __proto__ in settings', () => {
    const evil = JSON.stringify({
      schemaVersion: 1, tasks: [], sessions: [], activeTimer: null,
      settings: JSON.parse('{"__proto__":{"pwned":"yes"},"theme":"light"}'),
    });
    expect(() => load(evil)).not.toThrow();
    expect(({} as Record<string, unknown>).pwned).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty('pwned');
  });

  it('does not pollute via top-level __proto__ or constructor', () => {
    expect(() => load('{"__proto__":{"pwned2":1},"schemaVersion":1}')).not.toThrow();
    expect(() => load('{"constructor":{"prototype":{"pwned3":1}},"schemaVersion":1}')).not.toThrow();
    expect(({} as Record<string, unknown>).pwned2).toBeUndefined();
    expect(({} as Record<string, unknown>).pwned3).toBeUndefined();
  });

  it('rejects Infinity smuggled in as 1e999', () => {
    const raw = '{"schemaVersion":1,"tasks":[],"sessions":[{"id":"s","taskId":"t","kind":"stopwatch","startedAt":1,"endedAt":2,"durationMs":1e999,"dayKey":"2026-01-01","completed":true}],"settings":{},"activeTimer":null}';
    const { state } = load(raw);
    for (const s of state.sessions) expect(Number.isFinite(s.durationMs)).toBe(true);
  });

  it('survives junk entry shapes in tasks and sessions', () => {
    const raw = '{"schemaVersion":1,"tasks":[null,0,"",[],{},true],"sessions":[null,[],"x",{}],"settings":{},"activeTimer":null}';
    let r: ReturnType<typeof load> | undefined;
    expect(() => { r = load(raw); }).not.toThrow();
    expect(Array.isArray(r!.state.tasks)).toBe(true);
    expect(Array.isArray(r!.state.sessions)).toBe(true);
    for (const t of r!.state.tasks) expect(typeof t.id).toBe('string');
    for (const s of r!.state.sessions) expect(typeof s.id).toBe('string');
  });

  it('survives settings being an array or null and still yields usable settings', () => {
    for (const s of ['[]', 'null', '"x"', '5']) {
      const { state } = load(`{"schemaVersion":1,"tasks":[],"sessions":[],"activeTimer":null,"settings":${s}}`);
      expect(state.settings.theme === 'dark' || state.settings.theme === 'light').toBe(true);
      expect(Number.isFinite(state.settings.dailyGoalMs)).toBe(true);
      expect(state.settings.pomodoro).toBeTruthy();
      expect(Number.isFinite(state.settings.pomodoro.workMinutes)).toBe(true);
    }
  });

  it('never throws on a spread of malformed blobs', () => {
    const blobs = ['', '{', '[', 'null', 'undefined', '0', 'NaN', '"str"', '[]', '{}',
      '{"schemaVersion":999}', '{"schemaVersion":"1"}', '{"tasks":{}}',
      '{"schemaVersion":1,"activeTimer":{"status":"running"}}',
      '{"schemaVersion":1,"activeTimer":[]}'];
    for (const b of blobs) expect(() => load(b), `blob: ${b}`).not.toThrow();
  });
});
