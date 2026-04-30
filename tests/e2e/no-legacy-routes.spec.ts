import { test, expect } from '@playwright/test';
import { API_BASE } from './fixtures/auth';

test.describe('Legacy Route Cleanup Verification', () => {
  test('no src/app/api/ route handlers respond on presale-ui', async ({
    request,
  }) => {
    const legacyGetPaths = [
      '/api/kyc/status',
      '/api/sprint/status',
      '/api/presale/stats',
      '/api/admin/founders',
      '/api/admin/metrics',
    ];

    const legacyPostPaths = [
      '/api/kyc/initiate',
      '/api/sprint/complete',
      '/api/presale/events',
      '/api/admin/tge',
      '/api/admin/whitelist',
    ];

    for (const path of legacyGetPaths) {
      const res = await request.get(`http://localhost:3000${path}`);
      expect(
        res.status(),
        `Legacy GET route ${path} should not return 200`,
      ).not.toBe(200);
    }

    for (const path of legacyPostPaths) {
      const res = await request.post(`http://localhost:3000${path}`, {
        data: {},
      });
      expect(
        res.status(),
        `Legacy POST route ${path} should not return 200`,
      ).not.toBe(200);
    }
  });

  test('presale-ui pages do not make calls to own /api/ routes', async ({
    page,
  }) => {
    const selfApiCalls: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (
        url.startsWith('http://localhost:3000/api/') &&
        !url.includes('_next')
      ) {
        selfApiCalls.push(url);
      }
    });

    const pages = ['/', '/presale', '/sprint', '/dashboard', '/admin'];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
    }

    expect(
      selfApiCalls,
      `Found legacy API calls: ${selfApiCalls.join(', ')}`,
    ).toHaveLength(0);
  });

  test('all backend API traffic uses NEXT_PUBLIC_API_URL prefix', async ({
    page,
  }) => {
    const backendCalls: string[] = [];
    const wrongBaseUrls: string[] = [];

    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v1/')) {
        backendCalls.push(url);
        if (!url.startsWith(API_BASE.replace(/\/$/, '') + '/') && !url.startsWith(API_BASE)) {
          wrongBaseUrls.push(url);
        }
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(
      wrongBaseUrls,
      `API calls with wrong base: ${wrongBaseUrls.join(', ')}`,
    ).toHaveLength(0);
  });
});
