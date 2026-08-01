export function createTicker(intervalMs: number = 1000): {
  subscribe(fn: () => void): () => void;
  stop(): void;
} {
  let timerId: ReturnType<typeof setInterval> | null = null;
  const subscribers = new Set<{ fn: () => void }>();

  function tick() {
    const snapshot = Array.from(subscribers);
    for (const sub of snapshot) {
      try {
        sub.fn();
      } catch {
        // Guard against a subscriber throwing:
        // one bad callback must not kill the interval for the others.
      }
    }
  }

  function stop() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
    subscribers.clear();
  }

  function subscribe(fn: () => void): () => void {
    const sub = { fn };
    subscribers.add(sub);
    if (timerId === null) {
      timerId = setInterval(tick, intervalMs);
    }

    let unsubscribed = false;
    return () => {
      if (unsubscribed) return;
      unsubscribed = true;
      subscribers.delete(sub);
      if (subscribers.size === 0 && timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };
  }

  return { subscribe, stop };
}

export const ticker: { subscribe(fn: () => void): () => void } = createTicker(1000);
