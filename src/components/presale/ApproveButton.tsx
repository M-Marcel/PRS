'use client';

import { Button } from '@/components/ui/button';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { formatUSDC } from '@/lib/formatting';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface ApproveButtonProps {
  readonly usdcAmount: bigint;
  readonly isApproving: boolean;
  readonly isApproveConfirming: boolean;
  readonly isApproveConfirmed: boolean;
  readonly approveHash: string | null;
  readonly onApprove: () => void;
  readonly disabled?: boolean;
}

/**
 * Step 1 of the purchase flow: approve USDC spending.
 * Parent component owns the write hook and passes state down.
 */
export function ApproveButton({
  usdcAmount,
  isApproving,
  isApproveConfirming,
  isApproveConfirmed,
  approveHash,
  onApprove,
  disabled = false,
}: ApproveButtonProps) {
  const isProcessing = isApproving || isApproveConfirming;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isApproveConfirmed ? 'bg-[var(--blessup-green)] text-white' : 'border border-border bg-muted text-muted-foreground'}`}>
          {isApproveConfirmed ? '✓' : '1'}
        </span>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Approve USDC
        </p>
      </div>

      {isApproveConfirmed ? (
        <div className="flex items-center gap-2 text-sm text-[var(--blessup-green)]">
          <CheckCircle2 className="h-4 w-4" />
          <span>USDC approved</span>
        </div>
      ) : (
        <Button
          onClick={onApprove}
          disabled={disabled || isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isApproving
            ? 'Confirm in wallet...'
            : isApproveConfirming
              ? 'Confirming...'
              : `Approve ${formatUSDC(usdcAmount)} USDC`}
        </Button>
      )}

      {approveHash && !isApproveConfirmed && (
        <TransactionStatus hash={approveHash} label="USDC Approval" />
      )}
    </div>
  );
}
