'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Address } from 'viem';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';
import type { KycStatus, KycStatusResponse, KycInitiateResponse } from '@/types';

/**
 * Fetches KYC status from the backend API for a given wallet address.
 * Polls periodically when status is 'pending' to catch webhook updates.
 */
export function useKycStatus(walletAddress: Address | undefined): {
  kycStatus: KycStatus;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [kycStatus, setKycStatus] = useState<KycStatus>('not_started');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!walletAddress) {
      setKycStatus('not_started');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await apiGet<KycStatusResponse>('/kyc/status');

      if (result.success && result.data) {
        setKycStatus(result.data.kycStatus);
      } else {
        setKycStatus('not_started');
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 404) {
        setKycStatus('not_started');
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to fetch KYC status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll every 10s when status is 'pending' to catch webhook updates
  useEffect(() => {
    if (kycStatus !== 'pending') return;

    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, [kycStatus, fetchStatus]);

  return {
    kycStatus,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}

/**
 * Hook to initiate the KYC process for a wallet address.
 * Returns a function that triggers KYC and the resulting inquiry URL.
 */
export function useKycInitiate(): {
  initiateKyc: (walletAddress: string) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
} {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initiateKyc = useCallback(async (_walletAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiPost<KycInitiateResponse>('/kyc/initiate');

      if (result.data?.alreadyApproved) {
        return null;
      }

      return result.data?.inquiryUrl ?? null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initiate KYC';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    initiateKyc,
    isLoading,
    error,
  };
}
