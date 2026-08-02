import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { dayKeyFromTimestamp, type DayKey } from '../domain/time/dayKey';
import { ticker as defaultTicker } from '../platform/ticker';

export interface TickerLike {
  subscribe(fn: () => void): () => void;
}

export function useTodayKey(ticker: TickerLike = defaultTicker): DayKey {
  const dayStartHour = useAppStore((s) => s.settings.dayStartHour);

  const [todayKey, setTodayKey] = useState<DayKey>(() =>
    dayKeyFromTimestamp(Date.now(), dayStartHour)
  );

  useEffect(() => {
    const currentKey = dayKeyFromTimestamp(Date.now(), dayStartHour);
    setTodayKey(currentKey);
  }, [dayStartHour]);

  useEffect(() => {
    const unsubscribe = ticker.subscribe(() => {
      const newKey = dayKeyFromTimestamp(Date.now(), dayStartHour);
      setTodayKey((prevKey) => (prevKey === newKey ? prevKey : newKey));
    });

    return () => {
      unsubscribe();
    };
  }, [dayStartHour, ticker]);

  return todayKey;
}
