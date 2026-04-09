'use client';

import { useEffect, useMemo } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
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
  readonly registerFounder: (wallet: Address, tier: number) => void;
  readonly register: AdminWriteOp;

  readonly markSprint: (wallet: Address) => void;
  readonly sprint: AdminWriteOp;

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
  if (lower.includes('alreadyopen') || lower.includes('already open')) {
    return 'Presale is already open';
  }
  if (lower.includes('alreadyclosed') || lower.includes('already closed')) {
    return 'Presale is already closed';
  }
  if (lower.includes('tgealready') || lower.includes('tge already')) {
    return 'TGE has already been triggered';
  }
  if (lower.includes('paused')) {
    return 'Contract is currently paused';
  }
  if (lower.includes('alreadyregistered') || lower.includes('already registered')) {
    return 'Founder is already registered on-chain';
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

  // Invalidate caches when THIS specific operation confirms
  useEffect(() => {
    if (receipt.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['readContracts'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [receipt.isSuccess, queryClient]);

  return {
    writeContract: write.writeContract,
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
 * Each operation has independent state tracking and cache invalidation
 * so multiple actions don't interfere with each other's TX lifecycle.
 */
export function useAdminWrite(): UseAdminWriteReturn {
  const queryClient = useQueryClient();
  const { presale } = getAddresses();

  const registerOp = useAdminOp(queryClient);
  const sprintOp = useAdminOp(queryClient);
  const openOp = useAdminOp(queryClient);
  const closeOp = useAdminOp(queryClient);
  const tgeOp = useAdminOp(queryClient);
  const pauseOperation = useAdminOp(queryClient);
  const unpauseOperation = useAdminOp(queryClient);

  const registerFounder = (wallet: Address, tier: number) => {
    registerOp.writeContract({
      address: presale,
      abi: presaleAbi,
      functionName: 'registerFounder',
      args: [wallet, tier],
    });
  };

  const markSprint = (wallet: Address) => {
    sprintOp.writeContract({
      address: presale,
      abi: presaleAbi,
      functionName: 'markSprintComplete',
      args: [wallet],
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
      registerOp.error ?? sprintOp.error ?? openOp.error ??
      closeOp.error ?? tgeOp.error ?? pauseOperation.error ?? unpauseOperation.error;
    if (!raw) return null;
    return parseAdminError(raw);
  }, [
    registerOp.error, sprintOp.error, openOp.error,
    closeOp.error, tgeOp.error, pauseOperation.error, unpauseOperation.error,
  ]);

  const reset = () => {
    registerOp.reset();
    sprintOp.reset();
    openOp.reset();
    closeOp.reset();
    tgeOp.reset();
    pauseOperation.reset();
    unpauseOperation.reset();
  };

  return {
    registerFounder,
    register: toOp(registerOp),
    markSprint,
    sprint: toOp(sprintOp),
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
