'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useAccount, useSwitchChain } from 'wagmi';
import { TARGET_CHAIN, TARGET_CHAIN_ID } from '@/lib/chains';
import { ConnectButton } from './ConnectButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface NetworkGuardProps {
  readonly children: ReactNode;
}

/**
 * Enforces wallet connection and correct chain.
 * SSR-safe: renders a loading state until client-side mount.
 *
 * Gate chain:
 * 1. Not connected -> Show ConnectButton prompt
 * 2. Wrong chain -> Show "Switch to Base" button
 * 3. Correct chain -> Render children
 */
export function NetworkGuard({ children }: NetworkGuardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <NetworkGuardInner>{children}</NetworkGuardInner>;
}

function NetworkGuardInner({ children }: NetworkGuardProps) {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Gate 1: Not connected
  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <WifiOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Connect Your Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to access the BlessUP Genesis Presale.
              We support Coinbase Wallet, MetaMask, and WalletConnect.
            </p>
            <div className="flex justify-center">
              <ConnectButton label="Connect to Get Started" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 2: Wrong chain
  if (chainId !== TARGET_CHAIN_ID) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Wrong Network</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The BlessUP Genesis Presale runs on {TARGET_CHAIN.name}.
              Please switch your wallet to the correct network.
            </p>
            <button
              onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
              disabled={isSwitching}
              type="button"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Wifi className="h-4 w-4" />
              {isSwitching ? 'Switching...' : `Switch to ${TARGET_CHAIN.name}`}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 3: All good
  return <>{children}</>;
}
