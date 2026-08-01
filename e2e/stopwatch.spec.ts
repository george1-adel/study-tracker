import { test, expect } from '@playwright/test';

test.describe('Stopwatch Reload', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('stopwatch timer survives page reload and continues running', async ({ page }) => {
    // Create a stopwatch task
    const titleInput = page.getByPlaceholder('Task title...');
    await titleInput.fill('Stopwatch Task');
    await page.getByRole('button', { name: 'Add task' }).click();

    // Start the stopwatch
    const startButton = page.getByRole('button', { name: 'Start' }).first();
    await startButton.click();

    // Verify clock is visible
    const clock = page.locator('.timer-clock');
    await expect(clock).toBeVisible();

    // Read clock text before waiting
    const initialText = (await clock.innerText()).trim();

    // Wait 1.5 seconds real wall-clock time
    await page.waitForTimeout(1500);

    // Reload the page
    await page.reload();

    // Read clock text after reload
    await expect(clock).toBeVisible();
    const afterReloadText = (await clock.innerText()).trim();

    const parseSeconds = (str: string) => {
      const parts = str.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    };

    const initialSec = parseSeconds(initialText);
    const afterReloadSec = parseSeconds(afterReloadText);

    expect(afterReloadSec).toBeGreaterThan(initialSec);
  });
});
