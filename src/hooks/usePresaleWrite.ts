'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, parseAbi, type Hex } from 'viem';
import { USDC_ABI } from '@/lib/abis/USDC';
import { GENESIS_PRESALE_ABI } from '@/lib/abis/GenesisPresale';
import { getAddresses } from '@/lib/contracts';
import { TARGET_CHAIN_ID } from '@/lib/chains';
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
  if (lower.includes('presalewindowexpired')) {
    return 'The 7-day presale window has expired';
  }
  if (lower.includes('insufficientallowance') || lower.includes('insufficient allowance')) {
    return 'USDC approval needed first';
  }
  if (lower.includes('insufficientbalance') || lower.includes('insufficient balance')) {
    return 'Not enough USDC in your wallet';
  }
  if (lower.includes('invalid chain id') || lower.includes('invalid chainid')) {
    return 'Your wallet\'s Base Sepolia RPC may be misconfigured. Try removing and re-adding Base Sepolia in your wallet settings, or switch to a different RPC endpoint.';
  }

  return msg;
}

export function usePresaleWrite(): UsePresaleWriteReturn {
  const queryClient = useQueryClient();
  const { usdc, genesisPresale } = getAddresses();
  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [approveHash, setApproveHash] = useState<Hex | null>(null);
  const [purchaseHash, setPurchaseHash] = useState<Hex | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [writeError, setWriteError] = useState<unknown>(null);

  const {
    isLoading: isApproveConfirming,
    isSuccess: isApproveConfirmed,
  } = useWaitForTransactionReceipt({
    hash: approveHash ?? undefined,
    query: { enabled: Boolean(approveHash) },
  });

  const {
    isLoading: isPurchaseConfirming,
    isSuccess: isPurchaseConfirmed,
  } = useWaitForTransactionReceipt({
    hash: purchaseHash ?? undefined,
    query: { enabled: Boolean(purchaseHash) },
  });

  useEffect(() => {
    if (isPurchaseConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isPurchaseConfirmed, queryClient]);

  useEffect(() => {
    if (isApproveConfirmed) {
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isApproveConfirmed, queryClient]);

  const sendRawTx = useCallback(
    async (to: Hex, data: Hex, gas: bigint): Promise<Hex> => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }
      if (walletChainId !== TARGET_CHAIN_ID) {
        throw new Error(
          `Wallet is on chain ${walletChainId ?? 'unknown'}, expected Base Sepolia (${TARGET_CHAIN_ID}). Please switch networks.`,
        );
      }

      const [nonce, fees] = await Promise.all([
        publicClient.getTransactionCount({ address }),
        publicClient.estimateFeesPerGas(),
      ]);

      return walletClient.sendTransaction({
        to,
        data,
        gas,
        nonce,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        chain: null,
      });
    },
    [walletClient, publicClient, address, walletChainId],
  );

  const approveUSDC = useCallback(
    async (amount: bigint) => {
      setIsApproving(true);
      setWriteError(null);
      try {
        const data = encodeFunctionData({
          abi: usdcAbi,
          functionName: 'approve',
          args: [genesisPresale, amount],
        });
        const hash = await sendRawTx(usdc, data, 100_000n);
        setApproveHash(hash);
      } catch (err) {
        setWriteError(err);
      } finally {
        setIsApproving(false);
      }
    },
    [sendRawTx, usdc, genesisPresale],
  );

  const purchaseTokens = useCallback(
    async (tokenAmount: bigint, tierPrice: bigint) => {
      setIsPurchasing(true);
      setWriteError(null);
      try {
        const usdcCost = calculateCost(tokenAmount, tierPrice);
        const data = encodeFunctionData({
          abi: genesisPresaleAbi,
          functionName: 'purchase',
          args: [usdcCost],
        });
        const hash = await sendRawTx(genesisPresale, data, 300_000n);
        setPurchaseHash(hash);
      } catch (err) {
        setWriteError(err);
      } finally {
        setIsPurchasing(false);
      }
    },
    [sendRawTx, genesisPresale],
  );

  const error = useMemo(() => {
    if (!writeError) return null;
    return parseContractError(writeError);
  }, [writeError]);

  const reset = useCallback(() => {
    setApproveHash(null);
    setPurchaseHash(null);
    setIsApproving(false);
    setIsPurchasing(false);
    setWriteError(null);
  }, []);

  return {
    approveUSDC,
    isApproving,
    isApproveConfirming,
    isApproveConfirmed,
    approveHash: approveHash ?? null,

    purchaseTokens,
    isPurchasing,
    isPurchaseConfirming,
    isPurchaseConfirmed,
    purchaseHash: purchaseHash ?? null,

    error,
    reset,
  };
}
