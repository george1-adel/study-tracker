import { test, expect } from '@playwright/test';

test.describe('Full Manual Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('creates a task, starts it, finishes it, and verifies it moves to Completed and appears on Progress page', async ({ page }) => {
    await page.goto('/');

    // Create a task
    await page.getByPlaceholder('Task title...').fill('Manual Flow Task');
    await page.getByRole('button', { name: 'Add task' }).click();

    // Verify task created in pending list
    await expect(page.getByText('Manual Flow Task')).toBeVisible();

    // Start task
    await page.getByRole('button', { name: 'Start' }).first().click();

    // Wait 1 sec real time so non-zero duration is logged
    await page.waitForTimeout(1000);

    // Finish task
    await page.getByRole('button', { name: 'Finish' }).first().click();

    // Assert task moves to Completed section
    await expect(page.getByText('Completed (1)')).toBeVisible();

    // Navigate to Progress page
    const progressNav = page.locator('.nav-rail, .bottom-nav').getByRole('link', { name: 'Progress' }).first();
    await progressNav.click();

    // Verify Progress page loaded and completed task / session is displayed
    await expect(page).toHaveURL(/.*progress/);
    await expect(page.locator('.progress-page')).toBeVisible();
    await expect(page.getByText('Completed tasks')).toBeVisible();
  });
});
