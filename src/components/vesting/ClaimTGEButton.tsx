'use client';

import { Button } from '@/components/ui/button';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { formatACTX } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Gift } from 'lucide-react';

interface ClaimTGEButtonProps {
  readonly tgeAmount: bigint;
  readonly canClaimTGE: boolean;
  readonly hasClaimed25: boolean;
  readonly tgeTriggered: boolean;
  readonly isClaimingTGE: boolean;
  readonly isTGEConfirming: boolean;
  readonly isTGEConfirmed: boolean;
  readonly tgeHash: string | null;
  readonly onClaim: () => void;
}

/**
 * One-shot 25% TGE claim button.
 * Parent owns the write hook and passes state down.
 */
export function ClaimTGEButton({
  tgeAmount,
  canClaimTGE,
  hasClaimed25,
  tgeTriggered,
  isClaimingTGE,
  isTGEConfirming,
  isTGEConfirmed,
  tgeHash,
  onClaim,
}: ClaimTGEButtonProps) {
  const isProcessing = isClaimingTGE || isTGEConfirming;

  const statusText = !tgeTriggered
    ? 'TGE not yet triggered'
    : hasClaimed25 || isTGEConfirmed
      ? 'TGE tokens claimed'
      : `Claim ${formatACTX(tgeAmount, 0)} ACTX`;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[var(--blessup-gold)]" />
          <p className="text-sm font-medium">TGE Unlock (25%)</p>
        </div>

        <p className="text-xs text-muted-foreground">
          {formatACTX(tgeAmount, 0)} ACTX available at TGE
        </p>

        {hasClaimed25 || isTGEConfirmed ? (
          <div className="flex items-center gap-2 text-sm text-[var(--blessup-green)]">
            <CheckCircle2 className="h-4 w-4" />
            <span>TGE tokens claimed</span>
          </div>
        ) : (
          <Button
            onClick={onClaim}
            disabled={!canClaimTGE || isProcessing}
            className="w-full bg-[var(--blessup-green)] text-white hover:bg-[var(--blessup-green-dark)]"
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isClaimingTGE
              ? 'Confirm in wallet...'
              : isTGEConfirming
                ? 'Confirming...'
                : statusText}
          </Button>
        )}

        {tgeHash && !isTGEConfirmed && (
          <TransactionStatus hash={tgeHash} label="TGE Claim" />
        )}
      </CardContent>
    </Card>
  );
}
