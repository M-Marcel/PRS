'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useUSDCBalance } from '@/hooks/useUSDC';
import { useACTXBalance } from '@/hooks/useACTXToken';
import { formatACTX, formatUSDC, truncateAddress } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Coins, CircleDollarSign } from 'lucide-react';

/**
 * Displays the connected wallet address, USDC balance, and ACTX balance.
 * Only renders when a wallet is connected. SSR-safe.
 */
export function WalletInfo() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return <WalletInfoInner />;
}

function WalletInfoInner() {
  const { address } = useAccount();
  const { balance: usdcBalance, isLoading: isUsdcLoading } = useUSDCBalance(address);
  const { balance: actxBalance, isLoading: isActxLoading } = useACTXBalance(address);

  if (!address) return null;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-6 py-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <span className="font-mono text-sm">{truncateAddress(address)}</span>
        </div>

        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            {isUsdcLoading ? (
              <span className="animate-pulse text-muted-foreground">Loading...</span>
            ) : (
              <span>
                <span className="font-semibold">{formatUSDC(usdcBalance)}</span>
                <span className="ml-1 text-muted-foreground">USDC</span>
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-[var(--blessup-green)]" />
          <span className="text-sm">
            {isActxLoading ? (
              <span className="animate-pulse text-muted-foreground">Loading...</span>
            ) : (
              <span>
                <span className="font-semibold">{formatACTX(actxBalance)}</span>
                <span className="ml-1 text-muted-foreground">ACTX</span>
              </span>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
