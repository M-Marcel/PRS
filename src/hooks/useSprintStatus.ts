'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Address } from 'viem';
import { useFounderContractData } from './usePresaleContract';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import type { SprintStatus } from '@/types';

/**
 * Fetches Genesis Sprint progress from the backend API and merges
 * on-chain state from the presale contract.
 *
 * Polling behavior:
 * - When sprint is complete but not yet marked on-chain, polls every 30s
 *   to detect admin confirmation.
 * - Otherwise, no automatic polling — UI triggers refetch after session completion.
 */
export function useSprintStatus(walletAddress: Address | undefined): {
  sprintStatus: SprintStatus | null;
  isLoading: boolean;
  error: string | null;
  completeSession: () => Promise<boolean>;
  refetch: () => void;
} {
  const [sprintStatus, setSprintStatus] = useState<SprintStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isQualified: onChainCompleted } =
    useFounderContractData(walletAddress);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) {
      setSprintStatus(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiGet<SprintStatus>(
        `/sprint/status?wallet=${encodeURIComponent(walletAddress)}`,
      );

      if (result.success && result.data) {
        setSprintStatus(result.data);
      } else {
        setSprintStatus(null);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setSprintStatus(null);
        setError('Wallet not registered for presale');
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Failed to fetch sprint status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 30s when sprint is complete off-chain but not yet on-chain
  useEffect(() => {
    if (!sprintStatus?.isComplete || onChainCompleted) return;

    const interval = setInterval(fetchStatus, 30_000);
    return () => clearInterval(interval);
  }, [sprintStatus?.isComplete, onChainCompleted, fetchStatus]);

  // Merge on-chain state into the sprint status
  const mergedStatus: SprintStatus | null = sprintStatus
    ? { ...sprintStatus, markedOnChain: onChainCompleted || sprintStatus.markedOnChain }
    : null;

  /**
   * Complete today's RENEW session.
   * Returns true on success, false on failure (sets error).
   */
  const completeSession = useCallback(async (): Promise<boolean> => {
    if (!walletAddress) return false;

    setError(null);

    try {
      const result = await apiPost<SprintStatus>('/sprint/complete');

      if (result.success && result.data) {
        setSprintStatus(result.data);
      }

      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to complete session';
      setError(message);
      return false;
    }
  }, [walletAddress]);

  return {
    sprintStatus: mergedStatus,
    isLoading,
    error,
    completeSession,
    refetch: fetchStatus,
  };
}
