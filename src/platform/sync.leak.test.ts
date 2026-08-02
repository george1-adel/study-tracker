import { describe, expect, it, vi } from 'vitest';
import { createSyncClient } from './sync';
import { DEFAULT_SETTINGS } from '../domain/types';

describe('activeTimer must never be transmitted', () => {
  it('is absent from the PUT body even when the caller passes a full PersistedState', async () => {
    const bodies: string[] = [];
    const fakeFetch = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') bodies.push(String(init.body));
      return new Response(JSON.stringify({ revision: 1, updatedAt: 1 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fakeFetch);

    // Deliberately pass a FULL persisted state, activeTimer included.
    const full = {
      schemaVersion: 3, tasks: [], sessions: [],
      settings: DEFAULT_SETTINGS, settingsUpdatedAt: 5,
      activeTimer: { taskId: 'SECRET-TASK', kind: 'stopwatch', status: 'running',
                     startedAt: 1, accumulatedMs: 0, targetMs: null, pomodoro: null },
    } as never;

    const client = createSyncClient({ url: 'https://example.invalid', passphrase: 'p', enabled: true });
    await client.push(full, 0);

    expect(bodies.length).toBeGreaterThan(0);
    for (const b of bodies) {
      expect(b).not.toContain('activeTimer');
      expect(b).not.toContain('SECRET-TASK');
    }
  });
});
