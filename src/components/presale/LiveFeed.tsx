'use client';

import { useAppStore } from '@/store/useAppStore';
import { formatACTX, formatUSDC, truncateAddress } from '@/lib/formatting';
import { TARGET_CHAIN } from '@/lib/chains';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Radio } from 'lucide-react';
import type { RecentPurchase } from '@/types';

const TIER_NAMES: Record<number, string> = { 1: 'Elite', 2: 'Legend' };
const TIER_COLORS: Record<number, string> = {
  1: 'bg-[var(--blessup-gold)]/10 text-[var(--blessup-gold)]',
  2: 'bg-[var(--blessup-purple)]/10 text-[var(--blessup-purple)]',
};

function getExplorerTxUrl(hash: string): string {
  const explorer = TARGET_CHAIN.blockExplorers?.default;
  if (!explorer) return '#';
  return `${explorer.url}/tx/${hash}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function PurchaseItem({ purchase, isNew }: { readonly purchase: RecentPurchase; readonly isNew: boolean }) {
  const tierName = TIER_NAMES[purchase.tier];
  const tierColor = TIER_COLORS[purchase.tier] ?? '';

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 ${
        isNew ? 'animate-slide-in-top' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {truncateAddress(purchase.buyer)}
        </span>
        {tierName && (
          <Badge variant="outline" className={`text-xs ${tierColor}`}>
            {tierName}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">
          {formatACTX(purchase.amount, 0)} ACTX
        </span>
        <span className="text-xs text-muted-foreground">
          {formatUSDC(purchase.usdcPaid)}
        </span>
        <span className="text-xs text-muted-foreground">
          {timeAgo(purchase.timestamp)}
        </span>
        {purchase.txHash && (
          <a
            href={getExplorerTxUrl(purchase.txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label="View on explorer"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

interface LiveFeedProps {
  readonly className?: string;
}

/**
 * Scrolling live feed of recent presale purchases.
 * Reads from Zustand store populated by usePresaleEvents hook.
 */
export function LiveFeed({ className = '' }: LiveFeedProps) {
  const recentPurchases = useAppStore((s) => s.recentPurchases);
  const lastPurchaseTimestamp = useAppStore((s) => s.lastPurchaseTimestamp);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Radio className="h-4 w-4 text-[var(--blessup-green)]" />
          Recent Purchases
          {recentPurchases.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs">
              {recentPurchases.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentPurchases.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <span className="text-sm text-muted-foreground animate-pulse">
              Waiting for purchases...
            </span>
          </div>
        ) : (
          <div className="max-h-[280px] space-y-1.5 overflow-y-auto">
            {recentPurchases.map((purchase, index) => (
              <PurchaseItem
                key={purchase.txHash}
                purchase={purchase}
                isNew={index === 0 && lastPurchaseTimestamp === purchase.timestamp}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
