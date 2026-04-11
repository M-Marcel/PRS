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
 * Read the overall presale state via single getPresaleStats() call.
 * Returns 8 values: poolTotal, poolRemaining, totalUsdcRaised, totalParticipants,
 * presaleOpen, tgeTriggered, tgeTimestamp, version.
 * Derives: totalTokensSold, presaleClosed.
 */
export function usePresaleState(): {
  data: PresaleStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const presaleAddress = getPresaleAddress();

  const statsResult = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName: 'getPresaleStats',
  });

  const pausedResult = useReadContract({
    address: presaleAddress,
    abi: presaleAbi,
    functionName: 'paused',
  });

  const stats = statsResult.data as
    | readonly [bigint, bigint, bigint, bigint, boolean, boolean, bigint, bigint]
    | undefined;

  const presaleStats: PresaleStats | undefined = stats
    ? {
        poolTotal: stats[0],
        poolRemaining: stats[1],
        totalTokensSold: stats[0] - stats[1],
        totalUsdcRaised: stats[2],
        totalParticipants: stats[3],
        presaleOpen: stats[4],
        presaleClosed: !stats[4],
        tgeTriggered: stats[5],
        tgeTimestamp: stats[6],
        version: stats[7],
        paused: (pausedResult.data as boolean | undefined) ?? false,
      }
    : undefined;

  return {
    data: presaleStats,
    isLoading: statsResult.isLoading || pausedResult.isLoading,
    error: statsResult.error ?? pausedResult.error ?? null,
    refetch: () => {
      statsResult.refetch();
      pausedResult.refetch();
    },
  };
}

/**
 * Read founder-specific data from the presale contract.
 * Uses: getWalletTier, isQualified, getPurchase, getClaimable, getLockedBalance.
 */
export function useFounderContractData(walletAddress: Address | undefined): {
  tier: number;
  isQualified: boolean;
  tokensPurchased: bigint;
  totalSpentUsdc: bigint;
  totalClaimed: bigint;
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
        functionName: 'getWalletTier',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'isQualified',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getPurchase',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getClaimable',
        args: walletAddress ? [walletAddress] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getLockedBalance',
        args: walletAddress ? [walletAddress] : undefined,
      },
    ],
    query: { enabled },
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  // getPurchase returns (totalTokens, totalSpentUsdc, claimed)
  const purchaseResult = allSuccess
    ? (data![2].result as readonly [bigint, bigint, bigint])
    : undefined;

  return {
    tier: allSuccess ? Number(data![0].result) : 0,
    isQualified: allSuccess ? (data![1].result as boolean) : false,
    tokensPurchased: purchaseResult?.[0] ?? 0n,
    totalSpentUsdc: purchaseResult?.[1] ?? 0n,
    totalClaimed: purchaseResult?.[2] ?? 0n,
    lockedBalance: allSuccess ? (data![3].result as bigint) : 0n,
    claimableBalance: allSuccess ? (data![4].result as bigint) : 0n,
    isLoading,
    error: error ?? null,
  };
}

/**
 * Read tier pricing from the presale contract via getTierConfig().
 */
export function usePresalePricing(): {
  elitePrice: bigint;
  eliteMaxSpend: bigint;
  legendPrice: bigint;
  legendMaxSpend: bigint;
  maxTokensPerFounder: bigint;
  isLoading: boolean;
} {
  const presaleAddress = getPresaleAddress();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getTierConfig',
        args: [1], // Elite
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getTierConfig',
        args: [2], // Legend
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'maxTokensPerFounder',
      },
    ],
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  // getTierConfig returns (priceUsdc, maxSpendUsdc)
  const eliteConfig = allSuccess
    ? (data![0].result as readonly [bigint, bigint])
    : undefined;
  const legendConfig = allSuccess
    ? (data![1].result as readonly [bigint, bigint])
    : undefined;

  return {
    elitePrice: eliteConfig?.[0] ?? 0n,
    eliteMaxSpend: eliteConfig?.[1] ?? 0n,
    legendPrice: legendConfig?.[0] ?? 0n,
    legendMaxSpend: legendConfig?.[1] ?? 0n,
    maxTokensPerFounder: allSuccess ? (data![2].result as bigint) : 0n,
    isLoading,
  };
}

/**
 * Read a single presale boolean flag.
 */
export function usePresaleFlag(
  functionName: 'presaleOpen' | 'tgeTriggered',
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
