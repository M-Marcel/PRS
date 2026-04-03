'use client';

import { useReadContract } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { USDC_ABI } from '@/lib/abis/USDC';
import { getAddresses } from '@/lib/contracts';

const usdcAbi = parseAbi(USDC_ABI);

/**
 * Read the USDC balance for a given wallet address.
 */
export function useUSDCBalance(walletAddress: Address | undefined): {
  balance: bigint;
  isLoading: boolean;
  refetch: () => void;
} {
  const { usdc } = getAddresses();

  const { data, isLoading, refetch } = useReadContract({
    address: usdc,
    abi: usdcAbi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: { enabled: Boolean(walletAddress) },
  });

  return {
    balance: (data as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
  };
}

/**
 * Read the USDC allowance the wallet has granted to the presale contract.
 */
export function useUSDCAllowance(walletAddress: Address | undefined): {
  allowance: bigint;
  isLoading: boolean;
  refetch: () => void;
} {
  const { usdc, presale } = getAddresses();

  const { data, isLoading, refetch } = useReadContract({
    address: usdc,
    abi: usdcAbi,
    functionName: 'allowance',
    args: walletAddress ? [walletAddress, presale] : undefined,
    query: { enabled: Boolean(walletAddress) },
  });

  return {
    allowance: (data as bigint | undefined) ?? 0n,
    isLoading,
    refetch,
  };
}
