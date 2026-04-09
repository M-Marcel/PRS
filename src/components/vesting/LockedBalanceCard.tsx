'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenAmount } from '@/components/shared/TokenAmount';
import { PRESALE } from '@/lib/constants';
import { Lock, Zap } from 'lucide-react';

interface LockedBalanceCardProps {
  readonly lockedBalance: bigint;
  readonly totalPurchased: bigint;
  readonly tierName: string;
  readonly className?: string;
}

/**
 * Displays the current locked balance and the multiplier boost it provides.
 */
export function LockedBalanceCard({
  lockedBalance,
  totalPurchased,
  tierName,
  className = '',
}: LockedBalanceCardProps) {
  if (totalPurchased === 0n) return null;

  const hasLockedTokens = lockedBalance > 0n;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Multiplier Boost</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasLockedTokens ? (
          <>
            <p className="text-sm text-muted-foreground">
              Your locked balance of{' '}
              <TokenAmount amount={lockedBalance} decimals={0} showIcon /> is powering a{' '}
              <span className="font-semibold text-[var(--blessup-green)]">
                +{PRESALE.MULTIPLIER_BOOST}x
              </span>{' '}
              boost to your Action Multiplier.
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <Zap className="h-4 w-4 text-[var(--blessup-gold)]" />
              <span className="text-sm">
                Current Multiplier: {tierName} base + {PRESALE.MULTIPLIER_BOOST}x (Staking)
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            All tokens have been vested. The staking multiplier boost is no longer active.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
