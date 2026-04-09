'use client';

import { useMemo } from 'react';
import { useAccount, useReadContracts } from 'wagmi';
import { parseAbi } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { useFounderStatus } from './useFounderStatus';
import { usePresaleFlag } from './usePresaleContract';
import { daysSinceTGE } from '@/lib/formatting';
import type { VestingData } from '@/types';

const presaleAbi = parseAbi(PRESALE_ABI);

/**
 * Composite read hook for the vesting dashboard.
 *
 * Reads vesting-specific fields via multicall (getTotalPurchased, getVestedBalance,
 * hasClaimed25) and combines with existing data from useFounderStatus (lockedBalance,
 * claimableBalance) and usePresaleFlag (tgeTriggered).
 *
 * All derived state (tgeAmount, percentVested, canClaim flags, etc.) is computed here.
 */
export function useVesting(): VestingData {
  const { address } = useAccount();
  const founder = useFounderStatus();
  const { data: tgeTriggered } = usePresaleFlag('tgeTriggered');
  const presaleAddress = getAddresses().presale;

  const enabled = Boolean(address);

  const { data, isLoading: isVestingLoading, error: vestingError } = useReadContracts({
    contracts: [
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getTotalPurchased',
        args: address ? [address] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'getVestedBalance',
        args: address ? [address] : undefined,
      },
      {
        address: presaleAddress,
        abi: presaleAbi,
        functionName: 'hasClaimed25',
        args: address ? [address] : undefined,
      },
    ],
    query: { enabled },
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;
  const totalPurchased = allSuccess ? (data![0].result as bigint) : 0n;
  const vestedBalance = allSuccess ? (data![1].result as bigint) : 0n;
  const hasClaimed25 = allSuccess ? (data![2].result as boolean) : false;

  const { lockedBalance, claimableBalance } = founder;
  const isTgeTriggered = tgeTriggered ?? false;

  return useMemo(() => {
    const tgeAmount = totalPurchased > 0n ? (totalPurchased * 25n) / 100n : 0n;
    const linearVestTotal = totalPurchased > 0n ? (totalPurchased * 75n) / 100n : 0n;
    const dailyVestRate = totalPurchased > 0n ? linearVestTotal / 90n : 0n;
    const currentDay = daysSinceTGE();
    // Clamp to zero: lockedBalance + claimableBalance can momentarily exceed
    // totalPurchased when the two independent multicalls are out of sync.
    const rawClaimed = totalPurchased - lockedBalance - claimableBalance;
    const totalClaimed = totalPurchased > 0n && rawClaimed > 0n ? rawClaimed : 0n;

    const percentVested = totalPurchased > 0n
      ? Math.min(100, Number(((totalClaimed + claimableBalance) * 10000n) / totalPurchased) / 100)
      : 0;

    // Guard: only enable claims after the vesting multicall has resolved
    const canClaimTGE = !isVestingLoading && isTgeTriggered && !hasClaimed25 && totalPurchased > 0n;
    const canClaimVested = claimableBalance > 0n;
    const isFullyVested = lockedBalance === 0n && claimableBalance === 0n && totalPurchased > 0n;

    return {
      totalPurchased,
      lockedBalance,
      claimableBalance,
      vestedBalance,
      hasClaimed25,
      tgeTriggered: isTgeTriggered,
      tgeAmount,
      linearVestTotal,
      dailyVestRate,
      currentDay,
      percentVested,
      totalClaimed,
      canClaimTGE,
      canClaimVested,
      isFullyVested,
      isLoading: founder.isLoading || isVestingLoading,
      error: vestingError ?? null,
    };
  }, [
    totalPurchased, vestedBalance, hasClaimed25, lockedBalance,
    claimableBalance, isTgeTriggered, founder.isLoading, isVestingLoading, vestingError,
  ]);
}
