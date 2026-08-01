import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ticker as defaultTicker } from '../../platform/ticker';
import { isExpired } from '../../domain/timer/engine';

export interface TickerLike {
  subscribe(fn: () => void): () => void;
}

export function useTimerTick(ticker: TickerLike = defaultTicker): void {
  const [, setTick] = useState(0);
  const activeTimer = useAppStore((s) => s.activeTimer);
  const isRunning = activeTimer?.status === 'running';

  useEffect(() => {
    if (!isRunning) return;

    const unsubscribe = ticker.subscribe(() => {
      const currentTimer = useAppStore.getState().activeTimer;
      if (currentTimer && currentTimer.status === 'running' && isExpired(currentTimer, Date.now())) {
        useAppStore.getState().finish(Date.now());
      }
      setTick((t) => t + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [isRunning, ticker]);

  useEffect(() => {
    if (!isRunning) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const currentTimer = useAppStore.getState().activeTimer;
        if (currentTimer && currentTimer.status === 'running' && isExpired(currentTimer, Date.now())) {
          useAppStore.getState().finish(Date.now());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning]);
}
