import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTodayKey } from './useTodayKey';
import { useAppStore } from '../store/useAppStore';

describe('useTodayKey hook', () => {
  beforeEach(() => {
    act(() => {
      useAppStore.getState().resetAll();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useTodayKey re-renders when the day changes and does NOT re-render on ticks within the same day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 10, 0, 0));

    const subscribers = new Set<() => void>();
    const mockTicker = {
      subscribe: (fn: () => void) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      },
    };

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useTodayKey(mockTicker);
    });

    expect(result.current).toBe('2026-08-01');
    const initialRenderCount = renderCount;

    // Trigger multiple ticks on the SAME day
    act(() => {
      subscribers.forEach((fn) => fn());
      subscribers.forEach((fn) => fn());
      subscribers.forEach((fn) => fn());
    });

    // Render count must NOT increment for ticks on the same day
    expect(renderCount).toBe(initialRenderCount);
    expect(result.current).toBe('2026-08-01');

    // Advance clock past midnight to next day (2026-08-02)
    vi.setSystemTime(new Date(2026, 7, 2, 10, 0, 0));

    // Trigger ticker tick on the NEW day
    act(() => {
      subscribers.forEach((fn) => fn());
    });

    // Render count MUST increment by 1 when day changes
    expect(renderCount).toBe(initialRenderCount + 1);
    expect(result.current).toBe('2026-08-02');
  });
});
