import { test, expect } from '@playwright/test';
import { API_BASE, assertBackendHealthy } from './fixtures/auth';

test.describe('Frontend-to-Backend Wiring', () => {
  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);
  });

  // ─── Public Pages ──────────────────────────────────────────

  test.describe('Public Pages', () => {
    test('landing page loads without API errors', async ({ page }) => {
      const apiErrors: string[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/api/') && response.status() >= 500) {
          apiErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      expect(apiErrors).toHaveLength(0);
    });

    test('no legacy /api/ calls to presale-ui own routes', async ({
      page,
    }) => {
      const legacyCalls: string[] = [];

      page.on('request', (req) => {
        const url = req.url();
        if (
          url.includes('localhost:3000/api/') ||
          (url.match(/^\/api\//) && !url.includes('localhost:3001'))
        ) {
          legacyCalls.push(url);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.goto('/presale');
      await page.waitForLoadState('networkidle');

      expect(legacyCalls).toHaveLength(0);
    });

    test('all API calls target actx-cloud backend', async ({ page }) => {
      const apiCalls: string[] = [];

      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/v1/')) {
          apiCalls.push(url);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      for (const url of apiCalls) {
        expect(url).toContain('localhost:3001/api/v1');
      }
    });

    test('presale page renders without crashing', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (
            !text.includes('hydrat') &&
            !text.includes('RainbowKit') &&
            !text.includes('wagmi') &&
            !text.includes('Failed to fetch') &&
            !text.includes('Failed to load resource') &&
            !text.includes('the server responded with a status of')
          ) {
            consoleErrors.push(text);
          }
        }
      });

      await page.goto('/presale');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      expect(consoleErrors).toHaveLength(0);
    });
  });

  // ─── Protected Pages — Guard Behavior ──────────────────────

  test.describe('Protected Pages — Guard Behavior', () => {
    test('sprint page shows wallet connection prompt', async ({ page }) => {
      await page.goto('/sprint');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet|sign in/);
    });

    test('admin page restricts access without wallet', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(
        /connect|access|denied|wallet|admin/,
      );
    });

    test('dashboard page shows wallet connection prompt', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet|sign in/);
    });
  });

  // ─── Error Rendering via Route Mocking ─────────────────────

  test.describe('Error Rendering via Route Mocking', () => {
    test('mocked 403 renders without crash', async ({ page }) => {
      await page.route('**/api/v1/admin/**', (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Forbidden',
          }),
        }),
      );

      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(
        /connect|access|denied|wallet|admin|forbidden/,
      );
    });

    test('mocked 500 does not crash the page', async ({ page }) => {
      await page.route('**/api/v1/presale/stats', (route) =>
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal Server Error',
          }),
        }),
      );

      await page.goto('/presale');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test('mocked network failure does not crash the page', async ({
      page,
    }) => {
      await page.route('**/api/v1/**', (route) => route.abort('failed'));

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('body')).toBeVisible();
    });
  });
});
