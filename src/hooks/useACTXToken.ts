'use client';

import { useReadContract } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { ACTX_TOKEN_ABI } from '@/lib/abis/ACTXToken';
import { getAddresses } from '@/lib/contracts';

const tokenAbi = parseAbi(ACTX_TOKEN_ABI);

/**
 * Read the ACTX token balance for a given wallet address.
 */
export function useACTXBalance(walletAddress: Address | undefined): {
  balance: bigint;
  isLoading: boolean;
  refetch: () => void;
} {
  const { actxToken } = getAddresses();

  const { data, isLoading, refetch } = useReadContract({
    address: actxToken,
    abi: tokenAbi,
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
 * Read the total supply of ACTX tokens.
 */
export function useACTXTotalSupply(): {
  totalSupply: bigint;
  isLoading: boolean;
} {
  const { actxToken } = getAddresses();

  const { data, isLoading } = useReadContract({
    address: actxToken,
    abi: tokenAbi,
    functionName: 'totalSupply',
  });

  return {
    totalSupply: (data as bigint | undefined) ?? 0n,
    isLoading,
  };
}
