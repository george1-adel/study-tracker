import type { StoreApi } from 'zustand/vanilla';
import type { AppStore } from '../store/useAppStore';
import { mergeStates, type SyncableState } from '../domain/sync/merge';
import { SCHEMA_VERSION } from '../domain/types';

export const SYNC_STORAGE_KEY = 'study-tracker:sync';

export interface SyncConfig {
  url: string;
  passphrase: string;
  enabled: boolean;
}

export type SyncError = 'unreachable' | 'auth_error' | 'conflict' | 'error' | null;

export interface SyncMeta {
  lastRevision: number;
  lastSyncedAt: number | null;
  lastError: SyncError;
}

export interface SyncStorageData {
  config: SyncConfig;
  meta: SyncMeta;
}

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  url: '',
  passphrase: '',
  enabled: false,
};

export const DEFAULT_SYNC_META: SyncMeta = {
  lastRevision: 0,
  lastSyncedAt: null,
  lastError: null,
};

export function loadSyncData(customStorage?: Storage): SyncStorageData {
  const storage = customStorage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!storage) {
    return { config: DEFAULT_SYNC_CONFIG, meta: DEFAULT_SYNC_META };
  }
  try {
    const raw = storage.getItem(SYNC_STORAGE_KEY);
    if (!raw) {
      return { config: DEFAULT_SYNC_CONFIG, meta: DEFAULT_SYNC_META };
    }
    const parsed = JSON.parse(raw);
    const config: SyncConfig = {
      url: typeof parsed?.config?.url === 'string' ? parsed.config.url : DEFAULT_SYNC_CONFIG.url,
      passphrase: typeof parsed?.config?.passphrase === 'string' ? parsed.config.passphrase : DEFAULT_SYNC_CONFIG.passphrase,
      enabled: typeof parsed?.config?.enabled === 'boolean' ? parsed.config.enabled : DEFAULT_SYNC_CONFIG.enabled,
    };
    const meta: SyncMeta = {
      lastRevision: typeof parsed?.meta?.lastRevision === 'number' ? parsed.meta.lastRevision : DEFAULT_SYNC_META.lastRevision,
      lastSyncedAt: typeof parsed?.meta?.lastSyncedAt === 'number' ? parsed.meta.lastSyncedAt : DEFAULT_SYNC_META.lastSyncedAt,
      lastError: parsed?.meta?.lastError ?? DEFAULT_SYNC_META.lastError,
    };
    return { config, meta };
  } catch {
    return { config: DEFAULT_SYNC_CONFIG, meta: DEFAULT_SYNC_META };
  }
}

export function saveSyncData(data: Partial<SyncStorageData>, customStorage?: Storage): void {
  const storage = customStorage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!storage) return;
  try {
    const existing = loadSyncData(storage);
    const updated: SyncStorageData = {
      config: data.config ? { ...existing.config, ...data.config } : existing.config,
      meta: data.meta ? { ...existing.meta, ...data.meta } : existing.meta,
    };
    storage.setItem(SYNC_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage write errors
  }
}

export function extractSyncableState(storeState: Pick<AppStore, 'tasks' | 'sessions' | 'settings' | 'settingsUpdatedAt'>): SyncableState {
  return {
    schemaVersion: SCHEMA_VERSION,
    tasks: storeState.tasks,
    sessions: storeState.sessions,
    settings: storeState.settings,
    settingsUpdatedAt: storeState.settingsUpdatedAt,
  };
}

/**
 * Whitelist the fields that may leave this device.
 *
 * SyncableState has no activeTimer, but TypeScript's structural typing happily accepts a
 * full PersistedState here - excess properties are only rejected on object literals - so the
 * type alone does NOT stop a running timer (and the task id it points at) being uploaded.
 * A timer belongs to the device in front of you; pick the fields explicitly rather than
 * trusting the caller to hand over an already-narrow object.
 */
export function toSyncable(state: SyncableState): SyncableState {
  return {
    schemaVersion: state.schemaVersion,
    tasks: state.tasks,
    sessions: state.sessions,
    settings: state.settings,
    settingsUpdatedAt: state.settingsUpdatedAt,
  };
}

