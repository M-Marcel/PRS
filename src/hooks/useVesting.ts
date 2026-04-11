'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { parseAbi } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { usePresaleFlag } from './usePresaleContract';
import type { VestingData } from '@/types';

const presaleAbi = parseAbi(PRESALE_ABI);

/**
 * Composite read hook for the vesting dashboard.
 *
 * Reads: getPurchase(address), getClaimable(address), getLockedBalance(address),
 * tgeTriggered, tgeTimestamp.
 *
 * All derived state (tgeAmount, percentVested, canClaim, etc.) is computed here.
 */
export function useVesting(): VestingData {
  const { address } = useAccount();
  const { data: tgeTriggered } = usePresaleFlag('tgeTriggered');
  const presaleAddress = getAddresses().presale;

  const enabled = Boolean(address);

  const { data, isLoading: isVestingLoading, error: vestingError } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getPurchase',
        args: address ? [address] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getClaimable',
        args: address ? [address] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getLockedBalance',
        args: address ? [address] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'tgeTimestamp',
      },
    ],
    query: { enabled },
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  // getPurchase returns (totalTokens, totalSpentUsdc, claimed)
  const purchaseResult = allSuccess
    ? (data![0].result as readonly [bigint, bigint, bigint])
    : undefined;
  const totalPurchased = purchaseResult?.[0] ?? 0n;
  const totalSpentUsdc = purchaseResult?.[1] ?? 0n;
  const totalClaimed = purchaseResult?.[2] ?? 0n;

  const claimableBalance = allSuccess ? (data![1].result as bigint) : 0n;
  const lockedBalance = allSuccess ? (data![2].result as bigint) : 0n;
  const tgeTimestamp = allSuccess ? (data![3].result as bigint) : 0n;

  const isTgeTriggered = tgeTriggered ?? false;

  return useMemo(() => {
    const tgeAmount = totalPurchased > 0n ? (totalPurchased * 2500n) / 10000n : 0n;
    const linearVestTotal = totalPurchased > 0n ? totalPurchased - tgeAmount : 0n;
    const dailyVestRate = totalPurchased > 0n ? linearVestTotal / 90n : 0n;

    // Compute current day from on-chain tgeTimestamp
    const currentDay = tgeTimestamp > 0n
      ? Math.min(90, Math.max(0, Math.floor((Date.now() / 1000 - Number(tgeTimestamp)) / 86400)))
      : 0;

    // hasClaimed25: proxy — first claim always includes TGE portion
    const hasClaimed25 = totalClaimed > 0n;

    const percentVested = totalPurchased > 0n
      ? Math.min(100, Number(((totalClaimed + claimableBalance) * 10000n) / totalPurchased) / 100)
      : 0;

    const canClaim = claimableBalance > 0n;
    const isFullyVested = lockedBalance === 0n && claimableBalance === 0n && totalPurchased > 0n;

    return {
      totalPurchased,
      totalSpentUsdc,
      totalClaimed,
      lockedBalance,
      claimableBalance,
      hasClaimed25,
      tgeTriggered: isTgeTriggered,
      tgeTimestamp,
      tgeAmount,
      linearVestTotal,
      dailyVestRate,
      currentDay,
      percentVested,
      canClaim,
      isFullyVested,
      isLoading: isVestingLoading,
      error: vestingError ?? null,
    };
  }, [
    totalPurchased, totalSpentUsdc, totalClaimed, lockedBalance,
    claimableBalance, tgeTimestamp, isTgeTriggered, isVestingLoading, vestingError,
  ]);
}
