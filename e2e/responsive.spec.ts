import { test, expect } from '@playwright/test';

test.describe('Part B Responsive & Layout Audit', () => {
  const routes = ['/', '/progress', '/analytics', '/settings'];
  const viewports = [
    { width: 360, height: 640 },
    { width: 768, height: 1024 },
    { width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    for (const route of routes) {
      test(`no horizontal scroll at ${vp.width}px on route ${route}`, async ({ page }) => {
        await page.setViewportSize(vp);
        await page.goto(route);

        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        expect(hasHorizontalScroll).toBe(false);
      });
    }
  }

  test('bottom nav links measure at least 44x44px at 360px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/');

    const bottomNavLinks = page.locator('.bottom-nav .nav-link');
    const count = await bottomNavLinks.count();
    expect(count).toBe(4);

    for (let i = 0; i < count; i++) {
      const box = await bottomNavLinks.nth(i).boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
