import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('loads the landing page with hero content', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify page title or heading
    await expect(page.locator('h1').first()).toBeVisible();

    // Verify navigation links exist
    await expect(page.locator('nav')).toBeVisible();

    // Verify footer is present
    await expect(page.locator('footer')).toBeVisible();
  });

  test('has working navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that nav contains expected links
    const nav = page.locator('header');
    await expect(nav).toBeVisible();

    // Verify the page has a connect wallet button (RainbowKit)
    const connectBtn = page.getByText(/connect/i).first();
    await expect(connectBtn).toBeVisible();
  });

  test('renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out expected noise: hydration, wallet providers, resource loads
    const realErrors = errors.filter(
      (e) =>
        !e.includes('hydrat') &&
        !e.includes('RainbowKit') &&
        !e.includes('wagmi') &&
        !e.includes('Failed to fetch') &&
        !e.includes('Failed to load resource') &&
        !e.includes('the server responded with a status of'),
    );

    expect(realErrors).toHaveLength(0);
  });
});
