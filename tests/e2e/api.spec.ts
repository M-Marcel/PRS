import { test, expect } from '@playwright/test';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

test.describe('actx-cloud API smoke tests', () => {
  test('GET /health returns 200', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.ok()).toBeTruthy();
  });

  test('GET /presale/stats returns valid response or 502 (no contract)', async ({ request }) => {
    const response = await request.get(`${API_BASE}/presale/stats`);
    expect([200, 502]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty('success');
  });

  test('GET /admin/founders requires Bearer auth', async ({ request }) => {
    const response = await request.get(`${API_BASE}/admin/founders?page=1&limit=10`);
    expect(response.status()).toBe(401);
  });

  test('GET /admin/metrics requires Bearer auth', async ({ request }) => {
    const response = await request.get(`${API_BASE}/admin/metrics`);
    expect(response.status()).toBe(401);
  });

  test('POST /admin/whitelist requires Bearer auth', async ({ request }) => {
    const response = await request.post(`${API_BASE}/admin/whitelist`, {
      data: {
        action: 'register_founder',
        targetAddress: '0x1111111111111111111111111111111111111111',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /admin/tge requires Bearer auth', async ({ request }) => {
    const response = await request.post(`${API_BASE}/admin/tge`, {
      data: { action: 'tge' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /sprint/status requires wallet param', async ({ request }) => {
    const response = await request.get(`${API_BASE}/sprint/status`);
    expect([400, 422]).toContain(response.status());
  });
});
