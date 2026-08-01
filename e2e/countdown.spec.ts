import { test, expect } from '@playwright/test';

test.describe('Countdown Hidden', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('countdown completes while hidden and clamps duration to target', async ({ page }) => {
    await page.clock.install();

    await page.goto('/');

    // Create a countdown task (1 minute = 60000 ms)
    await page.getByPlaceholder('Task title...').fill('Countdown Task');
    await page.getByRole('combobox', { name: 'Mode' }).selectOption('countdown');

    // Set duration to 1 minute
    const minutesInput = page.getByRole('spinbutton', { name: 'Minutes' });
    await minutesInput.fill('1');

    await page.getByRole('button', { name: 'Add task' }).click();

    // Start countdown
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Dispatch visibilitychange to hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Fast-forward past target (2 minutes)
    await page.clock.fastForward('02:00');

    // Return to visible
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify localStorage state
    const stateStr = await page.evaluate(() => localStorage.getItem('study-tracker:v1'));
    expect(stateStr).not.toBeNull();
    const state = JSON.parse(stateStr!);

    // Assert countdown session recorded with duration clamped to 60000
    const session = state.sessions.find((s: { kind: string }) => s.kind === 'countdown');
    expect(session).toBeDefined();
    expect(session.durationMs).toBe(60000);
    expect(session.completed).toBe(true);

    // Assert task is completed
    const task = state.tasks.find((t: { title: string }) => t.title === 'Countdown Task');
    expect(task).toBeDefined();
    expect(task.completedAt).not.toBeNull();
  });
});
