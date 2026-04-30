import { test, expect } from '@playwright/test';
import {
  API_BASE,
  ADMIN_ADDRESS,
  NON_ADMIN_ADDRESS,
  adminAccount,
  nonAdminAccount,
  getAdminBearerToken,
  getNonAdminBearerToken,
  getTestBearerToken,
  assertBackendHealthy,
} from './fixtures/auth';
import { privateKeyToAccount } from 'viem/accounts';

const FOUNDER_PRIVATE_KEY =
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;
const founderAccount = privateKeyToAccount(FOUNDER_PRIVATE_KEY);
const FOUNDER_ADDRESS = founderAccount.address;

// ═══════════════════════════════════════════════════════════════
// PERSONA 1: GENESIS FOUNDER — Full Walkthrough
// ═══════════════════════════════════════════════════════════════

test.describe('PERSONA 1: Genesis Founder', () => {
  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);
  });

  // ─── Phase A — Public Landing (No Wallet) ──────────────────

  test.describe('Phase A — Public Landing', () => {
    test('A1-A4: Landing page renders hero, tiers, how-it-works, nav, footer', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // A1: Hero content
      await expect(page.locator('h1').first()).toBeVisible();

      // A3: Header with nav + Connect Wallet
      await expect(page.locator('header')).toBeVisible();
      const connectBtn = page.getByText(/connect/i).first();
      await expect(connectBtn).toBeVisible();

      // A4: Footer
      await expect(page.locator('footer')).toBeVisible();
    });

    test('A5: "Start Genesis Sprint" navigates to /sprint', async ({
      page,
    }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const sprintLink = page.getByText(/start genesis sprint/i).first();
      if (await sprintLink.isVisible()) {
        await sprintLink.click();
        await page.waitForURL('**/sprint**');
        expect(page.url()).toContain('/sprint');
      }
    });

    test('A6: "View Presale" navigates to /presale', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const presaleLink = page.getByText(/view presale/i).first();
      if (await presaleLink.isVisible()) {
        await presaleLink.click();
        await page.waitForURL('**/presale**');
        expect(page.url()).toContain('/presale');
      }
    });
  });

  // ─── Phase B — Network Guard (No Wallet) ──────────────────

  test.describe('Phase B — Network Guard', () => {
    test('B1: /sprint without wallet shows connect prompt', async ({
      page,
    }) => {
      await page.goto('/sprint');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet/);
    });

    test('B2: /presale without wallet shows connect prompt', async ({
      page,
    }) => {
      await page.goto('/presale');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet/);
    });

    test('B3: /dashboard without wallet shows connect prompt', async ({
      page,
    }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet/);
    });

    test('B4: /admin without wallet shows connect prompt', async ({
      page,
    }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(/connect|wallet|admin/);
    });
  });

  // ─── Phase D — Genesis Sprint (API-level) ─────────────────

  test.describe('Phase D — Genesis Sprint (API)', () => {
    test.describe.configure({ mode: 'serial' });

    let founderToken: string;

    test('D-setup: Authenticate founder via SIWE', async ({ request }) => {
      founderToken = await getTestBearerToken(request, founderAccount);
      expect(founderToken).toMatch(/^[0-9a-f]{64}$/);
    });

    test('D-setup: Create founder record via KYC initiate', async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE}/kyc/initiate`, {
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      expect(res.status()).toBeLessThan(500);
    });

    test('D2: Sprint status shows initial state (0 sessions)', async ({
      request,
    }) => {
      const res = await request.get(
        `${API_BASE}/sprint/status?wallet=${FOUNDER_ADDRESS}`,
      );

      if (res.ok()) {
        const body = await res.json();
        expect(body.data.sessionsCompleted).toBeGreaterThanOrEqual(0);
        expect(body.data).toHaveProperty('distinctDays');
        expect(body.data).toHaveProperty('isComplete');
        expect(body.data).toHaveProperty('canDoSessionToday');
      }
    });

    test('D6-D10: Complete sprint session (Day 1)', async ({ request }) => {
      const res = await request.post(`${API_BASE}/sprint/complete`, {
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      // 200/201 success or 409 if already done today
      expect([200, 201, 409]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
    });

    test('D12/D20: Duplicate session same day returns 409', async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE}/sprint/complete`, {
        headers: { Authorization: `Bearer ${founderToken}` },
      });
      // Should be 409 since we just completed one
      expect([409]).toContain(res.status());
    });

    test('D11: Sprint status shows updated progress', async ({ request }) => {
      const res = await request.get(
        `${API_BASE}/sprint/status?wallet=${FOUNDER_ADDRESS}`,
      );

      if (res.ok()) {
        const body = await res.json();
        expect(body.data.sessionsCompleted).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── Phase E — Presale (API-level) ────────────────────────

  test.describe('Phase E — Presale Stats (API)', () => {
    test('E3: Presale stats returns pool/participant data', async ({
      request,
    }) => {
      const res = await request.get(`${API_BASE}/presale/stats`);
      expect([200, 502]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toBeTruthy();
      }
    });
  });

  // ─── Phase H — Dashboard Empty State ──────────────────────

  test.describe('Phase H — Dashboard Empty State', () => {
    test('H1: Dashboard page renders without crashing', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// PERSONA 2: ADMIN — Full Walkthrough
// ═══════════════════════════════════════════════════════════════

test.describe('PERSONA 2: Admin', () => {
  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);
  });

  // ─── Phase I — Admin Access Control (API) ──────────────────

  test.describe('Phase I — Admin Access Control', () => {
    test('I1: Non-admin wallet gets 403 on all admin endpoints', async ({
      request,
    }) => {
      const token = await getNonAdminBearerToken(request);

      const endpoints = [
        { method: 'GET' as const, path: '/admin/founders?page=1&limit=10' },
        { method: 'GET' as const, path: '/admin/metrics' },
        {
          method: 'POST' as const,
          path: '/admin/whitelist',
          data: { action: 'register_founder', targetAddress: '0x1111111111111111111111111111111111111111' },
        },
        {
          method: 'POST' as const,
          path: '/admin/tge',
          data: { action: 'tge' },
        },
      ];

      for (const ep of endpoints) {
        const res =
          ep.method === 'GET'
            ? await request.get(`${API_BASE}${ep.path}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : await request.post(`${API_BASE}${ep.path}`, {
                headers: { Authorization: `Bearer ${token}` },
                data: ep.data,
              });

        expect(
          res.status(),
          `Non-admin should get 403 on ${ep.method} ${ep.path}`,
        ).toBe(403);
      }
    });

    test('I3: Admin wallet can access all admin endpoints', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);

      const metricsRes = await request.get(`${API_BASE}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(metricsRes.ok()).toBeTruthy();

      const foundersRes = await request.get(
        `${API_BASE}/admin/founders?page=1&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(foundersRes.ok()).toBeTruthy();
    });

    test('I1-page: Admin page shows access restriction without wallet', async ({
      page,
    }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      const body = await page.textContent('body');
      expect(body?.toLowerCase()).toMatch(
        /connect|access|denied|wallet|admin|restricted/,
      );
    });
  });

  // ─── Phase J — Admin Dashboard Tab (API) ──────────────────

  test.describe('Phase J — Admin Dashboard Metrics', () => {
    test('J1-J4: Metrics endpoint returns all dashboard data', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.get(`${API_BASE}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('totalFounders');
      expect(body.data).toHaveProperty('eliteCount');
      expect(body.data).toHaveProperty('legendCount');
      expect(body.data).toHaveProperty('sprintsCompleted');
      expect(body.data).toHaveProperty('purchaseCount');
      expect(body.data).toHaveProperty('registeredOnChain');
      expect(body.data).toHaveProperty('totalUsdcRaised');
      expect(body.data).toHaveProperty('avgPurchaseSize');

      expect(typeof body.data.totalFounders).toBe('number');
      expect(typeof body.data.eliteCount).toBe('number');
    });
  });

  // ─── Phase K — Admin Founders Tab (API) ───────────────────

  test.describe('Phase K — Admin Founders Tab', () => {
    test('K1-K3: Founders list returns paginated data with correct shape', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.get(
        `${API_BASE}/admin/founders?page=1&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('data');
      expect(body.data).toHaveProperty('meta');
      expect(body.data.meta).toHaveProperty('total');
      expect(body.data.meta).toHaveProperty('page');
      expect(body.data.meta).toHaveProperty('limit');
      expect(body.data.meta).toHaveProperty('totalPages');
      expect(Array.isArray(body.data.data)).toBe(true);

      if (body.data.data.length > 0) {
        const founder = body.data.data[0];
        expect(founder).toHaveProperty('walletAddress');
        expect(founder).toHaveProperty('tier');
        expect(founder).toHaveProperty('kycStatus');
        expect(founder).toHaveProperty('sprintCompleted');
        expect(founder).toHaveProperty('registeredOnChain');
      }
    });

    test('K10-K14: Pagination works correctly', async ({ request }) => {
      const token = await getAdminBearerToken(request);

      // Page 1 with limit 1
      const page1Res = await request.get(
        `${API_BASE}/admin/founders?page=1&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(page1Res.ok()).toBeTruthy();
      const page1Body = await page1Res.json();
      expect(page1Body.data.meta.page).toBe(1);
      expect(page1Body.data.data.length).toBeLessThanOrEqual(1);

      // Page 2
      const page2Res = await request.get(
        `${API_BASE}/admin/founders?page=2&limit=1`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(page2Res.ok()).toBeTruthy();
      const page2Body = await page2Res.json();
      expect(page2Body.data.meta.page).toBe(2);

      // Different data on different pages (if enough records)
      if (page1Body.data.meta.total > 1) {
        const page1Wallet = page1Body.data.data[0]?.walletAddress;
        const page2Wallet = page2Body.data.data[0]?.walletAddress;
        expect(page1Wallet).not.toBe(page2Wallet);
      }
    });

    test('K15-K20: Register founder on-chain (admin whitelist action)', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          action: 'register_founder',
          targetAddress: FOUNDER_ADDRESS,
        },
      });
      expect([200, 201]).toContain(res.status());

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
    });

    test('K21-K24: Mark sprint complete on-chain (admin whitelist action)', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          action: 'mark_sprint',
          targetAddress: FOUNDER_ADDRESS,
        },
      });
      expect([200, 201]).toContain(res.status());

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
    });
  });

  // ─── Phase L — Admin Controls Tab (API) ───────────────────

  test.describe('Phase L — Admin Controls (TGE audit)', () => {
    test('L9/L13: Admin TGE action creates audit trail', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/admin/tge`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { action: 'tge' },
      });
      expect([200, 201]).toContain(res.status());

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// CROSS-PERSONA FLOW — Steps 1-12 (API-level)
// ═══════════════════════════════════════════════════════════════

test.describe('CROSS-PERSONA FLOW — Full Lifecycle', () => {
  test.describe.configure({ mode: 'serial' });

  let adminToken: string;
  let founderToken: string;

  // Use a fresh wallet for this flow to avoid collisions
  const crossFlowKey =
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a' as const;
  const crossFlowAccount = privateKeyToAccount(crossFlowKey);

  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);

    if (!API_BASE.includes('localhost')) {
      throw new Error(
        `Refusing to run destructive tests against non-local backend: ${API_BASE}`,
      );
    }
  });

  test('Step 0: Authenticate both personas', async ({ request }) => {
    adminToken = await getAdminBearerToken(request);
    founderToken = await getTestBearerToken(request, crossFlowAccount);
    expect(adminToken).toMatch(/^[0-9a-f]{64}$/);
    expect(founderToken).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Step 0.5: Create founder record via KYC', async ({ request }) => {
    const res = await request.post(`${API_BASE}/kyc/initiate`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    expect(res.status()).toBeLessThan(500);
  });

  test('Step 1: Admin registers founder on-chain', async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/whitelist`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        action: 'register_founder',
        targetAddress: crossFlowAccount.address,
      },
    });
    expect([200, 201]).toContain(res.status());

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('Step 2: Founder completes sprint Day 1', async ({ request }) => {
    const res = await request.post(`${API_BASE}/sprint/complete`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    expect([200, 201, 409]).toContain(res.status());
  });

  test('Step 2b: Sprint status reflects completed session', async ({
    request,
  }) => {
    const res = await request.get(
      `${API_BASE}/sprint/status?wallet=${crossFlowAccount.address}`,
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.data.sessionsCompleted).toBeGreaterThanOrEqual(1);
  });

  test('Step 5: Admin marks sprint complete on-chain', async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/whitelist`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: {
        action: 'mark_sprint',
        targetAddress: crossFlowAccount.address,
      },
    });
    expect([200, 201]).toContain(res.status());
  });

  test('Step 7: Presale stats accessible during flow', async ({ request }) => {
    const res = await request.get(`${API_BASE}/presale/stats`);
    expect([200, 502]).toContain(res.status());
  });

  test('Step 9: Admin triggers TGE audit action', async ({ request }) => {
    const res = await request.post(`${API_BASE}/admin/tge`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { action: 'tge' },
    });
    expect([200, 201]).toContain(res.status());

    const body = await res.json();
    expect(body.success).toBe(true);
  });

  test('Step 12: Admin monitors metrics — shows updated counts', async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/admin/metrics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.data.totalFounders).toBeGreaterThanOrEqual(1);
  });

  test('Final: Founder KYC status is queryable', async ({ request }) => {
    const res = await request.get(`${API_BASE}/kyc/status`, {
      headers: { Authorization: `Bearer ${founderToken}` },
    });
    expect([200, 404]).toContain(res.status());
  });

  test('Final: Founder visible in admin founders list', async ({
    request,
  }) => {
    const res = await request.get(
      `${API_BASE}/admin/founders?page=1&limit=100`,
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const wallets = body.data.data.map(
      (f: { walletAddress: string }) => f.walletAddress.toLowerCase(),
    );
    expect(wallets).toContain(crossFlowAccount.address.toLowerCase());
  });
});

// ═══════════════════════════════════════════════════════════════
// ERROR SCENARIOS (from walkthrough doc)
// ═══════════════════════════════════════════════════════════════

test.describe('ERROR SCENARIOS', () => {
  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);
  });

  test('E11: Non-admin hits admin API returns 403', async ({ request }) => {
    const token = await getNonAdminBearerToken(request);

    const res = await request.get(`${API_BASE}/admin/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);

    const body = await res.json();
    expect(body.success).toBe(false);
  });

  test('E12: Unauthenticated request to protected endpoint returns 401', async ({
    request,
  }) => {
    const endpoints = [
      '/kyc/initiate',
      '/kyc/status',
      '/sprint/complete',
      '/admin/founders?page=1&limit=10',
      '/admin/metrics',
    ];

    for (const path of endpoints) {
      const res = path.includes('initiate') || path.includes('complete')
        ? await request.post(`${API_BASE}${path}`)
        : await request.get(`${API_BASE}${path}`);

      expect(
        res.status(),
        `${path} should require auth`,
      ).toBe(401);
    }
  });

  test('E-sprint: Sprint duplicate same day returns 409', async ({
    request,
  }) => {
    const token = await getAdminBearerToken(request);

    // First attempt
    await request.post(`${API_BASE}/sprint/complete`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Second attempt same day
    const res = await request.post(`${API_BASE}/sprint/complete`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 409 if first succeeded, or still 404 if admin has no founder record
    expect([404, 409]).toContain(res.status());
  });

  test('E-validation: Sprint status missing wallet returns 400', async ({
    request,
  }) => {
    const res = await request.get(`${API_BASE}/sprint/status`);
    expect([400, 422]).toContain(res.status());
  });

  test('E-presale: Presale events rejects malformed data', async ({
    request,
  }) => {
    const res = await request.post(`${API_BASE}/presale/events`, {
      data: { invalid: true },
    });
    expect([400, 422]).toContain(res.status());
  });
});
