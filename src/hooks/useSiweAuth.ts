'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { setAuthToken } from '@/lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';
const SESSION_STORAGE_KEY = 'actx_session_token';
const SESSION_WALLET_KEY = 'actx_session_wallet';

interface ChallengeResponse {
  readonly success: boolean;
  readonly data?: {
    readonly message: string;
    readonly nonce: string;
  };
  readonly error?: string;
}

interface VerifyResponse {
  readonly success: boolean;
  readonly data?: {
    readonly address: string;
    readonly token: string;
  };
  readonly error?: string;
}

export interface SiweAuthState {
  readonly token: string | null;
  readonly isAuthenticated: boolean;
  readonly isSigningIn: boolean;
  readonly walletAddress: string | null;
  readonly error: string | null;
  readonly signIn: () => Promise<void>;
  readonly signOut: () => void;
}

export function useSiweAuth(): SiweAuthState {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevAddressRef = useRef<string | undefined>(address);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    const storedWallet = sessionStorage.getItem(SESSION_WALLET_KEY);

    if (stored && storedWallet && address && storedWallet.toLowerCase() === address.toLowerCase()) {
      setToken(stored);
      setAuthToken(stored);
    } else if (stored) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_WALLET_KEY);
    }
  }, [address]);

  useEffect(() => {
    const prev = prevAddressRef.current;
    prevAddressRef.current = address;

    if (prev && address && prev.toLowerCase() !== address.toLowerCase() && token) {
      setToken(null);
      setAuthToken(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_WALLET_KEY);
      setError(null);
    }
  }, [address, token]);

  useEffect(() => {
    if (!isConnected && token) {
      setToken(null);
      setAuthToken(null);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_WALLET_KEY);
      setError(null);
    }
  }, [isConnected, token]);

  const signIn = useCallback(async () => {
    if (!address || isSigningIn) return;

    setIsSigningIn(true);
    setError(null);

    try {
      const challengeRes = await fetch(`${API_BASE_URL}/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });

      if (!challengeRes.ok) {
        const body = (await challengeRes.json().catch(() => ({}))) as ChallengeResponse;
        throw new Error(body.error ?? `Challenge failed: ${challengeRes.status}`);
      }

      const challengeBody = (await challengeRes.json()) as ChallengeResponse;
      const message = challengeBody.data?.message;
      if (!message) {
        throw new Error('No SIWE message received from server');
      }

      const signature = await signMessageAsync({ message });

      const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      });

      if (!verifyRes.ok) {
        const body = (await verifyRes.json().catch(() => ({}))) as VerifyResponse;
        throw new Error(body.error ?? `Verification failed: ${verifyRes.status}`);
      }

      const verifyBody = (await verifyRes.json()) as VerifyResponse;
      const sessionToken = verifyBody.data?.token;
      if (!sessionToken) {
        throw new Error('No session token received from server');
      }

      setToken(sessionToken);
      setAuthToken(sessionToken);
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessionToken);
      sessionStorage.setItem(SESSION_WALLET_KEY, address.toLowerCase());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to sign in';
      if (message.toLowerCase().includes('user rejected') || message.toLowerCase().includes('user denied')) {
        setError('Sign-in cancelled');
      } else {
        setError(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  }, [address, isSigningIn, signMessageAsync]);

  const signOut = useCallback(() => {
    setToken(null);
    setAuthToken(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_WALLET_KEY);
    setError(null);
  }, []);

  return {
    token,
    isAuthenticated: token !== null && isConnected,
    isSigningIn,
    walletAddress: address ?? null,
    error,
    signIn,
    signOut,
  };
}
