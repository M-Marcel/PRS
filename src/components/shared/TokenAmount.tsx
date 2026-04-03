'use client';

import { formatACTX } from '@/lib/formatting';
import { Coins } from 'lucide-react';

interface TokenAmountProps {
  readonly amount: bigint;
  readonly decimals?: number;
  readonly showIcon?: boolean;
  readonly showSymbol?: boolean;
  readonly className?: string;
}

/**
 * Formatted ACTX token amount display (18 decimals).
 */
export function TokenAmount({
  amount,
  decimals = 2,
  showIcon = false,
  showSymbol = true,
  className = '',
}: TokenAmountProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {showIcon && <Coins className="h-4 w-4 text-[var(--blessup-green)]" />}
      <span className="font-semibold">{formatACTX(amount, decimals)}</span>
      {showSymbol && <span className="text-muted-foreground">ACTX</span>}
    </span>
  );
}
