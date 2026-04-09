'use client';

import { formatUSDC } from '@/lib/formatting';
import { PRESALE } from '@/lib/constants';

interface PriceDisplayProps {
  readonly tierPrice: bigint;
  readonly tierName: string;
  readonly className?: string;
}

/**
 * Displays the founder's tier price alongside the public launch price (struck through).
 */
export function PriceDisplay({ tierPrice, tierName, className = '' }: PriceDisplayProps) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-lg font-bold text-foreground">
        {formatUSDC(tierPrice)}
      </span>
      <span className="text-sm text-muted-foreground">
        / ACTX ({tierName})
      </span>
      <span className="text-sm text-muted-foreground line-through">
        {formatUSDC(PRESALE.PUBLIC_PRICE)}
      </span>
    </div>
  );
}
