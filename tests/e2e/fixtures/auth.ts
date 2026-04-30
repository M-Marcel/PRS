import { type APIRequestContext } from '@playwright/test';
import { createWalletClient, http, type WalletClient } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Hardhat default accounts — deterministic, well-known test keys
export const ADMIN_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const;
export const NON_ADMIN_PRIVATE_KEY =
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d' as const;

export const adminAccount: PrivateKeyAccount =
  privateKeyToAccount(ADMIN_PRIVATE_KEY);
export const nonAdminAccount: PrivateKeyAccount =
  privateKeyToAccount(NON_ADMIN_PRIVATE_KEY);

export const ADMIN_ADDRESS = adminAccount.address;
export const NON_ADMIN_ADDRESS = nonAdminAccount.address;

function createSigner(account: PrivateKeyAccount): WalletClient {
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  });
}

export async function assertBackendHealthy(
  request: APIRequestContext,
): Promise<void> {
  const health = await request.get(`${API_BASE}/health`);
  if (!health.ok()) {
    throw new Error(
      'actx-cloud backend is not running on localhost:3001. Start it first.',
    );
  }
}

export async function getTestBearerToken(
  request: APIRequestContext,
  account: PrivateKeyAccount,
): Promise<string> {
  const challengeRes = await request.post(`${API_BASE}/auth/challenge`, {
    data: { address: account.address },
  });

  if (!challengeRes.ok()) {
    throw new Error(
      `Challenge failed: ${challengeRes.status()} ${await challengeRes.text()}`,
    );
  }

  const challengeBody = await challengeRes.json();
  const message: string | undefined = challengeBody?.data?.message;
  if (!message) {
    throw new Error(
      `Challenge response missing message field. Got: ${JSON.stringify(challengeBody)}`,
    );
  }

  const signer = createSigner(account);
  const signature = await signer.signMessage({
    account,
    message,
  });

  const verifyRes = await request.post(`${API_BASE}/auth/verify`, {
    data: { message, signature },
  });

  if (!verifyRes.ok()) {
    throw new Error(
      `Verify failed: ${verifyRes.status()} ${await verifyRes.text()}`,
    );
  }

  const verifyBody = await verifyRes.json();
  const token: string | undefined = verifyBody?.data?.token;
  if (!token) {
    throw new Error(
      `Verify response missing token field. Got: ${JSON.stringify(verifyBody)}`,
    );
  }

  return token;
}

export async function getAdminBearerToken(
  request: APIRequestContext,
): Promise<string> {
  return getTestBearerToken(request, adminAccount);
}

export async function getNonAdminBearerToken(
  request: APIRequestContext,
): Promise<string> {
  return getTestBearerToken(request, nonAdminAccount);
}
