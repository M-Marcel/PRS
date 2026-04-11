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
  readonly claimTokens: () => void;
  readonly isClaiming: boolean;
  readonly isConfirming: boolean;
  readonly isConfirmed: boolean;
  readonly claimHash: string | null;
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
  if (lower.includes('tgenottriggered')) {
    return 'Token Generation Event has not been triggered yet';
  }
  if (lower.includes('nothingtoclaim')) {
    return 'No tokens available to claim yet';
  }
  if (lower.includes('notqualified')) {
    return 'Your wallet is not qualified';
  }

  return msg;
}

/**
 * Write hook for unified vesting claim.
 *
 * The contract has a single claim() function that handles both TGE (25%)
 * and linear vesting claims. No separate claimTGE/claimVested.
 */
export function useClaimWrite(): UseClaimWriteReturn {
  const queryClient = useQueryClient();
  const { presale } = getAddresses();

  const {
    writeContract: writeClaim,
    data: claimData,
    isPending: isClaimPending,
    error: claimError,
    reset: resetClaim,
  } = useWriteContract();

  const {
    isLoading: isClaimConfirming,
    isSuccess: isClaimConfirmed,
  } = useWaitForTransactionReceipt({
    hash: claimData,
    query: { enabled: Boolean(claimData) },
  });

  // Invalidate caches when claim confirms
  useEffect(() => {
    if (isClaimConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isClaimConfirmed, queryClient]);

  const claimTokens = () => {
    writeClaim({
      address: presale,
      abi: presaleAbi,
      functionName: 'claim',
    });
  };

  const error = useMemo(() => {
    if (!claimError) return null;
    return parseClaimError(claimError);
  }, [claimError]);

  return {
    claimTokens,
    isClaiming: isClaimPending,
    isConfirming: isClaimConfirming,
    isConfirmed: isClaimConfirmed,
    claimHash: claimData ?? null,
    error,
    reset: resetClaim,
  };
}
