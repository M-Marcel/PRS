'use client';

import { useMemo } from 'react';
import { Countdown } from '@/components/shared/Countdown';
import { Card, CardContent } from '@/components/ui/card';

interface PresaleCountdownProps {
  readonly className?: string;
}

/**
 * Countdown to presale close date.
 * Reads the close date from NEXT_PUBLIC_PRESALE_CLOSE_DATE env var.
 * Returns null if no close date is configured or the date has passed.
 */
export function PresaleCountdown({ className = '' }: PresaleCountdownProps) {
  const { closeDate, isExpired } = useMemo(() => {
    const raw = process.env.NEXT_PUBLIC_PRESALE_CLOSE_DATE;
    if (!raw) return { closeDate: null, isExpired: true };
    const date = new Date(raw);
    if (isNaN(date.getTime())) return { closeDate: null, isExpired: true };
    return { closeDate: date, isExpired: date.getTime() <= Date.now() };
  }, []);

  if (!closeDate || isExpired) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="py-4">
        <Countdown
          targetDate={closeDate}
          label="Presale closes in"
        />
      </CardContent>
    </Card>
  );
}
