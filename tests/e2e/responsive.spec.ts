import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Layout', () => {
  test('landing page renders on mobile viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPhone 13'],
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Page should be visible and not horizontally overflow
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for rounding

    await context.close();
  });

  test('landing page renders on tablet viewport', async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['iPad Mini'],
    });
    const page = await context.newPage();

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    await context.close();
  });

  test('header is visible on all viewports', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('header')).toBeVisible();

    // Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('header')).toBeVisible();

    // Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await expect(page.locator('header')).toBeVisible();
  });
});
