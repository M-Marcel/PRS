'use client';

import { Button } from '@/components/ui/button';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { formatACTX } from '@/lib/formatting';
import { Loader2 } from 'lucide-react';

interface PurchaseButtonProps {
  readonly tokenAmount: bigint;
  readonly isPurchasing: boolean;
  readonly isPurchaseConfirming: boolean;
  readonly purchaseHash: string | null;
  readonly onPurchase: () => void;
  readonly disabled?: boolean;
}

/**
 * Step 2 of the purchase flow: execute the presale purchase.
 * Parent component owns the write hook and passes state down.
 */
export function PurchaseButton({
  tokenAmount,
  isPurchasing,
  isPurchaseConfirming,
  purchaseHash,
  onPurchase,
  disabled = false,
}: PurchaseButtonProps) {
  const isProcessing = isPurchasing || isPurchaseConfirming;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Step 2: Purchase
      </p>

      <Button
        onClick={onPurchase}
        disabled={disabled || isProcessing}
        className="w-full bg-[var(--blessup-green)] text-white hover:bg-[var(--blessup-green-dark)]"
      >
        {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isPurchasing
          ? 'Confirm in wallet...'
          : isPurchaseConfirming
            ? 'Confirming...'
            : `Purchase ${formatACTX(tokenAmount, 0)} ACTX`}
      </Button>

      {purchaseHash && (
        <TransactionStatus hash={purchaseHash} label="ACTX Purchase" />
      )}
    </div>
  );
}
