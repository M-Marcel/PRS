'use client';

import { useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseAbi } from 'viem';
import { USDC_ABI } from '@/lib/abis/USDC';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { getErrorMessage } from '@/lib/validation';

const usdcAbi = parseAbi(USDC_ABI);
const presaleAbi = parseAbi(PRESALE_ABI);

interface UsePresaleWriteReturn {
  readonly approveUSDC: (amount: bigint) => void;
  readonly isApproving: boolean;
  readonly isApproveConfirming: boolean;
  readonly isApproveConfirmed: boolean;
  readonly approveHash: string | null;

  readonly purchaseTokens: (tokenAmount: bigint) => void;
  readonly isPurchasing: boolean;
  readonly isPurchaseConfirming: boolean;
  readonly isPurchaseConfirmed: boolean;
  readonly purchaseHash: string | null;

  readonly error: string | null;
  readonly reset: () => void;
}

/**
 * Parse contract revert errors into user-friendly messages.
 */
function parseContractError(error: unknown): string {
  const msg = getErrorMessage(error);
  const lower = msg.toLowerCase();

  // User rejected in wallet
  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'Transaction cancelled';
  }

  // Known contract revert reasons
  if (lower.includes('presalenotopen') || lower.includes('presale not open')) {
    return 'The presale is not currently open';
  }
  if (lower.includes('insufficientallowance') || lower.includes('insufficient allowance')) {
    return 'USDC approval needed first';
  }
  if (lower.includes('exceedscap') || lower.includes('exceeds cap') || lower.includes('exceed')) {
    return 'Purchase would exceed your wallet cap';
  }
  if (lower.includes('insufficientbalance') || lower.includes('insufficient balance')) {
    return 'Not enough USDC in your wallet';
  }
  if (lower.includes('sprintnotcomplete') || lower.includes('sprint not complete')) {
    return 'Genesis Sprint must be completed first';
  }
  if (lower.includes('notregistered') || lower.includes('not registered')) {
    return 'Wallet is not registered as a founder';
  }

  // Fallback
  return msg;
}

/**
 * Write hook for the presale purchase flow.
 *
 * Exposes two write operations:
 * 1. approveUSDC(amount) — calls USDC.approve(presaleAddress, amount)
 * 2. purchaseTokens(tokenAmount) — calls presaleContract.purchase(tokenAmount)
 *
 * Each operation tracks its own pending/confirming/confirmed state.
 * On purchase confirmation, React Query caches are invalidated to refresh reads.
 */
export function usePresaleWrite(): UsePresaleWriteReturn {
  const queryClient = useQueryClient();
  const { usdc, presale } = getAddresses();

  // --- Approve USDC ---
  const {
    writeContract: writeApprove,
    data: approveData,
    isPending: isApprovePending,
    error: approveError,
    reset: resetApprove,
  } = useWriteContract();

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approveData,
    query: { enabled: Boolean(approveData) },
  });

  // --- Purchase Tokens ---
  const {
    writeContract: writePurchase,
    data: purchaseData,
    isPending: isPurchasePending,
    error: purchaseError,
    reset: resetPurchase,
  } = useWriteContract();

  const {
    isLoading: isPurchaseConfirming,
    isSuccess: isPurchaseConfirmed,
  } = useWaitForTransactionReceipt({
    hash: purchaseData,
    query: { enabled: Boolean(purchaseData) },
  });

  // Invalidate caches when purchase is confirmed
  useEffect(() => {
    if (isPurchaseConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isPurchaseConfirmed, queryClient]);

  // Also invalidate after approve confirms so allowance reads update
  useEffect(() => {
    if (isApproveConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isApproveConfirmed, queryClient]);

  const approveUSDC = (amount: bigint) => {
    writeApprove({
      address: usdc,
      abi: usdcAbi,
      functionName: 'approve',
      args: [presale, amount],
    });
  };

  const purchaseTokens = (tokenAmount: bigint) => {
    writePurchase({
      address: presale,
      abi: presaleAbi,
      functionName: 'purchase',
      args: [tokenAmount],
    });
  };

  const error = useMemo(() => {
    const raw = approveError ?? purchaseError;
    if (!raw) return null;
    return parseContractError(raw);
  }, [approveError, purchaseError]);

  const reset = () => {
    resetApprove();
    resetPurchase();
  };

  return {
    approveUSDC,
    isApproving: isApprovePending,
    isApproveConfirming,
    isApproveConfirmed,
    approveHash: approveData ?? null,

    purchaseTokens,
    isPurchasing: isPurchasePending,
    isPurchaseConfirming,
    isPurchaseConfirmed,
    purchaseHash: purchaseData ?? null,

    error,
    reset,
  };
}
