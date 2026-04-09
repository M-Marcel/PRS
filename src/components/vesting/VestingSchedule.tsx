'use client';

import { useMemo } from 'react';
import { formatACTX } from '@/lib/formatting';
import { PRESALE } from '@/lib/constants';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import type { VestingData } from '@/types';

interface VestingScheduleProps {
  readonly vestingData: VestingData;
}

interface Milestone {
  readonly label: string;
  readonly day: number;
  readonly percent: number;
  readonly amount: bigint;
  readonly isPassed: boolean;
}

/**
 * Table showing vesting milestones (TGE, Day 30, Day 60, Day 90)
 * with projected amounts. Past milestones are visually distinct.
 */
export function VestingSchedule({ vestingData }: VestingScheduleProps) {
  const { totalPurchased, currentDay, tgeTriggered } = vestingData;

  const milestones = useMemo((): readonly Milestone[] => {
    if (totalPurchased === 0n) return [];

    const tgeAmount = (totalPurchased * 25n) / 100n;

    return [
      {
        label: 'TGE Unlock',
        day: 0,
        percent: 25,
        amount: tgeAmount,
        isPassed: tgeTriggered,
      },
      {
        label: 'Day 30',
        day: 30,
        percent: 50,
        amount: (totalPurchased * 50n) / 100n,
        isPassed: currentDay >= 30,
      },
      {
        label: 'Day 60',
        day: 60,
        percent: 75,
        amount: (totalPurchased * 75n) / 100n,
        isPassed: currentDay >= 60,
      },
      {
        label: `Day ${PRESALE.VESTING_DURATION_DAYS}`,
        day: PRESALE.VESTING_DURATION_DAYS,
        percent: 100,
        amount: totalPurchased,
        isPassed: currentDay >= PRESALE.VESTING_DURATION_DAYS,
      },
    ];
  }, [totalPurchased, currentDay, tgeTriggered]);

  if (totalPurchased === 0n) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Vesting Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {milestones.map((m) => (
            <div
              key={m.label}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                m.isPassed
                  ? 'bg-[var(--blessup-green)]/5'
                  : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {m.isPassed ? (
                  <CheckCircle2 className="h-4 w-4 text-[var(--blessup-green)]" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />
                )}
                <span className={m.isPassed ? 'text-foreground' : 'text-muted-foreground'}>
                  {m.label}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">{m.percent}%</span>
                <span className={`font-medium ${m.isPassed ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {formatACTX(m.amount, 0)} ACTX
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
