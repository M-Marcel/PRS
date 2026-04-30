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

test.describe('actx-cloud API wiring — comprehensive', () => {
  test.beforeAll(async ({ request }) => {
    await assertBackendHealthy(request);

    if (!API_BASE.includes('localhost')) {
      throw new Error(
        `Refusing to run destructive tests against non-local backend: ${API_BASE}`,
      );
    }
  });

  // ─── Auth Flow ──────────────────────────────────────────────

  test.describe('Auth Flow', () => {
    test('POST /auth/challenge returns SIWE message with nonce', async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE}/auth/challenge`, {
        data: { address: ADMIN_ADDRESS },
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('Sign in to ACTX Cloud');
      expect(body.data.message).toContain(ADMIN_ADDRESS);
      expect(body.data.nonce).toBeTruthy();
    });

    test('POST /auth/verify with valid signature returns session token', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    test('POST /auth/verify with invalid signature returns 401', async ({
      request,
    }) => {
      const challengeRes = await request.post(`${API_BASE}/auth/challenge`, {
        data: { address: ADMIN_ADDRESS },
      });
      const { data } = await challengeRes.json();

      const res = await request.post(`${API_BASE}/auth/verify`, {
        data: {
          message: data.message,
          signature: '0x' + 'ab'.repeat(65),
        },
      });
      expect(res.status()).toBe(401);

      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });

    test('Bearer token authenticates protected endpoints', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.get(`${API_BASE}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();
    });

    test('Missing Bearer token returns 401 on protected endpoints', async ({
      request,
    }) => {
      const res = await request.get(`${API_BASE}/admin/metrics`);
      expect(res.status()).toBe(401);
    });
  });

  // ─── KYC Endpoints ─────────────────────────────────────────

  test.describe('KYC Endpoints', () => {
    test('POST /kyc/initiate requires auth', async ({ request }) => {
      const res = await request.post(`${API_BASE}/kyc/initiate`);
      expect(res.status()).toBe(401);
    });

    test('GET /kyc/status requires auth', async ({ request }) => {
      const res = await request.get(`${API_BASE}/kyc/status`);
      expect(res.status()).toBe(401);
    });

    test('GET /kyc/status with valid token returns status or not-found', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.get(`${API_BASE}/kyc/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 404]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
    });

    test('GET /kyc/dev-approve returns status based on environment and founder state', async ({
      request,
    }) => {
      const res = await request.get(
        `${API_BASE}/kyc/dev-approve?wallet=${ADMIN_ADDRESS}`,
      );
      expect([200, 403, 404]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
    });
  });

  // ─── Sprint Endpoints ──────────────────────────────────────

  test.describe('Sprint Endpoints', () => {
    test('GET /sprint/status with wallet returns sprint data or 404', async ({
      request,
    }) => {
      const res = await request.get(
        `${API_BASE}/sprint/status?wallet=${ADMIN_ADDRESS}`,
      );
      expect([200, 404]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
      if (res.ok()) {
        expect(body.data).toHaveProperty('sessionsCompleted');
        expect(body.data).toHaveProperty('distinctDays');
        expect(body.data).toHaveProperty('isComplete');
      }
    });

    test('GET /sprint/status without wallet returns 400', async ({
      request,
    }) => {
      const res = await request.get(`${API_BASE}/sprint/status`);
      expect([400, 422]).toContain(res.status());
    });

    test('POST /sprint/complete requires auth', async ({ request }) => {
      const res = await request.post(`${API_BASE}/sprint/complete`);
      expect(res.status()).toBe(401);
    });

    test('POST /sprint/complete with token succeeds or returns founder-not-found', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/sprint/complete`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect([200, 201, 404, 409]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
    });
  });

  // ─── Presale Endpoints ─────────────────────────────────────

  test.describe('Presale Endpoints', () => {
    test('GET /presale/stats returns cached stats (public)', async ({
      request,
    }) => {
      const res = await request.get(`${API_BASE}/presale/stats`);
      expect([200, 502]).toContain(res.status());

      const body = await res.json();
      expect(body).toHaveProperty('success');
      if (res.ok()) {
        expect(body.data).toBeTruthy();
      }
    });

    test('POST /presale/events accepts valid DTO shape (rejects unverifiable txHash)', async ({
      request,
    }) => {
      const fakeTxHash = '0x' + 'a1b2c3d4e5f6'.repeat(11).slice(0, 64);
      const res = await request.post(`${API_BASE}/presale/events`, {
        data: {
          buyer: ADMIN_ADDRESS,
          txHash: fakeTxHash,
          blockNumber: 12345678,
          tokenAmount: '1000000000000000000000',
          usdcAmount: '70000000',
          tier: 1,
        },
      });
      // DTO validation passes (correct fields), but on-chain verification fails
      // for synthetic txHash — 400 with "Transaction not found" is correct behavior
      expect([200, 201, 400]).toContain(res.status());

      const body = await res.json();
      if (res.status() === 400) {
        expect(body.error).toContain('Transaction not found');
      } else {
        expect(body.success).toBe(true);
      }
    });

    test('POST /presale/events rejects missing txHash', async ({
      request,
    }) => {
      const res = await request.post(`${API_BASE}/presale/events`, {
        data: {
          buyer: ADMIN_ADDRESS,
          blockNumber: 12345678,
          tokenAmount: '1000000000000000000000',
          tier: 1,
        },
      });
      expect([400, 422]).toContain(res.status());
    });
  });

  // ─── Admin Endpoints ───────────────────────────────────────

  test.describe('Admin Endpoints', () => {
    test('GET /admin/founders with admin token returns paginated list', async ({
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
    });

    test('GET /admin/founders with non-admin token returns 403', async ({
      request,
    }) => {
      const token = await getNonAdminBearerToken(request);
      const res = await request.get(
        `${API_BASE}/admin/founders?page=1&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(res.status()).toBe(403);
    });

    test('GET /admin/metrics with admin token returns metrics', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.get(`${API_BASE}/admin/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.ok()).toBeTruthy();

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeTruthy();
    });

    test('POST /admin/whitelist with admin token succeeds', async ({
      request,
    }) => {
      const token = await getAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          action: 'register_founder',
          targetAddress: NON_ADMIN_ADDRESS,
        },
      });
      expect([200, 201]).toContain(res.status());

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('id');
    });

    test('POST /admin/tge with admin token records audit action', async ({
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

    test('POST /admin/whitelist with non-admin token returns 403', async ({
      request,
    }) => {
      const token = await getNonAdminBearerToken(request);
      const res = await request.post(`${API_BASE}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          action: 'register_founder',
          targetAddress: '0x1111111111111111111111111111111111111111',
        },
      });
      expect(res.status()).toBe(403);
    });
  });

  // ─── Full Founder Lifecycle ────────────────────────────────

  test.describe('Founder Lifecycle (registered wallet)', () => {
    test.describe.configure({ mode: 'serial' });

    const testPrivateKey =
      '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a' as const;

    test('KYC initiate creates founder, then sprint + admin endpoints work', async ({
      request,
    }) => {
      const { privateKeyToAccount } = await import('viem/accounts');
      const testAccount = privateKeyToAccount(testPrivateKey);

      // Step 1: Authenticate the test wallet via SIWE
      const testToken = await getTestBearerToken(request, testAccount);
      expect(testToken).toMatch(/^[0-9a-f]{64}$/);

      // Step 2: KYC initiate creates the founder record (upsert)
      const kycRes = await request.post(`${API_BASE}/kyc/initiate`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      // 200/201 if Persona configured, 422 if not — but founder still upserted
      expect(kycRes.status()).toBeLessThan(500);

      // Step 3: Sprint status returns data for this wallet
      const sprintRes = await request.get(
        `${API_BASE}/sprint/status?wallet=${testAccount.address}`,
      );
      const sprintBody = await sprintRes.json();
      expect(sprintBody).toHaveProperty('success');
      if (sprintRes.ok()) {
        expect(sprintBody.data).toHaveProperty('sessionsCompleted');
        expect(sprintBody.data).toHaveProperty('isComplete');
      }

      // Step 4: KYC status returns the founder's KYC state
      const kycStatusRes = await request.get(`${API_BASE}/kyc/status`, {
        headers: { Authorization: `Bearer ${testToken}` },
      });
      expect([200, 404]).toContain(kycStatusRes.status());

      // Step 5: Admin can see this founder in the list
      const adminToken = await getAdminBearerToken(request);
      const foundersRes = await request.get(
        `${API_BASE}/admin/founders?page=1&limit=100`,
        { headers: { Authorization: `Bearer ${adminToken}` } },
      );
      expect(foundersRes.ok()).toBeTruthy();
      const foundersBody = await foundersRes.json();
      const wallets = foundersBody.data.data.map(
        (f: { walletAddress: string }) => f.walletAddress.toLowerCase(),
      );
      expect(wallets).toContain(testAccount.address.toLowerCase());

      // Step 6: Admin whitelists this founder (mark registeredOnChain)
      const whitelistRes = await request.post(`${API_BASE}/admin/whitelist`, {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          action: 'register_founder',
          targetAddress: testAccount.address,
        },
      });
      expect([200, 201]).toContain(whitelistRes.status());

      const whitelistBody = await whitelistRes.json();
      expect(whitelistBody.success).toBe(true);
    });
  });
});
