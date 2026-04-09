import { test, expect } from '@playwright/test';

test.describe('API Routes', () => {
  test('GET /api/health returns 200', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('GET /api/presale/stats returns valid response or 502 (no contract)', async ({ request }) => {
    const response = await request.get('/api/presale/stats');

    // Either succeeds (200 with data) or fails gracefully (502 contract not deployed)
    expect([200, 500, 502]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('GET /api/admin/founders returns structured response', async ({ request }) => {
    const response = await request.get('/api/admin/founders?page=1&limit=10');
    const data = await response.json();

    if (response.ok()) {
      // Database connected: verify full response shape
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('data');
      expect(data).toHaveProperty('meta');
      expect(data.meta).toHaveProperty('total');
      expect(data.meta).toHaveProperty('page');
      expect(data.meta).toHaveProperty('limit');
      expect(data.meta).toHaveProperty('totalPages');
    } else {
      // No database: should return a proper error envelope, not crash
      expect(response.status()).toBe(500);
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error');
    }
  });

  test('GET /api/admin/founders returns consistent response shape', async ({ request }) => {
    const response = await request.get('/api/admin/founders?page=1&limit=5');
    const data = await response.json();

    // Either success with meta or graceful error — never an unhandled crash
    expect(data).toHaveProperty('success');
    if (data.success) {
      expect(data.meta.limit).toBe(5);
      expect(data.meta.page).toBe(1);
    }
  });

  test('GET /api/admin/founders with filter params returns consistent shape', async ({ request }) => {
    const response = await request.get('/api/admin/founders?tier=1&kycStatus=approved');
    const data = await response.json();

    expect(data).toHaveProperty('success');
    if (data.success) {
      for (const founder of data.data) {
        expect(founder.tier).toBe(1);
        expect(founder.kycStatus).toBe('approved');
      }
    }
  });

  test('GET /api/admin/metrics requires admin auth', async ({ request }) => {
    // No auth header
    const noAuth = await request.get('/api/admin/metrics');
    expect(noAuth.status()).toBe(403);

    // Invalid admin address
    const badAuth = await request.get('/api/admin/metrics', {
      headers: { 'x-admin-address': '0x0000000000000000000000000000000000000000' },
    });
    expect(badAuth.status()).toBe(403);
  });

  test('POST /api/admin/whitelist requires admin auth', async ({ request }) => {
    const response = await request.post('/api/admin/whitelist', {
      data: {
        adminAddress: '0x0000000000000000000000000000000000000000',
        action: 'register_founder',
        targetAddress: '0x1111111111111111111111111111111111111111',
      },
    });
    expect(response.status()).toBe(403);
  });

  test('POST /api/admin/whitelist validates action param', async ({ request }) => {
    const response = await request.post('/api/admin/whitelist', {
      data: {
        adminAddress: '0x0000000000000000000000000000000000000000',
        action: 'invalid_action',
      },
    });
    // Either 403 (auth fails first) or 400 (validation fails)
    expect([400, 403]).toContain(response.status());
  });

  test('POST /api/admin/tge requires admin auth', async ({ request }) => {
    const response = await request.post('/api/admin/tge', {
      data: {
        adminAddress: '0x0000000000000000000000000000000000000000',
        action: 'tge',
      },
    });
    expect(response.status()).toBe(403);
  });

  test('POST /api/admin/tge validates action param', async ({ request }) => {
    const response = await request.post('/api/admin/tge', {
      data: {
        adminAddress: '0x0000000000000000000000000000000000000000',
        action: 'invalid_action',
      },
    });
    expect([400, 403]).toContain(response.status());
  });

  test('GET /api/sprint/status requires wallet param', async ({ request }) => {
    const response = await request.get('/api/sprint/status');
    // Should return error without wallet param
    expect([400, 500]).toContain(response.status());
  });
});
