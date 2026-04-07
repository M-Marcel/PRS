'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2,
  Play,
  CheckCircle2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

type SessionState =
  | 'idle'
  | 'inProgress'
  | 'readyToComplete'
  | 'submitting'
  | 'completed';

interface SprintCTAProps {
  readonly canDoSessionToday: boolean;
  readonly isComplete: boolean;
  readonly markedOnChain: boolean;
  readonly sessionsCompleted: number;
  readonly onSessionComplete: () => Promise<boolean>;
}

const SESSION_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function SprintCTA({
  canDoSessionToday,
  isComplete,
  markedOnChain,
  sessionsCompleted,
  onSessionComplete,
}: SprintCTAProps) {
  const [sessionState, setSessionState] = useState<SessionState>('idle');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startSession = useCallback(() => {
    // Clear any existing timer to prevent leaks
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const endTime = Date.now() + SESSION_DURATION_MS;
    endTimeRef.current = endTime;
    setSecondsRemaining(Math.ceil(SESSION_DURATION_MS / 1000));
    setSessionState('inProgress');

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setSessionState('readyToComplete');
      }
    }, 1000);
  }, []);

  const handleComplete = useCallback(async () => {
    setSessionState('submitting');
    const success = await onSessionComplete();
    setSessionState(success ? 'completed' : 'idle');
  }, [onSessionComplete]);

  // Sprint complete + on-chain confirmed
  if (isComplete && markedOnChain) {
    return (
      <Card className="border-[var(--blessup-green)]/30 bg-[var(--blessup-green)]/5">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-[var(--blessup-green)]" />
          <div>
            <h3 className="text-lg font-bold">Genesis Sprint Complete!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You&apos;ve completed all 3 Mind Renewal sessions. Your presale access is unlocked.
            </p>
          </div>
          <Link
            href="/presale"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)]"
          >
            <ArrowRight className="h-4 w-4" />
            Proceed to Presale
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Sprint complete off-chain, waiting for admin on-chain marking
  if (isComplete && !markedOnChain) {
    return (
      <Card className="border-[var(--blessup-gold)]/30 bg-[var(--blessup-gold)]/5">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[var(--blessup-gold)]" />
          <div>
            <h3 className="text-lg font-bold">Pending Verification</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your sprint is complete! Awaiting on-chain verification.
              This usually takes a few minutes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Session just completed (before page refetch updates isComplete)
  if (sessionState === 'completed') {
    return (
      <Card className="border-[var(--blessup-green)]/30">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--blessup-green)]" />
          <div>
            <h3 className="text-lg font-bold">Session Recorded!</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Day {sessionsCompleted} complete. Come back tomorrow for your next session.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Session in progress — show content + timer
  if (sessionState === 'inProgress') {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--blessup-green)]" />
            Mind Renewal Session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted/50 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Take a moment to center yourself. Focus on gratitude,
              positive intention, and your vision for the future.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Full RENEW media experience coming soon.
            </p>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex items-baseline gap-1 font-mono text-4xl font-bold tabular-nums">
              <span>{String(minutes).padStart(2, '0')}</span>
              <span className="animate-pulse text-muted-foreground">:</span>
              <span>{String(seconds).padStart(2, '0')}</span>
            </div>
            <p className="text-xs text-muted-foreground">remaining</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ready to complete — timer finished
  if (sessionState === 'readyToComplete') {
    return (
      <Card className="border-[var(--blessup-green)]/30">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <CheckCircle2 className="h-10 w-10 text-[var(--blessup-green)]" />
          <div>
            <h3 className="text-lg font-bold">Session Complete</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Well done! Record your session to mark today&apos;s progress.
            </p>
          </div>
          <Button
            onClick={handleComplete}
            className="bg-[var(--blessup-green)] text-white hover:bg-[var(--blessup-green-dark)]"
          >
            Complete Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Submitting
  if (sessionState === 'submitting') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--blessup-green)]" />
          <p className="text-sm text-muted-foreground">Recording your session...</p>
        </CardContent>
      </Card>
    );
  }

  // Idle — show start button
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Session</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Complete a 5-minute Mind Renewal action to mark today&apos;s progress.
        </p>
        <Button
          onClick={startSession}
          disabled={!canDoSessionToday}
          className="w-full bg-[var(--blessup-green)] text-white hover:bg-[var(--blessup-green-dark)] disabled:opacity-50"
        >
          <Play className="mr-2 h-4 w-4" />
          Start RENEW Session
        </Button>
        {!canDoSessionToday && sessionsCompleted > 0 && !isComplete && (
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ve already completed today&apos;s session. Come back tomorrow!
          </p>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Sessions must be on separate calendar days (UTC).
        </p>
      </CardContent>
    </Card>
  );
}
