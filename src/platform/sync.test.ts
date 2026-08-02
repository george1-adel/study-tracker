import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  performSyncCycle,
  saveSyncData,
  type SyncConfig,
  type SyncMeta,
} from './sync';
import { createAppStore } from '../store/useAppStore';
import { createMemoryAdapter } from './storage';
import { DEFAULT_SETTINGS } from '../domain/types';

describe('src/platform/sync.ts', () => {
  let memoryStorage: Record<string, string>;
  let mockLocalStorage: Storage;

  beforeEach(() => {
    memoryStorage = {};
    mockLocalStorage = {
      getItem: (key: string) => memoryStorage[key] ?? null,
      setItem: (key: string, val: string) => {
        memoryStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete memoryStorage[key];
      },
      clear: () => {
        memoryStorage = {};
      },
      length: 0,
      key: () => null,
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('sync config never appears inside persisted app state', () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    // Save sync config in custom localStorage
    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: true,
    };
    saveSyncData({ config }, mockLocalStorage);

    // Export app state
    const exportedRaw = store.getState().exportState();
    const exported = JSON.parse(exportedRaw);

    expect(exported).not.toHaveProperty('config');
    expect(exported).not.toHaveProperty('passphrase');
    expect(exported).not.toHaveProperty('url');
    expect(exported.settings).not.toHaveProperty('passphrase');
  });

  it('with sync disabled, no request is made at all', async () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: false,
    };
    const meta: SyncMeta = { lastRevision: 0, lastSyncedAt: null, lastError: null };

    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resultMeta = await performSyncCycle(store, config, meta, () => {});

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resultMeta.lastError).toBeNull();
  });

  it('pull merges remote into local using mergeStates and keeps higher revision', async () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    // Add local task
    store.getState().addTask('Local Task', 'stopwatch', null, 1000);

    const remoteState = {
      schemaVersion: 3,
      tasks: [
        {
          id: 'remote-1',
          title: 'Remote Task',
          createdAt: 2000,
          updatedAt: 2000,
          dayKey: '2026-08-01',
          mode: 'stopwatch' as const,
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
      ],
      sessions: [],
      settings: DEFAULT_SETTINGS,
      settingsUpdatedAt: 500,
    };

    const fetchMock = vi
      .fn()
      // GET /state returns 200 with remote state
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ revision: 5, updatedAt: 3000, state: remoteState }),
      })
      // PUT /state returns 200
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ revision: 6, updatedAt: 3100 }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: true,
    };
    const meta: SyncMeta = { lastRevision: 1, lastSyncedAt: null, lastError: null };

    const nextMeta = await performSyncCycle(store, config, meta, () => {});

    expect(nextMeta.lastRevision).toBe(6);
    expect(nextMeta.lastError).toBeNull();

    // Verify local tasks now contain BOTH local task and remote task
    const tasks = store.getState().tasks;
    expect(tasks.some((t) => t.title === 'Local Task')).toBe(true);
    expect(tasks.some((t) => t.title === 'Remote Task')).toBe(true);
  });

  it('a 409 triggers exactly one merge-and-retry, never an infinite loop', async () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    const conflictServerState = {
      schemaVersion: 3,
      tasks: [
        {
          id: 'conflict-task',
          title: 'Server Conflict Task',
          createdAt: 1000,
          updatedAt: 1000,
          dayKey: '2026-08-01',
          mode: 'stopwatch' as const,
          targetMs: null,
          completedAt: null,
          completedDayKey: null,
          deletedAt: null,
          categoryId: null,
          tags: [],
          notes: null,
        },
      ],
      sessions: [],
      settings: DEFAULT_SETTINGS,
      settingsUpdatedAt: 100,
    };

    const fetchMock = vi
      .fn()
      // 1. GET /state -> 204 Empty
      .mockResolvedValueOnce({ ok: true, status: 204 })
      // 2. PUT /state -> 409 Conflict with server state
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ revision: 10, updatedAt: 2000, state: conflictServerState }),
      })
      // 3. Retry PUT /state -> 409 Conflict again!
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ revision: 11, updatedAt: 2100, state: conflictServerState }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: true,
    };
    const meta: SyncMeta = { lastRevision: 5, lastSyncedAt: null, lastError: null };

    const nextMeta = await performSyncCycle(store, config, meta, () => {});

    // Should call fetch exactly 3 times (GET, PUT, RETRY PUT), never more
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Should stop and surface conflict error
    expect(nextMeta.lastError).toBe('conflict');
  });

  it('a network failure leaves local state byte-identical and surfaces status, not throw', async () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    store.getState().addTask('Stable Task', 'stopwatch', null, 1000);
    const initialTasksJson = JSON.stringify(store.getState().tasks);

    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: true,
    };
    const meta: SyncMeta = { lastRevision: 2, lastSyncedAt: 100, lastError: null };

    const nextMeta = await performSyncCycle(store, config, meta, () => {});

    expect(nextMeta.lastError).toBe('unreachable');
    expect(JSON.stringify(store.getState().tasks)).toBe(initialTasksJson);
  });

  it('activeTimer is absent from every request body', async () => {
    const memoryAdapter = createMemoryAdapter();
    const store = createAppStore(memoryAdapter);

    // Set active timer
    const task = store.getState().addTask('Running Task', 'stopwatch', null, 1000);
    store.getState().startTimerFor(task.id, 1000);

    expect(store.getState().activeTimer).not.toBeNull();

    let capturedRequestBody: { state?: Record<string, unknown> } | null = null;

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 204 }) // GET
      .mockImplementationOnce(async (_url, options) => {
        capturedRequestBody = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ revision: 1, updatedAt: 2000 }),
        };
      });

    vi.stubGlobal('fetch', fetchMock);

    const config: SyncConfig = {
      url: 'https://example.com',
      passphrase: 'pass',
      enabled: true,
    };
    const meta: SyncMeta = { lastRevision: 0, lastSyncedAt: null, lastError: null };

    await performSyncCycle(store, config, meta, () => {});

    expect((capturedRequestBody as { state?: Record<string, unknown> } | null)?.state).not.toHaveProperty('activeTimer');
  });
});
