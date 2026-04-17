'use client';

import { useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { parseAbi } from 'viem';
import { USDC_ABI } from '@/lib/abis/USDC';
import { GENESIS_PRESALE_ABI } from '@/lib/abis/GenesisPresale';
import { getAddresses } from '@/lib/contracts';
import { getErrorMessage } from '@/lib/validation';
import { calculateCost } from '@/lib/formatting';

const usdcAbi = parseAbi(USDC_ABI);
const genesisPresaleAbi = parseAbi(GENESIS_PRESALE_ABI);

interface UsePresaleWriteReturn {
  readonly approveUSDC: (amount: bigint) => void;
  readonly isApproving: boolean;
  readonly isApproveConfirming: boolean;
  readonly isApproveConfirmed: boolean;
  readonly approveHash: string | null;

  readonly purchaseTokens: (tokenAmount: bigint, tierPrice: bigint) => void;
  readonly isPurchasing: boolean;
  readonly isPurchaseConfirming: boolean;
  readonly isPurchaseConfirmed: boolean;
  readonly purchaseHash: string | null;

  readonly error: string | null;
  readonly reset: () => void;
}

/**
 * Parse contract revert errors into user-friendly messages.
 * Maps actual ACTXPresale.sol custom errors.
 */
function parseContractError(error: unknown): string {
  const msg = getErrorMessage(error);
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'Transaction cancelled';
  }
  if (lower.includes('notqualified')) {
    return 'Your wallet is not qualified for the presale';
  }
  if (lower.includes('notierassigned')) {
    return 'Your wallet has no tier assigned. Contact support.';
  }
  if (lower.includes('presalenotopen')) {
    return 'The presale is not currently open';
  }
  if (lower.includes('poolexhausted')) {
    return 'All presale tokens have been claimed';
  }
  if (lower.includes('exceedsmaxspend')) {
    return 'Purchase would exceed your tier spend cap';
  }
  if (lower.includes('exceedstokencap')) {
    return 'Purchase would exceed your 10,000 ACTX cap';
  }
  if (lower.includes('maxparticipantsreached')) {
    return 'The presale has reached its 300 founder limit';
  }
  if (lower.includes('insufficientallowance') || lower.includes('insufficient allowance')) {
    return 'USDC approval needed first';
  }
  if (lower.includes('insufficientbalance') || lower.includes('insufficient balance')) {
    return 'Not enough USDC in your wallet';
  }

  return msg;
}

/**
 * Write hook for the presale purchase flow.
 *
 * CRITICAL: The contract's purchase(uint256 usdcAmount) accepts USDC amount (6 decimals).
 * The UI lets users enter a desired ACTX token count, so this hook computes
 * usdcCost = ceiling((tokenAmount * tierPrice) / 1e18) before calling the contract.
 */
export function usePresaleWrite(): UsePresaleWriteReturn {
  const queryClient = useQueryClient();
  const { usdc, genesisPresale } = getAddresses();

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
      args: [genesisPresale, amount],
    });
  };

  const purchaseTokens = (tokenAmount: bigint, tierPrice: bigint) => {
    // Use the same ceiling-division function as the UI display (calculateCost)
    const usdcCost = calculateCost(tokenAmount, tierPrice);
    writePurchase({
      address: genesisPresale,
      abi: genesisPresaleAbi,
      functionName: 'purchase',
      args: [usdcCost],
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
