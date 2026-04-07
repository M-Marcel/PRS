'use client';

import { SprintDay } from './SprintDay';
import { Progress } from '@/components/ui/progress';
import { PRESALE } from '@/lib/constants';
import type { SprintSession } from '@/types';

interface SprintProgressProps {
  readonly sessions: ReadonlyArray<SprintSession>;
  readonly sessionsCompleted: number;
  readonly canDoSessionToday: boolean;
}

type DayStatus = 'completed' | 'today' | 'locked';

function getDayStatus(
  dayIndex: number,
  sessionsCompleted: number,
  canDoSessionToday: boolean,
): DayStatus {
  if (dayIndex < sessionsCompleted) return 'completed';
  if (dayIndex === sessionsCompleted && canDoSessionToday) return 'today';
  return 'locked';
}

export function SprintProgress({
  sessions,
  sessionsCompleted,
  canDoSessionToday,
}: SprintProgressProps) {
  const progressPercent =
    (sessionsCompleted / PRESALE.REQUIRED_RENEW_SESSIONS) * 100;

  const days = ([1, 2, 3] as const).map((dayNumber) => {
    const dayIndex = dayNumber - 1;
    const session = sessions[dayIndex] ?? null;
    const status = getDayStatus(dayIndex, sessionsCompleted, canDoSessionToday);

    return {
      dayNumber,
      status,
      sessionDate: session?.sessionDate ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <Progress value={progressPercent} className="w-full">
        <span className="text-sm font-medium">
          {sessionsCompleted} of {PRESALE.REQUIRED_RENEW_SESSIONS} sessions
        </span>
      </Progress>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {days.map((day) => (
          <SprintDay
            key={day.dayNumber}
            dayNumber={day.dayNumber}
            status={day.status}
            sessionDate={day.sessionDate}
          />
        ))}
      </div>
    </div>
  );
}
