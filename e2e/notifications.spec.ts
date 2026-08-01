import { test, expect } from '@playwright/test';

test.describe('Notifications Denied', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearPermissions();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('countdown completes when notifications denied and shows in-app message without throwing', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.clock.install();

    await page.goto('/');

    // Create a 1-minute countdown task
    await page.getByPlaceholder('Task title...').fill('Notification Test Task');
    await page.getByRole('combobox', { name: 'Mode' }).selectOption('countdown');

    const minutesInput = page.getByRole('spinbutton', { name: 'Minutes' });
    await minutesInput.fill('1');

    await page.getByRole('button', { name: 'Add task' }).click();

    // Start countdown
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Fast-forward 1 minute
    await page.clock.fastForward('01:00');

    // Assert no uncaught page error occurred
    expect(errors).toHaveLength(0);

    // Assert in-app toast message appears
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible();

    // Assert task completed
    const stateStr = await page.evaluate(() => localStorage.getItem('study-tracker:v1'));
    expect(stateStr).not.toBeNull();
    const state = JSON.parse(stateStr!);
    const task = state.tasks.find((t: { title: string }) => t.title === 'Notification Test Task');
    expect(task).toBeDefined();
    expect(task.completedAt).not.toBeNull();
  });
});
