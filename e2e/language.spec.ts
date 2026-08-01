import { test, expect } from '@playwright/test';

test.describe('Language Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('language toggle flips direction to rtl while keeping tape dir=ltr', async ({ page }) => {
    await page.goto('/');

    // Initially dir is ltr
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Click language toggle button
    const langBtn = page.getByRole('button', { name: 'Toggle language' });
    await langBtn.click();

    // Assert html[dir] becomes 'rtl'
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // Assert nav text is Arabic
    const navText = page.locator('.nav-rail, .bottom-nav').first();
    await expect(navText).toContainText('لوحة التحكم');

    // Assert tape container is STILL dir='ltr'
    const tapeContainer = page.locator('.tape-container').first();
    await expect(tapeContainer).toHaveAttribute('dir', 'ltr');
  });
});
