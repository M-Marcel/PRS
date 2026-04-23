'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePresaleState } from '@/hooks/usePresaleContract';
import { useAppStore } from '@/store/useAppStore';
import { formatACTX, poolPercentage } from '@/lib/formatting';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';

interface PoolTrackerProps {
  readonly className?: string;
}

/**
 * Return the indicator color class based on remaining percentage.
 * Green (>50%) → Yellow (25–50%) → Red (<25%)
 */
function getPoolColor(remainingPercent: number): string {
  if (remainingPercent > 50) return '[&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[var(--blessup-green-dark)] [&_[data-slot=progress-indicator]]:to-[var(--blessup-green-light)]';
  if (remainingPercent > 25) return '[&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-[var(--blessup-gold-dark)] [&_[data-slot=progress-indicator]]:to-[var(--blessup-gold-light)]';
  return '[&_[data-slot=progress-indicator]]:bg-gradient-to-r [&_[data-slot=progress-indicator]]:from-red-600 [&_[data-slot=progress-indicator]]:to-red-400';
}

/**
 * Live progress bar showing the presale pool status:
 * how many ACTX tokens have been sold out of the total available.
 *
 * Features:
 * - Color transitions based on remaining percentage
 * - Pulse animation when a new purchase event is detected
 * - Floating "-X,XXX ACTX" text on purchase
 */
export function PoolTracker({ className = '' }: PoolTrackerProps) {
  const { data, isLoading } = usePresaleState();
  const lastPurchaseTimestamp = useAppStore((s) => s.lastPurchaseTimestamp);
  const recentPurchases = useAppStore((s) => s.recentPurchases);

  const [isPulsing, setIsPulsing] = useState(false);
  const [floatAmount, setFloatAmount] = useState<string | null>(null);

  // Trigger pulse + float on new purchase
  useEffect(() => {
    if (!lastPurchaseTimestamp || recentPurchases.length === 0) return;
    const latest = recentPurchases[0];
    if (!latest) return;

    setIsPulsing(true);
    setFloatAmount(formatACTX(latest.amount, 0));
  }, [lastPurchaseTimestamp, recentPurchases]);

  const handlePulseEnd = useCallback(() => {
    setIsPulsing(false);
  }, []);

  const handleFloatEnd = useCallback(() => {
    setFloatAmount(null);
  }, []);

  if (isLoading || !data) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading pool data...</span>
      </div>
    );
  }

  const { totalTokensSold, poolTotal, poolRemaining } = data;
  const remainingPercent = poolPercentage(poolRemaining, poolTotal);
  const soldPercent = poolTotal > 0n ? 100 - remainingPercent : 0;
  const colorClass = getPoolColor(remainingPercent);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Pool Progress</span>
        <span className="font-medium">
          {formatACTX(poolRemaining, 0)} of {formatACTX(poolTotal, 0)} ACTX remaining
        </span>
      </div>
      <div className="relative">
        <div
          className={isPulsing ? 'animate-pool-pulse' : ''}
          onAnimationEnd={handlePulseEnd}
        >
          <Progress value={soldPercent} className={`h-4 ${colorClass} [&_[data-slot=progress-indicator]]:transition-all [&_[data-slot=progress-indicator]]:duration-700`} />
        </div>
        {/* Floating "-X,XXX ACTX" on purchase */}
        {floatAmount && (
          <span
            className="animate-float-up pointer-events-none absolute right-0 -top-1 text-xs font-semibold text-[var(--blessup-green)]"
            onAnimationEnd={handleFloatEnd}
          >
            -{floatAmount} ACTX
          </span>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{formatACTX(totalTokensSold, 0)} ACTX sold</span>
        <span>{soldPercent.toFixed(1)}% filled</span>
      </div>
    </div>
  );
}
