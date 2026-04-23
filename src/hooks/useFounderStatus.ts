'use client';

import { useAccount } from 'wagmi';
import { useFounderContractData, usePresaleFlag, usePresalePricing } from './usePresaleContract';
import { FounderTier } from '@/lib/constants';
import { TARGET_CHAIN_ID } from '@/lib/chains';
import type { FounderStatus } from '@/types';

const TIER_NAMES: Record<number, string> = {
  [FounderTier.NONE]: 'None',
  [FounderTier.ELITE]: 'Elite',
  [FounderTier.LEGEND]: 'Legend',
};

/**
 * Core hook that every protected page depends on.
 * Reads all relevant on-chain state for the connected wallet.
 *
 * The whitelist is entirely on-chain — getWalletTier(address) is the source of truth.
 * Qualification gate uses isQualified(address) (replaces hasCompletedSprint).
 */
export function useFounderStatus(): FounderStatus {
  const { address, isConnected, chainId } = useAccount();
  const isCorrectChain = chainId === TARGET_CHAIN_ID;

  const {
    tier,
    isQualified,
    tokensPurchased,
    totalSpentUsdc,
    lockedBalance,
    claimableBalance,
    isLoading: isContractLoading,
  } = useFounderContractData(address);

  const { data: presaleOpen, isLoading: isPresaleLoading } = usePresaleFlag('presaleOpen');
  const { elitePrice, legendPrice, eliteMaxSpend, legendMaxSpend, maxTokensPerFounder, isLoading: isPricingLoading } = usePresalePricing();

  const isElite = tier === FounderTier.ELITE;
  const isLegend = tier === FounderTier.LEGEND;
  const isWhitelisted = tier > FounderTier.NONE;

  const tierPrice = isElite ? elitePrice : legendPrice;
  const maxSpendUsdc = isElite ? eliteMaxSpend : legendMaxSpend;
  const usdcCapRemaining = maxSpendUsdc > totalSpentUsdc ? maxSpendUsdc - totalSpentUsdc : 0n;
  const tokenCapRemaining = maxTokensPerFounder > tokensPurchased ? maxTokensPerFounder - tokensPurchased : 0n;

  return {
    isConnected,
    isCorrectChain,
    tier,
    tierName: TIER_NAMES[tier] ?? 'Unknown',
    isWhitelisted,
    isElite,
    isLegend,
    tierPrice,
    maxSpendUsdc,
    isQualified,
    hasPurchased: tokensPurchased > 0n,
    canPurchase: isWhitelisted && isQualified && (presaleOpen ?? false) && usdcCapRemaining > 0n && tokenCapRemaining > 0n,
    tokensPurchased,
    totalSpentUsdc,
    usdcCapRemaining,
    tokenCapRemaining,
    lockedBalance,
    claimableBalance,
    isLoading: isContractLoading || isPresaleLoading || isPricingLoading,
  };
}
