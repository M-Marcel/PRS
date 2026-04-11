'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Address } from 'viem';
import { useFounderContractData } from './usePresaleContract';
import type { SprintStatus, ApiResponse } from '@/types';

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
      const response = await fetch(
        `/api/sprint/status?wallet=${encodeURIComponent(walletAddress)}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setSprintStatus(null);
          setError('Wallet not registered for presale');
          return;
        }
        throw new Error(`Sprint status fetch failed: ${response.status}`);
      }

      const body = (await response.json()) as ApiResponse<SprintStatus>;

      if (body.success && body.data) {
        setSprintStatus(body.data);
      } else {
        setSprintStatus(null);
      }
    } catch (err: unknown) {
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
      const response = await fetch('/api/sprint/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const body = (await response.json()) as ApiResponse<SprintStatus>;

      if (!response.ok) {
        setError(body.error ?? `Session completion failed: ${response.status}`);
        return false;
      }

      if (body.success && body.data) {
        setSprintStatus(body.data);
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
