import { useEffect, useState, useCallback, useRef } from 'react';
import { defaultStore, type AppState } from '../store/useAppStore';
import {
  loadSyncData,
  saveSyncData,
  performSyncCycle,
  type SyncConfig,
  type SyncMeta,
} from './sync';

export interface SyncEngineState {
  config: SyncConfig;
  meta: SyncMeta;
  syncing: boolean;
  syncNow: () => Promise<void>;
  updateConfig: (patch: Partial<SyncConfig>) => void;
}

export function useSyncEngine(): SyncEngineState {
  const [data, setData] = useState<{ config: SyncConfig; meta: SyncMeta }>(() => loadSyncData());
  const [syncing, setSyncing] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncingRef = useRef(false);

  const runSync = useCallback(async () => {
    const { config, meta } = loadSyncData();
    if (!config.enabled || !config.url.trim() || !config.passphrase.trim()) {
      return;
    }
    if (syncingRef.current) return;

    syncingRef.current = true;
    setSyncing(true);

    try {
      const nextMeta = await performSyncCycle(defaultStore, config, meta, (m) => {
        saveSyncData({ meta: m });
        setData((prev) => ({ ...prev, meta: m }));
      });
      setData({ config, meta: nextMeta });
    } catch {
      // Ignore unhandled exceptions, performSyncCycle handles network errors
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  const updateConfig = useCallback((patch: Partial<SyncConfig>) => {
    const current = loadSyncData();
    const nextConfig = { ...current.config, ...patch };
    saveSyncData({ config: nextConfig });
    setData((prev) => ({ ...prev, config: nextConfig }));

    if (nextConfig.enabled && nextConfig.url.trim() && nextConfig.passphrase.trim()) {
      runSync();
    }
  }, [runSync]);

  const syncNow = useCallback(async () => {
    await runSync();
  }, [runSync]);

  // Initial sync on mount if enabled
  useEffect(() => {
    runSync();
  }, [runSync]);

  // Sync on window focus, visibilitychange, online
  useEffect(() => {
    const handleFocus = () => {
      runSync();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };

    const handleOnline = () => {
      runSync();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [runSync]);

  // Debounced sync on store mutation (~2s)
  useEffect(() => {
    let lastSlice = {
      tasks: defaultStore.getState().tasks,
      sessions: defaultStore.getState().sessions,
      settings: defaultStore.getState().settings,
      settingsUpdatedAt: defaultStore.getState().settingsUpdatedAt,
    };

    const unsubscribe = defaultStore.subscribe((state: AppState) => {
      const changed =
        state.tasks !== lastSlice.tasks ||
        state.sessions !== lastSlice.sessions ||
        state.settings !== lastSlice.settings ||
        state.settingsUpdatedAt !== lastSlice.settingsUpdatedAt;

      lastSlice = {
        tasks: state.tasks,
        sessions: state.sessions,
        settings: state.settings,
        settingsUpdatedAt: state.settingsUpdatedAt,
      };

      if (changed) {
        const { config } = loadSyncData();
        if (config.enabled && config.url.trim() && config.passphrase.trim()) {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(() => {
            runSync();
          }, 2000);
        }
      }
    });

    return () => {
      unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [runSync]);

  return {
    config: data.config,
    meta: data.meta,
    syncing,
    syncNow,
    updateConfig,
  };
}
