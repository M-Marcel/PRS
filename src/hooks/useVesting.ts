'use client';

import { useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { parseAbi } from 'viem';
import { PRESALE_VESTING_ABI } from '@/lib/abis/PresaleVesting';
import { getAddresses } from '@/lib/contracts';
import { useFounderContractData } from '@/hooks/usePresaleContract';
import type { VestingData } from '@/types';

const presaleVestingAbi = parseAbi(PRESALE_VESTING_ABI);

export function useVesting(): VestingData {
  const { address } = useAccount();
  const vestingAddress = getAddresses().presaleVesting;
  const enabled = Boolean(address);

  const { totalSpentUsdc: totalSpentUsdcFromBuyerRecord } = useFounderContractData(address);

  const { data: tgeTriggeredRaw } = useReadContract({
    address: vestingAddress,
    abi: presaleVestingAbi,
    functionName: 'tgeTriggered',
  });

  const { data, isLoading: isVestingLoading, error: vestingError } = useReadContracts({
    contracts: [
      {
        address: vestingAddress,
        abi: presaleVestingAbi,
        functionName: 'getPurchase',
        args: address ? [address] : undefined,
      },
      {
        address: vestingAddress,
        abi: presaleVestingAbi,
        functionName: 'getClaimable',
        args: address ? [address] : undefined,
      },
      {
        address: vestingAddress,
        abi: presaleVestingAbi,
        functionName: 'getLockedBalance',
        args: address ? [address] : undefined,
      },
      {
        address: vestingAddress,
        abi: presaleVestingAbi,
        functionName: 'tgeTimestamp',
      },
    ],
    query: { enabled },
  });

  const allSuccess = data?.every((r) => r.status === 'success') ?? false;

  const purchaseResult = allSuccess
    ? (data![0].result as readonly [bigint, bigint])
    : undefined;
  const totalPurchased = purchaseResult?.[0] ?? 0n;
  const totalClaimed   = purchaseResult?.[1] ?? 0n;
  const totalSpentUsdc = totalSpentUsdcFromBuyerRecord;

  const claimableBalance = allSuccess ? (data![1].result as bigint) : 0n;
  const lockedBalance    = allSuccess ? (data![2].result as bigint) : 0n;
  const tgeTimestamp     = allSuccess ? (data![3].result as bigint) : 0n;
  const isTgeTriggered   = (tgeTriggeredRaw as boolean | undefined) ?? false;

  return useMemo(() => {
    const tgeAmount       = totalPurchased > 0n ? (totalPurchased * 2500n) / 10000n : 0n;
    const linearVestTotal = totalPurchased > 0n ? totalPurchased - tgeAmount : 0n;
    const dailyVestRate   = totalPurchased > 0n ? linearVestTotal / 90n : 0n;

    const currentDay = tgeTimestamp > 0n
      ? Math.min(90, Math.max(0, Math.floor((Date.now() / 1000 - Number(tgeTimestamp)) / 86400)))
      : 0;

    const hasClaimed25   = totalClaimed > 0n;
    const percentVested  = totalPurchased > 0n
      ? Math.min(100, Number(((totalClaimed + claimableBalance) * 10000n) / totalPurchased) / 100)
      : 0;
    const canClaim       = claimableBalance > 0n;
    const isFullyVested  = lockedBalance === 0n && claimableBalance === 0n && totalPurchased > 0n;

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
