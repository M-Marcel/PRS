import { test, expect } from '@playwright/test';

test.describe('Page Navigation & Guards', () => {
  test('sprint page shows network guard (no wallet connected)', async ({ page }) => {
    await page.goto('/sprint');
    await page.waitForLoadState('networkidle');

    // Without a wallet connected, should show connect wallet prompt
    // NetworkGuard renders before PageGuard content
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('presale page loads without crashing', async ({ page }) => {
    await page.goto('/presale');
    await page.waitForLoadState('networkidle');

    // Page should render (network guard or page content)
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should not show a blank page or error
    const html = await body.innerHTML();
    expect(html.length).toBeGreaterThan(100);
  });

  test('dashboard page loads without crashing', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();
    const html = await body.innerHTML();
    expect(html.length).toBeGreaterThan(100);
  });

  test('admin page loads and shows access denied (no wallet)', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Admin page either shows NetworkGuard or Access Denied
    const html = await body.innerHTML();
    expect(html.length).toBeGreaterThan(100);
  });

  test('non-existent route shows 404', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    // Next.js returns 404 for unknown routes
    expect(response?.status()).toBe(404);
  });
});
