'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import type { PresaleStats } from '@/types';

const presaleAbi = parseAbi(PRESALE_ABI);

function getPresaleAddress(): Address {
  return getAddresses().presale;
}

/**
 * Read the overall presale state in a single multicall.
 * Returns presale open/closed/tge status and token counters.
 */
export function usePresaleState(): {
  data: PresaleStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const presaleAddress = getPresaleAddress();

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'presaleOpen',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'presaleClosed',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'tgeTriggered',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'totalTokensSold',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'totalTokensAvailable',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'remainingTokens',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'paused',
      },
    ],
  });

  const presaleStats: PresaleStats | undefined = data?.every((r) => r.status === 'success')
    ? {
        presaleOpen: data[0].result as boolean,
        presaleClosed: data[1].result as boolean,
        tgeTriggered: data[2].result as boolean,
        totalTokensSold: data[3].result as bigint,
        totalTokensAvailable: data[4].result as bigint,
        remainingTokens: data[5].result as bigint,
        paused: data[6].result as boolean,
      }
    : undefined;

  return {
    data: presaleStats,
    isLoading,
    error: error ?? null,
    refetch,
  };
}

/**
 * Read founder-specific data from the presale contract.
 * Includes tier, sprint status, purchase data, and vesting balances.
 */
export function useFounderContractData(walletAddress: Address | undefined): {
  tier: number;
  sprintCompleted: boolean;
  tokensPurchased: bigint;
  spendCapRemaining: bigint;
  lockedBalance: bigint;
  claimableBalance: bigint;
  isLoading: boolean;
  error: Error | null;
} {
  const presaleAddress = getPresaleAddress();
  const enabled = Boolean(walletAddress);

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'founderTier',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'hasCompletedSprint',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'tokensPurchased',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'spendCapRemaining',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getLockedBalance',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getClaimableBalance',
        args: walletAddress ? [walletAddress] : undefined,
      },
    ],
    query: { enabled },
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  return {
    tier: allSuccess ? Number(data![0].result) : 0,
    sprintCompleted: allSuccess ? (data![1].result as boolean) : false,
    tokensPurchased: allSuccess ? (data![2].result as bigint) : 0n,
    spendCapRemaining: allSuccess ? (data![3].result as bigint) : 0n,
    lockedBalance: allSuccess ? (data![4].result as bigint) : 0n,
    claimableBalance: allSuccess ? (data![5].result as bigint) : 0n,
    isLoading,
    error: error ?? null,
  };
}

/**
 * Read tier pricing from the presale contract.
 */
export function usePresalePricing(): {
  elitePrice: bigint;
  legendPrice: bigint;
  perWalletCap: bigint;
  isLoading: boolean;
} {
  const presaleAddress = getPresaleAddress();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'elitePrice',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'legendPrice',
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'perWalletCap',
      },
    ],
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  return {
    elitePrice: allSuccess ? (data![0].result as bigint) : 0n,
    legendPrice: allSuccess ? (data![1].result as bigint) : 0n,
    perWalletCap: allSuccess ? (data![2].result as bigint) : 0n,
    isLoading,
  };
}

/**
 * Read a single presale boolean flag.
 */
export function usePresaleFlag(
  functionName: 'presaleOpen' | 'presaleClosed' | 'tgeTriggered',
): { data: boolean | undefined; isLoading: boolean } {
  const presaleAddress = getPresaleAddress();

  const { data, isLoading } = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName,
  });

  return {
    data: data as boolean | undefined,
    isLoading,
  };
}
