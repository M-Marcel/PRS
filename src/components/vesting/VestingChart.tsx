'use client';

import { useMemo } from 'react';
import { formatACTX } from '@/lib/formatting';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import type { VestingData } from '@/types';

interface VestingChartProps {
  readonly vestingData: VestingData;
}

/**
 * CSS-based segmented progress bar showing vesting status.
 *
 * Visual states:
 * 1. Pre-TGE: Full gray, "Awaiting TGE trigger"
 * 2. TGE unclaimed: 25% yellow pulsing + 75% gray
 * 3. Mid-vest: Green (claimed) + Yellow (claimable) + Gray (locked)
 * 4. Fully vested: Full green
 */
export function VestingChart({ vestingData }: VestingChartProps) {
  const {
    totalPurchased, totalClaimed, claimableBalance, lockedBalance,
    tgeTriggered, hasClaimed25, isFullyVested, currentDay,
  } = vestingData;

  const segments = useMemo(() => {
    if (totalPurchased === 0n) {
      return { claimedPct: 0, claimablePct: 0 };
    }

    // Pre-TGE: everything locked
    if (!tgeTriggered) {
      return { claimedPct: 0, claimablePct: 0 };
    }

    // TGE triggered but 25% unclaimed
    if (!hasClaimed25) {
      return { claimedPct: 0, claimablePct: 25 };
    }

    // Normal vesting: compute proportions
    const claimedPct = Number((totalClaimed * 10000n) / totalPurchased) / 100;
    const claimablePct = Number((claimableBalance * 10000n) / totalPurchased) / 100;
    return { claimedPct, claimablePct };
  }, [totalPurchased, totalClaimed, claimableBalance, tgeTriggered, hasClaimed25]);

  const statusLabel = !tgeTriggered
    ? 'Awaiting TGE'
    : isFullyVested
      ? 'All Tokens Vested'
      : `Day ${currentDay} of 90`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Vesting Timeline</CardTitle>
          <span className="text-sm text-muted-foreground">{statusLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Segmented progress bar */}
        <div className="relative h-8 w-full overflow-hidden rounded-full bg-muted">
          {totalPurchased === 0n || !tgeTriggered ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{totalPurchased === 0n ? 'No tokens purchased' : 'Awaiting TGE trigger'}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Green: claimed portion */}
              {segments.claimedPct > 0 && (
                <div
                  className="bg-[var(--blessup-green)] transition-all duration-500"
                  style={{ width: `${segments.claimedPct}%` }}
                />
              )}
              {/* Yellow: claimable portion */}
              {segments.claimablePct > 0 && (
                <div
                  className={`bg-[var(--blessup-gold)] transition-all duration-500 ${
                    !hasClaimed25 ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${segments.claimablePct}%` }}
                />
              )}
            </div>
          )}
        </div>

        {/* Milestone markers */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>TGE (25%)</span>
          <span>Day 30</span>
          <span>Day 60</span>
          <span>Day 90 (100%)</span>
        </div>

        {/* Balance breakdown */}
        {totalPurchased > 0n && (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--blessup-green)]" />
              <span className="text-muted-foreground">
                Claimed: {formatACTX(totalClaimed, 0)} ACTX
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-[var(--blessup-gold)]" />
              <span className="text-muted-foreground">
                Claimable: {formatACTX(claimableBalance, 0)} ACTX
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground">
                Locked: {formatACTX(lockedBalance, 0)} ACTX
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