export function createSyncClient(cfg: SyncConfig) {
  const baseUrl = cfg.url.trim().replace(/\/+$/, '');

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.passphrase}`,
  });

  return {
    async testConnection(): Promise<boolean> {
      if (!baseUrl) return false;
      try {
        const res = await fetch(`${baseUrl}/health`);
        if (!res.ok) return false;
        const data = await res.json().catch(() => null);
        return Boolean(data && data.ok === true);
      } catch {
        return false;
      }
    },

    async pull(): Promise<{
      status: 'success' | 'empty' | 'unreachable' | 'auth_error' | 'error';
      remoteState?: SyncableState;
      revision?: number;
      updatedAt?: number;
    }> {
      try {
        const res = await fetch(`${baseUrl}/state`, {
          method: 'GET',
          headers: getHeaders(),
        });

        if (res.status === 401) {
          return { status: 'auth_error' };
        }
        if (res.status === 204) {
          return { status: 'empty' };
        }
        if (!res.ok) {
          return { status: 'error' };
        }

        const data = await res.json();
        return {
          status: 'success',
          remoteState: data.state,
          revision: data.revision,
          updatedAt: data.updatedAt,
        };
      } catch {
        return { status: 'unreachable' };
      }
    },

    async push(
      localState: SyncableState,
      baseRevision: number
    ): Promise<{
      status: 'success' | 'conflict' | 'unreachable' | 'auth_error' | 'error';
      revision?: number;
      updatedAt?: number;
      serverState?: SyncableState;
    }> {
      try {
        const res = await fetch(`${baseUrl}/state`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ baseRevision, state: toSyncable(localState) }),
        });

        if (res.status === 401) {
          return { status: 'auth_error' };
        }
        if (res.status === 409) {
          const data = await res.json().catch(() => ({}));
          return {
            status: 'conflict',
            revision: data.revision,
            updatedAt: data.updatedAt,
            serverState: data.state,
          };
        }
        if (!res.ok) {
          return { status: 'error' };
        }

        const data = await res.json();
        return {
          status: 'success',
          revision: data.revision,
          updatedAt: data.updatedAt,
        };
      } catch {
        return { status: 'unreachable' };
      }
    },
  };
}

export async function performSyncCycle(
  store: StoreApi<AppStore>,
  syncConfig: SyncConfig,
  currentMeta: SyncMeta,
  saveMeta: (meta: SyncMeta) => void
): Promise<SyncMeta> {
  if (!syncConfig.enabled || !syncConfig.url.trim() || !syncConfig.passphrase.trim()) {
    const meta: SyncMeta = { ...currentMeta, lastError: null };
    saveMeta(meta);
    return meta;
  }

  const client = createSyncClient(syncConfig);
  let revision = currentMeta.lastRevision;

  // 1. PULL
  const pullRes = await client.pull();
  if (pullRes.status === 'auth_error') {
    const meta: SyncMeta = { ...currentMeta, lastError: 'auth_error' };
    saveMeta(meta);
    return meta;
  }
  if (pullRes.status === 'unreachable') {
    const meta: SyncMeta = { ...currentMeta, lastError: 'unreachable' };
    saveMeta(meta);
    return meta;
  }
  if (pullRes.status === 'error') {
    const meta: SyncMeta = { ...currentMeta, lastError: 'error' };
    saveMeta(meta);
    return meta;
  }

  if (pullRes.status === 'success' && pullRes.remoteState) {
    const local = extractSyncableState(store.getState());
    const merged = mergeStates(local, pullRes.remoteState);
    store.getState().applySyncedState(merged);
    if (typeof pullRes.revision === 'number') {
      revision = pullRes.revision;
    }
  }

  // 2. PUSH
  const localToPush = extractSyncableState(store.getState());
  const pushRes = await client.push(localToPush, revision);

  if (pushRes.status === 'success') {
    const nextMeta: SyncMeta = {
      lastRevision: pushRes.revision ?? revision,
      lastSyncedAt: Date.now(),
      lastError: null,
    };
    saveMeta(nextMeta);
    return nextMeta;
  }

  if (pushRes.status === 'conflict' && pushRes.serverState) {
    // Merge server state and retry ONCE
    const currentLocal = extractSyncableState(store.getState());
    const merged = mergeStates(currentLocal, pushRes.serverState);
    store.getState().applySyncedState(merged);
    const newBaseRev = pushRes.revision ?? revision;

    const retryToPush = extractSyncableState(store.getState());
    const retryRes = await client.push(retryToPush, newBaseRev);

    if (retryRes.status === 'success') {
      const nextMeta: SyncMeta = {
        lastRevision: retryRes.revision ?? newBaseRev,
        lastSyncedAt: Date.now(),
        lastError: null,
      };
      saveMeta(nextMeta);
      return nextMeta;
    }

    // Failed on retry: stop and report
    const nextMeta: SyncMeta = {
      lastRevision: retryRes.revision ?? newBaseRev,
      lastSyncedAt: currentMeta.lastSyncedAt,
      lastError: retryRes.status === 'auth_error' ? 'auth_error' : retryRes.status === 'unreachable' ? 'unreachable' : 'conflict',
    };
    saveMeta(nextMeta);
    return nextMeta;
  }

  // Other error on push
  const nextMeta: SyncMeta = {
    ...currentMeta,
    lastError: pushRes.status === 'auth_error' ? 'auth_error' : pushRes.status === 'unreachable' ? 'unreachable' : 'error',
  };
  saveMeta(nextMeta);
  return nextMeta;
}
