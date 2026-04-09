'use client';

import { formatUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TokenAmount } from '@/components/shared/TokenAmount';
import { USDCAmount } from '@/components/shared/USDCAmount';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { CheckCircle2, Lock } from 'lucide-react';

interface PurchaseReceiptProps {
  readonly purchaseHash: string;
  readonly tokenAmount: bigint;
  readonly usdcCost: bigint;
  readonly tierName: string;
}

/**
 * Post-purchase confirmation card showing purchase details and vesting info.
 */
export function PurchaseReceipt({
  purchaseHash,
  tokenAmount,
  usdcCost,
  tierName,
}: PurchaseReceiptProps) {
  return (
    <Card className="border-[var(--blessup-green)]/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-[var(--blessup-green)]" />
          <CardTitle className="text-lg">Purchase Successful</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Tokens Purchased</p>
            <TokenAmount amount={tokenAmount} showIcon className="text-lg" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">USDC Spent</p>
            <USDCAmount amount={usdcCost} showIcon className="text-lg" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tier</p>
            <p className="font-semibold">{tierName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">At $0.10 Launch</p>
            <p className="font-semibold text-[var(--blessup-green)]">
              {formatLaunchValue(tokenAmount)}
            </p>
          </div>
        </div>

        <TransactionStatus hash={purchaseHash} label="Purchase" />

        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <Lock className="mt-0.5 h-4 w-4 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Vesting Schedule</p>
            <p>
              25% unlocked at TGE. Remaining 75% vests linearly over 90 days.
              Visit the Dashboard to track and claim your tokens.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatLaunchValue(tokenAmount: bigint): string {
  // Each ACTX is worth $0.10 at launch
  const tokens = parseFloat(formatUnits(tokenAmount, 18));
  const value = tokens * 0.10;
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
