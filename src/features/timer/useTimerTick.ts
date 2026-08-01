import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ticker as defaultTicker } from '../../platform/ticker';
import { isExpired } from '../../domain/timer/engine';
import type { ActiveTimer } from '../../domain/types';

export interface TickerLike {
  subscribe(fn: () => void): () => void;
}

function handleTimerExpiration(timer: ActiveTimer, now: number): void {
  if (timer.pomodoro !== null) {
    const settings = useAppStore.getState().settings;
    const isWork = timer.pomodoro.phase === 'work';
    const autoStart = isWork ? settings.pomodoro.autoStartBreaks : settings.pomodoro.autoStartWork;

    useAppStore.getState().startNextPomodoroPhase(now);
    if (!autoStart) {
      useAppStore.getState().pause(now);
    }
  } else {
    useAppStore.getState().finish(now);
  }
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
        handleTimerExpiration(currentTimer, Date.now());
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
          handleTimerExpiration(currentTimer, Date.now());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning]);
}
