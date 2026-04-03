'use client';

import { formatUSDC } from '@/lib/formatting';
import { CircleDollarSign } from 'lucide-react';

interface USDCAmountProps {
  readonly amount: bigint;
  readonly showIcon?: boolean;
  readonly className?: string;
}

/**
 * Formatted USDC amount display (6 decimals).
 */
export function USDCAmount({
  amount,
  showIcon = false,
  className = '',
}: USDCAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showIcon && <CircleDollarSign className="h-4 w-4 text-muted-foreground" />}
      <span className="font-semibold">{formatUSDC(amount)}</span>
    </span>
  );
}
