import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTicker, ticker } from './ticker';

describe('ticker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not create an interval before the first subscriber', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const instance = createTicker(1000);

    expect(setIntervalSpy).not.toHaveBeenCalled();
    instance.stop();
  });

  it('creates interval on first subscribe and notifies subscribers on tick', () => {
    const instance = createTicker(1000);
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const unsub1 = instance.subscribe(cb1);
    expect(cb1).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(cb1).toHaveBeenCalledTimes(1);

    const unsub2 = instance.subscribe(cb2);

    vi.advanceTimersByTime(1000);
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  it('clears interval after the last subscriber unsubscribes', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const instance = createTicker(1000);
    const cb = vi.fn();

    const unsub = instance.subscribe(cb);
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    unsub();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('handles double-unsubscribe safely without throwing or removing other subscribers', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const instance = createTicker(1000);
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    const unsub1 = instance.subscribe(cb1);
    const unsub2 = instance.subscribe(cb2);

    unsub1();
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    // Calling unsub1 a second time should be a no-op
    expect(() => unsub1()).not.toThrow();
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);

    unsub2();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('guards against a throwing subscriber without stopping others or killing the interval', () => {
    const instance = createTicker(1000);
    const throwingCb = vi.fn().mockImplementation(() => {
      throw new Error('Subscriber error');
    });
    const goodCb = vi.fn();

    const unsub1 = instance.subscribe(throwingCb);
    const unsub2 = instance.subscribe(goodCb);

    expect(() => vi.advanceTimersByTime(1000)).not.toThrow();

    expect(throwingCb).toHaveBeenCalledTimes(1);
    expect(goodCb).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(throwingCb).toHaveBeenCalledTimes(2);
    expect(goodCb).toHaveBeenCalledTimes(2);

    unsub1();
    unsub2();
  });

  it('singleton export ticker responds to subscribe', () => {
    const cb = vi.fn();
    const unsub = ticker.subscribe(cb);

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
  });
});
