'use client';

import { useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { useQueryClient } from '@tanstack/react-query';
import { type Address, parseAbi } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { getErrorMessage } from '@/lib/validation';

const presaleAbi = parseAbi(PRESALE_ABI);

interface AdminWriteOp {
  readonly isPending: boolean;
  readonly isConfirming: boolean;
  readonly isConfirmed: boolean;
  readonly hash: string | null;
}

interface UseAdminWriteReturn {
  readonly qualifyWallet: (wallet: Address) => void;
  readonly qualify: AdminWriteOp;

  readonly setWalletTier: (wallet: Address, tier: number) => void;
  readonly tierOp: AdminWriteOp;

  readonly qualifyAndSetTier: (wallet: Address, tier: number) => Promise<void>;

  readonly openPresale: () => void;
  readonly open: AdminWriteOp;

  readonly closePresale: () => void;
  readonly close: AdminWriteOp;

  readonly triggerTGE: () => void;
  readonly tge: AdminWriteOp;

  readonly pause: () => void;
  readonly pauseOp: AdminWriteOp;

  readonly unpause: () => void;
  readonly unpauseOp: AdminWriteOp;

  readonly error: string | null;
  readonly reset: () => void;
}

function parseAdminError(error: unknown): string {
  const msg = getErrorMessage(error);
  const lower = msg.toLowerCase();

  if (lower.includes('user rejected') || lower.includes('user denied')) {
    return 'Transaction cancelled';
  }
  if (lower.includes('ownableunauthorized') || lower.includes('only owner') || lower.includes('accesscontrol')) {
    return 'Your wallet does not have admin permissions on this contract';
  }
  if (lower.includes('presalealreadyopen')) {
    return 'Presale is already open';
  }
  if (lower.includes('presalestillopen')) {
    return 'Cannot perform this action while presale is still open';
  }
  if (lower.includes('tgealreadytriggered')) {
    return 'TGE has already been triggered';
  }
  if (lower.includes('invalidtier')) {
    return 'Invalid tier specified';
  }
  if (lower.includes('zeroaddress')) {
    return 'Cannot use zero address';
  }
  if (lower.includes('paused')) {
    return 'Contract is currently paused';
  }

  return msg;
}

/**
 * Helper to create a single admin write operation (write + receipt tracking).
 */
function useAdminOp(queryClient: ReturnType<typeof useQueryClient>) {
  const write = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: write.data,
    query: { enabled: Boolean(write.data) },
  });

  useEffect(() => {
    if (receipt.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [receipt.isSuccess, queryClient]);

  return {
    writeContract: write.writeContract,
    writeContractAsync: write.writeContractAsync,
    hash: write.data ?? null,
    isPending: write.isPending,
    isConfirming: receipt.isLoading,
    isConfirmed: receipt.isSuccess,
    error: write.error ?? receipt.error ?? null,
    reset: write.reset,
  };
}

/**
 * Write hook for all admin contract functions.
 *
 * Key changes from old contract:
 * - registerFounder(addr, tier) → qualifyWallet(addr) + setWalletTier(addr, tier)
 * - markSprintComplete(addr) → qualifyWallet(addr)
 * - Batch: qualifyWallets(addrs) + setWalletTiers(addrs, tiers)
 */
export function useAdminWrite(): UseAdminWriteReturn {
  const queryClient = useQueryClient();
  const config = useConfig();
  const { presale } = getAddresses();

  const qualifyOp = useAdminOp(queryClient);
  const tierOp = useAdminOp(queryClient);
  const openOp = useAdminOp(queryClient);
  const closeOp = useAdminOp(queryClient);
  const tgeOp = useAdminOp(queryClient);
  const pauseOperation = useAdminOp(queryClient);
  const unpauseOperation = useAdminOp(queryClient);

  const qualifyWallet = (wallet: Address) => {
    qualifyOp.writeContract({
      address: presale,
      abi: presaleAbi,
      functionName: 'qualifyWallet',
      args: [wallet],
    });
  };

  const setWalletTier = (wallet: Address, tier: number) => {
    tierOp.writeContract({
      address: presale,
      abi: presaleAbi,
      functionName: 'setWalletTier',
      args: [wallet, tier],
    });
  };

  // Two-step sequential: qualify then set tier (waits for on-chain confirmation)
  const qualifyAndSetTier = async (wallet: Address, tier: number) => {
    const qualifyHash = await qualifyOp.writeContractAsync({
      address: presale,
      abi: presaleAbi,
      functionName: 'qualifyWallet',
      args: [wallet],
    });
    // Wait for on-chain confirmation before sending the second transaction
    await waitForTransactionReceipt(config, { hash: qualifyHash });
    tierOp.writeContract({
      address: presale,
      abi: presaleAbi,
      functionName: 'setWalletTier',
      args: [wallet, tier],
    });
  };

  const openPresale = () => {
    openOp.writeContract({ address: presale, abi: presaleAbi, functionName: 'openPresale' });
  };

  const closePresale = () => {
    closeOp.writeContract({ address: presale, abi: presaleAbi, functionName: 'closePresale' });
  };

  const triggerTGE = () => {
    tgeOp.writeContract({ address: presale, abi: presaleAbi, functionName: 'triggerTGE' });
  };

  const doPause = () => {
    pauseOperation.writeContract({ address: presale, abi: presaleAbi, functionName: 'pause' });
  };

  const doUnpause = () => {
    unpauseOperation.writeContract({ address: presale, abi: presaleAbi, functionName: 'unpause' });
  };

  const toOp = (op: ReturnType<typeof useAdminOp>): AdminWriteOp => ({
    isPending: op.isPending,
    isConfirming: op.isConfirming,
    isConfirmed: op.isConfirmed,
    hash: op.hash,
  });

  const error = useMemo(() => {
    const raw =
      qualifyOp.error ?? tierOp.error ?? openOp.error ??
      closeOp.error ?? tgeOp.error ?? pauseOperation.error ?? unpauseOperation.error;
    if (!raw) return null;
    return parseAdminError(raw);
  }, [
    qualifyOp.error, tierOp.error, openOp.error,
    closeOp.error, tgeOp.error, pauseOperation.error, unpauseOperation.error,
  ]);

  const reset = () => {
    qualifyOp.reset();
    tierOp.reset();
    openOp.reset();
    closeOp.reset();
    tgeOp.reset();
    pauseOperation.reset();
    unpauseOperation.reset();
  };

  return {
    qualifyWallet,
    qualify: toOp(qualifyOp),
    setWalletTier,
    tierOp: toOp(tierOp),
    qualifyAndSetTier,
    openPresale,
    open: toOp(openOp),
    closePresale,
    close: toOp(closeOp),
    triggerTGE,
    tge: toOp(tgeOp),
    pause: doPause,
    pauseOp: toOp(pauseOperation),
    unpause: doUnpause,
    unpauseOp: toOp(unpauseOperation),
    error,
    reset,
  };
}
