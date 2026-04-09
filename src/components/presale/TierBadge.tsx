'use client';

import { FounderTier } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface TierBadgeProps {
  readonly tier: number;
  readonly className?: string;
}

const TIER_CONFIG: Record<number, { label: string; discount: string; className: string }> = {
  [FounderTier.ELITE]: {
    label: 'Elite Founder',
    discount: '30% OFF',
    className: 'border-[var(--blessup-gold)] bg-[var(--blessup-gold)]/10 text-[var(--blessup-gold)]',
  },
  [FounderTier.LEGEND]: {
    label: 'Legend Founder',
    discount: '50% OFF',
    className: 'border-[var(--blessup-purple)] bg-[var(--blessup-purple)]/10 text-[var(--blessup-purple)]',
  },
};

/**
 * Visual badge showing the founder's tier with discount percentage.
 */
export function TierBadge({ tier, className = '' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className}`}
    >
      {config.label} &mdash; {config.discount}
    </Badge>
  );
}
