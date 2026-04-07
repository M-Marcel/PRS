'use client';

import { CheckCircle2, Lock, Circle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type DayStatus = 'completed' | 'today' | 'locked';

interface SprintDayProps {
  readonly dayNumber: 1 | 2 | 3;
  readonly status: DayStatus;
  readonly sessionDate: string | null;
}

const STATUS_CONFIG: Record<
  DayStatus,
  { icon: typeof CheckCircle2; badge: string; badgeVariant: 'default' | 'secondary' | 'outline'; iconClass: string }
> = {
  completed: {
    icon: CheckCircle2,
    badge: 'Done',
    badgeVariant: 'default',
    iconClass: 'text-[var(--blessup-green)]',
  },
  today: {
    icon: Circle,
    badge: 'Today',
    badgeVariant: 'secondary',
    iconClass: 'text-[var(--blessup-gold)] animate-pulse',
  },
  locked: {
    icon: Lock,
    badge: 'Locked',
    badgeVariant: 'outline',
    iconClass: 'text-muted-foreground',
  },
};

export function SprintDay({ dayNumber, status, sessionDate }: SprintDayProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Card
      className={cn(
        'flex-1 transition-all',
        status === 'today' && 'border-[var(--blessup-gold)]/50 ring-1 ring-[var(--blessup-gold)]/20',
        status === 'completed' && 'border-[var(--blessup-green)]/30',
      )}
    >
      <CardContent className="flex flex-col items-center gap-3 p-4 text-center">
        <Icon className={cn('h-8 w-8', config.iconClass)} />
        <div>
          <p className="text-sm font-semibold">Day {dayNumber}</p>
          {sessionDate && (
            <p className="mt-1 text-xs text-muted-foreground">{sessionDate}</p>
          )}
        </div>
        <Badge variant={config.badgeVariant}>{config.badge}</Badge>
      </CardContent>
    </Card>
  );
}
