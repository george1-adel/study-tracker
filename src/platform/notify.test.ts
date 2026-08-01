import { describe, it, expect, afterEach, vi } from 'vitest';
import { canNotify, notify, requestPermission } from './notify';

describe('notify', () => {
  const originalNotification = globalThis.Notification;

  afterEach(() => {
    if (originalNotification === undefined) {
      // @ts-expect-error cleaning up mock
      delete globalThis.Notification;
    } else {
      globalThis.Notification = originalNotification;
    }
    vi.restoreAllMocks();
  });

  it("returns 'unsupported' when Notification is undefined", () => {
    // @ts-expect-error deleting Notification for test
    delete globalThis.Notification;
    expect(canNotify()).toBe(false);
    expect(notify('Title', 'Body')).toBe('unsupported');
  });

  it("returns 'denied' when permission is denied", () => {
    class MockNotification {
      static permission: NotificationPermission = 'denied';
    }
    // @ts-expect-error setting mock Notification
    globalThis.Notification = MockNotification;

    expect(canNotify()).toBe(false);
    expect(notify('Title', 'Body')).toBe('denied');
  });

  it("returns 'denied' when permission is default", () => {
    class MockNotification {
      static permission: NotificationPermission = 'default';
    }
    // @ts-expect-error setting mock Notification
    globalThis.Notification = MockNotification;

    expect(canNotify()).toBe(false);
    expect(notify('Title', 'Body')).toBe('denied');
  });

  it("does not throw when constructor throws and returns 'failed'", () => {
    class MockNotification {
      static permission: NotificationPermission = 'granted';
      constructor() {
        throw new Error('TypeError: Failed to construct Notification');
      }
    }
    // @ts-expect-error setting mock Notification
    globalThis.Notification = MockNotification;

    expect(canNotify()).toBe(true);
    expect(() => notify('Title', 'Body')).not.toThrow();
    expect(notify('Title', 'Body')).toBe('failed');
  });

  it("returns 'shown' when permission is granted and constructor succeeds", () => {
    const fn = vi.fn();
    class MockNotification {
      static permission: NotificationPermission = 'granted';
      constructor(title: string, options?: NotificationOptions) {
        fn(title, options);
      }
    }
    // @ts-expect-error setting mock Notification
    globalThis.Notification = MockNotification;

    expect(canNotify()).toBe(true);
    expect(notify('Title', 'Body')).toBe('shown');
    expect(fn).toHaveBeenCalledWith('Title', { body: 'Body' });
  });

  it("requestPermission resolves permission safely", async () => {
    class MockNotification {
      static requestPermission = vi.fn().mockResolvedValue('granted');
    }
    // @ts-expect-error setting mock Notification
    globalThis.Notification = MockNotification;

    const res = await requestPermission();
    expect(res).toBe('granted');
  });

  it("requestPermission resolves 'denied' when Notification is undefined", async () => {
    // @ts-expect-error deleting Notification for test
    delete globalThis.Notification;

    const res = await requestPermission();
    expect(res).toBe('denied');
  });
});
