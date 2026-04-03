'use client';

import { useState, useEffect } from 'react';

interface CountdownProps {
  readonly targetDate: Date;
  readonly label?: string;
  readonly onComplete?: () => void;
  readonly className?: string;
}

interface TimeRemaining {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly isComplete: boolean;
}

function calculateTimeRemaining(target: Date): TimeRemaining {
  const diff = target.getTime() - Date.now();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isComplete: false,
  };
}

/**
 * Generic countdown timer that ticks every second.
 * Calls onComplete when the target date is reached.
 */
export function Countdown({ targetDate, label, onComplete, className = '' }: CountdownProps) {
  const [time, setTime] = useState<TimeRemaining>(() => calculateTimeRemaining(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining(targetDate);
      setTime(remaining);

      if (remaining.isComplete) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onComplete]);

  if (time.isComplete) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {label && (
        <p className="text-sm text-muted-foreground">{label}</p>
      )}
      <div className="flex items-center gap-3">
        <TimeUnit value={time.days} label="Days" />
        <Separator />
        <TimeUnit value={time.hours} label="Hours" />
        <Separator />
        <TimeUnit value={time.minutes} label="Min" />
        <Separator />
        <TimeUnit value={time.seconds} label="Sec" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { readonly value: number; readonly label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Separator() {
  return <span className="text-xl font-bold text-muted-foreground">:</span>;
}
