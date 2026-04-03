'use client';

import { useMemo } from 'react';
import { useAccount } from 'wagmi';

/**
 * Checks if the connected wallet is in the ADMIN_WALLETS environment variable.
 * The admin wallet list is exposed via NEXT_PUBLIC_ prefix for client-side checks.
 *
 * NOTE: This is a UI gate only. All admin actions are validated server-side.
 */
export function useIsAdmin(): {
  isAdmin: boolean;
  isLoading: boolean;
} {
  const { address, isConnected } = useAccount();

  const isAdmin = useMemo(() => {
    if (!isConnected || !address) return false;

    const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS ?? '';
    const wallets = adminWallets
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean);

    return wallets.includes(address.toLowerCase());
  }, [address, isConnected]);

  return {
    isAdmin,
    isLoading: false,
  };
}
