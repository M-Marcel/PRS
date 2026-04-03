import { isAddress } from 'viem';

/**
 * Validate that a string is a valid Ethereum address.
 * Returns the checksummed address or null if invalid.
 */
export function validateAddress(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!isAddress(trimmed)) return null;
  return trimmed;
}

/**
 * Validate that admin wallets environment variable contains the given address.
 */
export function isAdminWallet(address: string): boolean {
  const adminWallets = process.env.ADMIN_WALLETS ?? '';
  const wallets = adminWallets
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean);
  return wallets.includes(address.toLowerCase());
}

/**
 * Extract an error message from an unknown error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
