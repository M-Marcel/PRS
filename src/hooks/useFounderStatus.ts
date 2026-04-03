'use client';

import { useAccount, useChainId } from 'wagmi';
import { useFounderContractData, usePresaleFlag } from './usePresaleContract';
import { FounderTier, PRESALE } from '@/lib/constants';
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
 * The whitelist is entirely on-chain — founderTier(address) is the source of truth.
 * No API calls or database lookups for identity.
 */
export function useFounderStatus(): FounderStatus {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const isCorrectChain = chainId === TARGET_CHAIN_ID;

  const {
    tier,
    sprintCompleted,
    tokensPurchased,
    spendCapRemaining,
    lockedBalance,
    claimableBalance,
    isLoading: isContractLoading,
  } = useFounderContractData(address);

  const { data: presaleOpen, isLoading: isPresaleLoading } = usePresaleFlag('presaleOpen');

  const isElite = tier === FounderTier.ELITE;
  const isLegend = tier === FounderTier.LEGEND;
  const isWhitelisted = tier > FounderTier.NONE;

  return {
    isConnected,
    isCorrectChain,
    tier,
    tierName: TIER_NAMES[tier] ?? 'Unknown',
    isWhitelisted,
    isElite,
    isLegend,
    tierPrice: isElite ? PRESALE.ELITE_PRICE : PRESALE.LEGEND_PRICE,
    sprintCompleted,
    hasPurchased: tokensPurchased > 0n,
    canPurchase: isWhitelisted && sprintCompleted && (presaleOpen ?? false) && spendCapRemaining > 0n,
    tokensPurchased,
    spendCapRemaining,
    lockedBalance,
    claimableBalance,
    isLoading: isContractLoading || isPresaleLoading,
  };
}
