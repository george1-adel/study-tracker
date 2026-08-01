import { test, expect } from '@playwright/test';

test.describe('Corrupt Storage Recovery', () => {
  test('boots to working app with malformed non-JSON string in storage', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.addInitScript(() => {
      localStorage.setItem('study-tracker:v1', '{');
    });

    await page.goto('/');

    expect(pageErrors).toHaveLength(0);
    await expect(page.locator('.app-brand')).toBeVisible();
    await expect(page.locator('.tape-container')).toBeVisible();
  });

  test('boots to working app with valid JSON of wrong schema/shape in storage', async ({ page }) => {
    const pageErrors: Error[] = [];
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.addInitScript(() => {
      localStorage.setItem(
        'study-tracker:v1',
        JSON.stringify({ schemaVersion: 99, tasks: 'corrupt', settings: null })
      );
    });

    await page.goto('/');

    expect(pageErrors).toHaveLength(0);
    await expect(page.locator('.app-brand')).toBeVisible();
    await expect(page.locator('.tape-container')).toBeVisible();
  });
});
