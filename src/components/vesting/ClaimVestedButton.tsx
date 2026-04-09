'use client';

import { Button } from '@/components/ui/button';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { formatACTX } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, TrendingUp } from 'lucide-react';

interface ClaimVestedButtonProps {
  readonly claimableBalance: bigint;
  readonly canClaimVested: boolean;
  readonly isClaimingVested: boolean;
  readonly isVestedConfirming: boolean;
  readonly isVestedConfirmed: boolean;
  readonly vestedHash: string | null;
  readonly onClaim: () => void;
}

/**
 * Claim available linearly vested tokens.
 * Can be called multiple times — claims the delta since last claim.
 * Parent owns the write hook and passes state down.
 */
export function ClaimVestedButton({
  claimableBalance,
  canClaimVested,
  isClaimingVested,
  isVestedConfirming,
  isVestedConfirmed,
  vestedHash,
  onClaim,
}: ClaimVestedButtonProps) {
  const isProcessing = isClaimingVested || isVestedConfirming;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--blessup-green)]" />
          <p className="text-sm font-medium">Linear Vest (75%)</p>
        </div>

        <p className="text-xs text-muted-foreground">
          {claimableBalance > 0n
            ? `${formatACTX(claimableBalance, 0)} ACTX available to claim`
            : 'No tokens available to claim yet'}
        </p>

        {isVestedConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-[var(--blessup-green)]">
            <CheckCircle2 className="h-4 w-4" />
            <span>Vested tokens claimed</span>
          </div>
        ) : (
          <Button
            onClick={onClaim}
            disabled={!canClaimVested || isProcessing}
            className="w-full"
            variant={canClaimVested ? 'default' : 'outline'}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isClaimingVested
              ? 'Confirm in wallet...'
              : isVestedConfirming
                ? 'Confirming...'
                : canClaimVested
                  ? `Claim ${formatACTX(claimableBalance, 0)} ACTX`
                  : 'No tokens to claim'}
          </Button>
        )}

        {vestedHash && !isVestedConfirmed && (
          <TransactionStatus hash={vestedHash} label="Vesting Claim" />
        )}
      </CardContent>
    </Card>
  );
}
