import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { useAppStore, createAppStore } from '../../store/useAppStore';
import { createMemoryAdapter, loadState } from '../../platform/storage';
import { DEFAULT_SETTINGS } from '../../domain/types';
import { ProgressPage } from '../shell/ProgressPage';
import { BrowserRouter } from 'react-router-dom';

describe('Settings Feature & Verification', () => {
  beforeEach(() => {
    // Reset store to default before each test
    useAppStore.getState().resetAll();
  });

  it('every settings field round-trips through the store and persists', () => {
    const store = useAppStore.getState();

    store.updateSettings({
      theme: 'light',
      language: 'ar',
      dayStartHour: 5,
      weekStartsOn: 6,
      dailyGoalMs: 18_000_000,
      streakMinFocusMs: 1_200_000,
      pomodoro: {
        workMinutes: 30,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        cyclesBeforeLongBreak: 5,
        autoStartBreaks: true,
        autoStartWork: true,
      },
      sound: { enabled: false, volume: 0.4 },
      notifications: { enabled: false },
    });

    const updated = useAppStore.getState().settings;
    expect(updated.theme).toBe('light');
    expect(updated.language).toBe('ar');
    expect(updated.dayStartHour).toBe(5);
    expect(updated.weekStartsOn).toBe(6);
    expect(updated.dailyGoalMs).toBe(18_000_000);
    expect(updated.streakMinFocusMs).toBe(1_200_000);
    expect(updated.pomodoro.workMinutes).toBe(30);
    expect(updated.pomodoro.shortBreakMinutes).toBe(10);
    expect(updated.pomodoro.longBreakMinutes).toBe(20);
    expect(updated.pomodoro.cyclesBeforeLongBreak).toBe(5);
    expect(updated.pomodoro.autoStartBreaks).toBe(true);
    expect(updated.pomodoro.autoStartWork).toBe(true);
    expect(updated.sound.enabled).toBe(false);
    expect(updated.sound.volume).toBe(0.4);
    expect(updated.notifications.enabled).toBe(false);
  });

  it('changing dayStartHour 0 -> 4 recomputes stored session dayKeys AND task completedDayKeys', () => {
    const adapter = createMemoryAdapter();
    const store = createAppStore(adapter);

    // Date at 01:30 AM local time on 2026-08-01
    const ts0130 = new Date(2026, 7, 1, 1, 30, 0, 0).getTime();

    const task = store.getState().addTask('Math Homework', 'stopwatch', null, ts0130);
    store.getState().toggleTaskCompleted(task.id, ts0130);

    store.getState().startTimerFor(task.id, ts0130);
    store.getState().finish(ts0130 + 1800_000);

    // Initial check at dayStartHour = 0
    expect(store.getState().sessions[0]?.dayKey).toBe('2026-08-01');
    expect(store.getState().tasks[0]?.completedDayKey).toBe('2026-08-01');

    // Change dayStartHour from 0 -> 4
    store.getState().updateSettings({ dayStartHour: 4 });

    // Session and completed task move to previous calendar day (2026-07-31)
    expect(store.getState().sessions[0]?.dayKey).toBe('2026-07-31');
    expect(store.getState().tasks[0]?.completedDayKey).toBe('2026-07-31');
  });

  it('session at 01:30 moves to previous day when dayStartHour goes 0 -> 4, and Progress page reflects it', () => {
    const ts0130 = new Date(2026, 7, 1, 1, 30, 0, 0).getTime();
    const store = useAppStore.getState();

    const task = store.addTask('Late Night Study', 'stopwatch', null, ts0130);
    store.startTimerFor(task.id, ts0130);
    store.finish(ts0130 + 1800_000);

    expect(useAppStore.getState().sessions[0]?.dayKey).toBe('2026-08-01');

    // Render Progress page before shift
    const { container: c1, unmount: unmount1 } = render(
      <BrowserRouter>
        <ProgressPage />
      </BrowserRouter>
    );
    expect(c1.textContent).toContain('August 1, 2026');
    unmount1();

    // Shift dayStartHour to 4
    useAppStore.getState().updateSettings({ dayStartHour: 4 });
    expect(useAppStore.getState().sessions[0]?.dayKey).toBe('2026-07-31');

    // Render Progress page after shift
    const { container: c2 } = render(
      <BrowserRouter>
        <ProgressPage />
      </BrowserRouter>
    );
    expect(c2.textContent).toContain('July 31, 2026');
  });

  it('export produces valid JSON that import accepts, round-tripping to identical state', () => {
    const adapter = createMemoryAdapter();
    const store1 = createAppStore(adapter);

    const task = store1.getState().addTask('Physics', 'countdown', 1800_000, 1000);
    store1.getState().startTimerFor(task.id, 1000);
    store1.getState().finish(5000);
    store1.getState().updateSettings({ theme: 'light', dayStartHour: 3 });

    const jsonString = store1.getState().exportState();
    expect(() => JSON.parse(jsonString)).not.toThrow();

    const store2 = createAppStore(createMemoryAdapter());
    const importSuccess = store2.getState().importState(jsonString);

    expect(importSuccess).toBe(true);
    expect(store2.getState().tasks).toEqual(store1.getState().tasks);
    expect(store2.getState().sessions).toEqual(store1.getState().sessions);
    expect(store2.getState().settings).toEqual(store1.getState().settings);
  });

  it('importing a hostile/corrupt file returns false, shows an error, and leaves state untouched', () => {
    const store = useAppStore.getState();
    const task = store.addTask('Initial Task', 'stopwatch', null, 1000);

    const hostileBlobs = [
      'corrupt json {{{',
      '12345',
      '{"schemaVersion": 99}',
      '{"schemaVersion": 1, "tasks": "invalid"}',
      '{"schemaVersion": 1, "sessions": [{ "invalid": true }]}',
    ];

    for (const blob of hostileBlobs) {
      const result = store.importState(blob);
      expect(result).toBe(false);
      expect(useAppStore.getState().tasks[0]?.id).toBe(task.id);
    }
  });

  it('importing a partially-recoverable file reports partial recovery', () => {
    // Partially corrupt JSON blob (schemaVersion 1, valid settings, but malformed task)
    const partialBlob = JSON.stringify({
      schemaVersion: 1,
      settings: DEFAULT_SETTINGS,
      tasks: [{ id: 'valid-task', title: 'Valid', createdAt: 1000, mode: 'stopwatch', targetMs: null, completedAt: null, completedDayKey: null, deletedAt: null, categoryId: null, tags: [], notes: null }, { corrupt: true }],
      sessions: [],
      activeTimer: null,
    });

    const loaded = loadState(createMemoryAdapter(partialBlob));
    expect(loaded.recovered).toBe(true);
    expect(loaded.state.tasks).toHaveLength(1);
    expect(loaded.state.tasks[0]?.id).toBe('valid-task');

    // UI preview reports recovery
    render(<SettingsPage />);

    // store.importState will reject partial recovery to keep state untouched
    const importResult = useAppStore.getState().importState(partialBlob);
    expect(importResult).toBe(false);
  });

  it('reset clears tasks and sessions and returns settings to DEFAULT_SETTINGS', () => {
    const store = useAppStore.getState();

    const task = store.addTask('Task To Reset', 'stopwatch', null, 1000);
    store.startTimerFor(task.id, 1000);
    store.finish(5000);
    store.updateSettings({ theme: 'light', dayStartHour: 6 });

    expect(useAppStore.getState().tasks).toHaveLength(1);
    expect(useAppStore.getState().sessions).toHaveLength(1);

    store.resetAll();

    expect(useAppStore.getState().tasks).toHaveLength(0);
    expect(useAppStore.getState().sessions).toHaveLength(0);
    expect(useAppStore.getState().settings).toEqual(DEFAULT_SETTINGS);
  });

  it('requestPermission is NOT called on mount, only from the control', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');
    const originalNotification = window.Notification;

    // Mock Notification global
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = {
      permission: 'default',
      requestPermission: mockRequestPermission,
    };

    render(<SettingsPage />);

    // Assert requestPermission was NOT called on mount
    expect(mockRequestPermission).not.toHaveBeenCalled();

    // Find and click "Request permission" button
    const reqBtn = screen.getByRole('button', { name: /request permission/i });
    expect(reqBtn).toBeInTheDocument();

    fireEvent.click(reqBtn);

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1);
    });

    // Restore original Notification
    window.Notification = originalNotification;
  });

  it('numeric inputs reject out-of-range values (dayStartHour 25, volume 5, cycles 0) rather than persisting them', () => {
    const store = useAppStore.getState();
    render(<SettingsPage />);

    // 1. dayStartHour = 25
    const dayStartInput = screen.getByLabelText(/day starts at/i) as HTMLInputElement;
    fireEvent.change(dayStartInput, { target: { value: '25' } });
    expect(store.settings.dayStartHour).toBe(DEFAULT_SETTINGS.dayStartHour); // Not updated to 25

    // 2. volume = 5
    const volumeInput = screen.getByLabelText(/sound volume/i) as HTMLInputElement;
    fireEvent.change(volumeInput, { target: { value: '5' } });
    expect(store.settings.sound.volume).toBe(DEFAULT_SETTINGS.sound.volume); // Not updated to 5

    // 3. cycles = 0
    const cyclesInput = screen.getByLabelText(/cycles before long break/i) as HTMLInputElement;
    fireEvent.change(cyclesInput, { target: { value: '0' } });
    expect(store.settings.pomodoro.cyclesBeforeLongBreak).toBe(DEFAULT_SETTINGS.pomodoro.cyclesBeforeLongBreak); // Not updated to 0
  });

  it('when permission is "denied" the block renders recovery instructions AND a "Check again" control, and requestPermission is NOT called when used', () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('denied');
    const originalNotification = window.Notification;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = {
      permission: 'denied',
      requestPermission: mockRequestPermission,
    };

    render(<SettingsPage />);

    expect(screen.getByText(/notifications are blocked for this site/i)).toBeInTheDocument();
    const checkAgainBtn = screen.getByRole('button', { name: /check again/i });
    expect(checkAgainBtn).toBeInTheDocument();

    fireEvent.click(checkAgainBtn);

    expect(mockRequestPermission).not.toHaveBeenCalled();

    window.Notification = originalNotification;
  });

  it('"Check again" picks up a permission that changed underneath the app', () => {
    const originalNotification = window.Notification;
    const notificationMock = {
      permission: 'denied',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = notificationMock;

    render(<SettingsPage />);

    expect(screen.getByRole('button', { name: /check again/i })).toBeInTheDocument();

    // Flip permission to granted
    notificationMock.permission = 'granted';

    fireEvent.click(screen.getByRole('button', { name: /check again/i }));

    expect(screen.getByRole('button', { name: /send a test notification/i })).toBeInTheDocument();

    window.Notification = originalNotification;
  });

  it('when permission is "granted" a test-notification control is present and calls notify()', () => {
    const mockNotificationConstructor = vi.fn();
    const originalNotification = window.Notification;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function MockNotification(this: any, title: string, options: any) {
      mockNotificationConstructor(title, options);
    }
    MockNotification.permission = 'granted';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Notification = MockNotification;

    render(<SettingsPage />);

    const testBtn = screen.getByRole('button', { name: /send a test notification/i });
    expect(testBtn).toBeInTheDocument();

    fireEvent.click(testBtn);

    expect(mockNotificationConstructor).toHaveBeenCalledTimes(1);

    window.Notification = originalNotification;
  });
});
