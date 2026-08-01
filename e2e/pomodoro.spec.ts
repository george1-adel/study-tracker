import { test, expect } from '@playwright/test';

test.describe('Pomodoro Fast-Forward', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('pomodoro completes on time under fast-forwarded clock without completing task', async ({ page }) => {
    await page.clock.install();

    await page.goto('/');

    // Create a pomodoro task
    await page.getByPlaceholder('Task title...').fill('Pomodoro Task');
    await page.getByRole('combobox', { name: 'Mode' }).selectOption('pomodoro');
    await page.getByRole('button', { name: 'Add task' }).click();

    // Start pomodoro
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Fast-forward 25 minutes
    await page.clock.fastForward('25:00');

    // Verify localStorage state
    const stateStr = await page.evaluate(() => localStorage.getItem('study-tracker:v1'));
    expect(stateStr).not.toBeNull();
    const state = JSON.parse(stateStr!);

    // Assert work session recorded with durationMs exactly 1500000
    const workSession = state.sessions.find((s: { kind: string }) => s.kind === 'pomodoro_work');
    expect(workSession).toBeDefined();
    expect(workSession.durationMs).toBe(1500000);

    // Assert the task is NOT marked complete (docs/DECISIONS.md D5)
    const task = state.tasks.find((t: { title: string }) => t.title === 'Pomodoro Task');
    expect(task).toBeDefined();
    expect(task.completedAt).toBeNull();
    expect(task.completedDayKey).toBeNull();
  });
});
