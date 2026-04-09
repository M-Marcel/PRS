'use client';

import { useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseAbi } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { getErrorMessage } from '@/lib/validation';

const presaleAbi = parseAbi(PRESALE_ABI);

interface UseClaimWriteReturn {
  readonly claimTGE: () => void;
  readonly isClaimingTGE: boolean;
  readonly isTGEConfirming: boolean;
  readonly isTGEConfirmed: boolean;
  readonly tgeHash: string | null;

  readonly claimVested: () => void;
  readonly isClaimingVested: boolean;
  readonly isVestedConfirming: boolean;
  readonly isVestedConfirmed: boolean;
  readonly vestedHash: string | null;

  readonly error: string | null;
  readonly reset: () => void;
}

/**
 * Parse claim-specific contract revert errors into user-friendly messages.
 */
function parseClaimError(error: unknown): string {
  const msg = getErrorMessage(error);
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'Transaction cancelled';
  }
  if (lower.includes('tgenotriggered') || lower.includes('tge not triggered')) {
    return 'TGE has not been triggered yet';
  }
  if (lower.includes('alreadyclaimed') || lower.includes('already claimed')) {
    return 'You have already claimed your TGE tokens';
  }
  if (lower.includes('noclaimable') || lower.includes('no claimable') || lower.includes('nothing to claim')) {
    return 'No tokens available to claim';
  }
  if (lower.includes('notokenspurchased') || lower.includes('no tokens purchased')) {
    return 'You have not purchased any tokens';
  }

  return msg;
}

/**
 * Write hook for vesting claim operations.
 *
 * Exposes two write operations:
 * 1. claimTGE() — one-shot 25% TGE claim
 * 2. claimVested() — claim available linear vest tokens
 *
 * Follows the same pattern as usePresaleWrite: dual useWriteContract +
 * useWaitForTransactionReceipt pairs with cache invalidation on confirmation.
 */
export function useClaimWrite(): UseClaimWriteReturn {
  const queryClient = useQueryClient();
  const { presale } = getAddresses();

  // --- Claim TGE ---
  const {
    writeContract: writeTGE,
    data: tgeData,
    isPending: isTGEPending,
    error: tgeError,
    reset: resetTGE,
  } = useWriteContract();

  const {
    isLoading: isTGEConfirming,
    isSuccess: isTGEConfirmed,
  } = useWaitForTransactionReceipt({
    hash: tgeData,
    query: { enabled: Boolean(tgeData) },
  });

  // --- Claim Vested ---
  const {
    writeContract: writeVested,
    data: vestedData,
    isPending: isVestedPending,
    error: vestedError,
    reset: resetVested,
  } = useWriteContract();

  const {
    isLoading: isVestedConfirming,
    isSuccess: isVestedConfirmed,
  } = useWaitForTransactionReceipt({
    hash: vestedData,
    query: { enabled: Boolean(vestedData) },
  });

  // Invalidate caches when either claim confirms
  useEffect(() => {
    if (isTGEConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isTGEConfirmed, queryClient]);

  useEffect(() => {
    if (isVestedConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isVestedConfirmed, queryClient]);

  const claimTGE = () => {
    writeTGE({
      address: presale,
      abi: presaleAbi,
      functionName: 'claimTGE',
    });
  };

  const claimVested = () => {
    writeVested({
      address: presale,
      abi: presaleAbi,
      functionName: 'claimVested',
    });
  };

  const error = useMemo(() => {
    const raw = tgeError ?? vestedError;
    if (!raw) return null;
    return parseClaimError(raw);
  }, [tgeError, vestedError]);

  const reset = () => {
    resetTGE();
    resetVested();
  };

  return {
    claimTGE,
    isClaimingTGE: isTGEPending,
    isTGEConfirming,
    isTGEConfirmed,
    tgeHash: tgeData ?? null,

    claimVested,
    isClaimingVested: isVestedPending,
    isVestedConfirming,
    isVestedConfirmed,
    vestedHash: vestedData ?? null,

    error,
    reset,
  };
}
