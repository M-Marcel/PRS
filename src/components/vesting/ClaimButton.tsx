'use client';

import { Button } from '@/components/ui/button';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { formatACTX } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Gift } from 'lucide-react';

interface ClaimButtonProps {
  readonly claimableBalance: bigint;
  readonly canClaim: boolean;
  readonly tgeTriggered: boolean;
  readonly isClaiming: boolean;
  readonly isConfirming: boolean;
  readonly isConfirmed: boolean;
  readonly claimHash: string | null;
  readonly onClaim: () => void;
}

/**
 * Unified claim button for both TGE (25%) and linear vesting claims.
 * The contract uses a single claim() function that handles both.
 */
export function ClaimButton({
  claimableBalance,
  canClaim,
  tgeTriggered,
  isClaiming,
  isConfirming,
  isConfirmed,
  claimHash,
  onClaim,
}: ClaimButtonProps) {
  const isProcessing = isClaiming || isConfirming;

  const statusText = !tgeTriggered
    ? 'TGE not yet triggered'
    : claimableBalance > 0n
      ? `Claim ${formatACTX(claimableBalance, 0)} ACTX`
      : 'No tokens to claim';

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[var(--blessup-gold)]" />
          <p className="text-sm font-medium">Claim Tokens</p>
        </div>

        <p className="text-xs text-muted-foreground">
          {claimableBalance > 0n
            ? `${formatACTX(claimableBalance, 0)} ACTX available to claim`
            : tgeTriggered
              ? 'No tokens available to claim yet'
              : 'TGE has not been triggered yet'}
        </p>

        {isConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-[var(--blessup-green)]">
            <CheckCircle2 className="h-4 w-4" />
            <span>Tokens claimed successfully</span>
          </div>
        ) : (
          <Button
            onClick={onClaim}
            disabled={!canClaim || isProcessing}
            className="w-full bg-[var(--blessup-green)] text-white hover:bg-[var(--blessup-green-dark)]"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isClaiming
              ? 'Confirm in wallet...'
              : isConfirming
                ? 'Confirming...'
                : statusText}
          </Button>
        )}

        {claimHash && !isConfirmed && (
          <TransactionStatus hash={claimHash} label="Claim" />
        )}
      </CardContent>
    </Card>
  );
}
