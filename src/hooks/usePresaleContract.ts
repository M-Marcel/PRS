'use client';

import { useReadContract, useReadContracts } from 'wagmi';
import { type Address, parseAbi } from 'viem';
import { GENESIS_PRESALE_ABI } from '@/lib/abis/GenesisPresale';
import { PRESALE_VESTING_ABI } from '@/lib/abis/PresaleVesting';
import { getAddresses } from '@/lib/contracts';
import type { PresaleStats } from '@/types';

const genesisPresaleAbi = parseAbi(GENESIS_PRESALE_ABI);
const presaleVestingAbi = parseAbi(PRESALE_VESTING_ABI);

function getGenesisPresaleAddress(): Address {
  return getAddresses().genesisPresale;
}

function getVestingAddress(): Address {
  return getAddresses().presaleVesting;
}

/**
 * Read the overall presale state via single getPresaleStats() call on GenesisPresale.
 * Returns 8 values: poolTotal, poolRemaining, totalUsdcRaised, totalParticipants,
 * presaleOpen, presaleOpenTime, scheduledOpenTime, version.
 * Derives: totalTokensSold, presaleClosed.
 */
export function usePresaleState(): {
  data: PresaleStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const genesisPresaleAddress = getGenesisPresaleAddress();

  const statsResult = useReadContract({
    address: genesisPresaleAddress,
    abi: genesisPresaleAbi,
    functionName: 'getPresaleStats',
  });

  const pausedResult = useReadContract({
    address: genesisPresaleAddress,
    abi: genesisPresaleAbi,
    functionName: 'paused',
  });

  const stats = statsResult.data as
    | readonly [bigint, bigint, bigint, bigint, boolean, bigint, bigint, bigint]
    | undefined;

  const presaleStats: PresaleStats | undefined = stats
    ? {
        poolTotal:          stats[0],
        poolRemaining:      stats[1],
        totalTokensSold:    stats[0] - stats[1],
        totalUsdcRaised:    stats[2],
        totalParticipants:  stats[3],
        presaleOpen:        stats[4],
        presaleClosed:      !stats[4],
        presaleOpenTime:    stats[5],
        scheduledOpenTime:  stats[6],
        version:            stats[7],
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
 * Read founder-specific data from GenesisPresale + PresaleVesting contracts.
 * GenesisPresale: getWalletTier, isQualified, getBuyerRecord
 * PresaleVesting: getClaimable, getLockedBalance, getVestingMultiplier, getPurchase
 */
export function useFounderContractData(walletAddress: Address | undefined): {
  tier: number;
  isQualified: boolean;
  tokensPurchased: bigint;
  totalSpentUsdc: bigint;
  totalClaimed: bigint;
  lockedBalance: bigint;
  claimableBalance: bigint;
  vestingMultiplier: bigint;
  isLoading: boolean;
  error: Error | null;
} {
  const genesisPresaleAddress = getGenesisPresaleAddress();
  const vestingAddress = getVestingAddress();
  const enabled = Boolean(walletAddress);

  const { data: presaleData, isLoading: isPresaleLoading, error: presaleError } =
    useReadContracts({
      contracts: [
        {
          address: genesisPresaleAddress,
          abi: genesisPresaleAbi,
          functionName: 'getWalletTier',
          args: walletAddress ? [walletAddress] : undefined,
        },
        {
          address: genesisPresaleAddress,
          abi: genesisPresaleAbi,
          functionName: 'isQualified',
          args: walletAddress ? [walletAddress] : undefined,
        },
        {
          address: genesisPresaleAddress,
          abi: genesisPresaleAbi,
          functionName: 'getBuyerRecord',
          args: walletAddress ? [walletAddress] : undefined,
        },
      ],
      query: { enabled },
    });

  const { data: vestingData, isLoading: isVestingLoading, error: vestingError } =
    useReadContracts({
      contracts: [
        {
          address: vestingAddress,
          abi: presaleVestingAbi,
          functionName: 'getClaimable',
          args: walletAddress ? [walletAddress] : undefined,
        },
        {
          address: vestingAddress,
          abi: presaleVestingAbi,
          functionName: 'getLockedBalance',
          args: walletAddress ? [walletAddress] : undefined,
        },
        {
          address: vestingAddress,
          abi: presaleVestingAbi,
          functionName: 'getVestingMultiplier',
          args: walletAddress ? [walletAddress] : undefined,
        },
        {
          address: vestingAddress,
          abi: presaleVestingAbi,
          functionName: 'getPurchase',
          args: walletAddress ? [walletAddress] : undefined,
        },
      ],
      query: { enabled },
    });

  const presaleAllSuccess = presaleData?.every((r) => r.status === 'success') ?? false;
  const vestingAllSuccess = vestingData?.every((r) => r.status === 'success') ?? false;

  const buyerRecord = presaleAllSuccess
    ? (presaleData![2].result as readonly [bigint, bigint])
    : undefined;

  const vestingPurchase = vestingAllSuccess
    ? (vestingData![3].result as readonly [bigint, bigint])
    : undefined;

  return {
    tier:              presaleAllSuccess ? Number(presaleData![0].result) : 0,
    isQualified:       presaleAllSuccess ? (presaleData![1].result as boolean) : false,
    tokensPurchased:   buyerRecord?.[0] ?? 0n,
    totalSpentUsdc:    buyerRecord?.[1] ?? 0n,
    totalClaimed:      vestingPurchase?.[1] ?? 0n,
    claimableBalance:  vestingAllSuccess ? (vestingData![0].result as bigint) : 0n,
    lockedBalance:     vestingAllSuccess ? (vestingData![1].result as bigint) : 0n,
    vestingMultiplier: vestingAllSuccess ? (vestingData![2].result as bigint) : 100n,
    isLoading: isPresaleLoading || isVestingLoading,
    error: presaleError ?? vestingError ?? null,
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
  const presaleAddress = getGenesisPresaleAddress();

  const { data, isLoading } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: genesisPresaleAbi,
        functionName: 'getTierConfig',
        args: [1], // Elite
      },
      {
        address: presaleAddress,
        abi: genesisPresaleAbi,
        functionName: 'getTierConfig',
        args: [2], // Legend
      },
      {
        address: presaleAddress,
        abi: genesisPresaleAbi,
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
  functionName: 'presaleOpen',
): { data: boolean | undefined; isLoading: boolean } {
  const presaleAddress = getGenesisPresaleAddress();

  const { data, isLoading } = useReadContract({
    address: presaleAddress,
    abi: genesisPresaleAbi,
    functionName,
  });

  return {
    data: data as boolean | undefined,
    isLoading,
  };
}
