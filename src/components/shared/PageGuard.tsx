'use client';

import { type ReactNode } from 'react';
import { useFounderStatus } from '@/hooks/useFounderStatus';
import { NetworkGuard } from '@/components/wallet/NetworkGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Loader2,
  ArrowRight,
  ShieldX,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

interface PageGuardProps {
  readonly children: ReactNode;
  readonly requireWhitelisted?: boolean;
  readonly requireSprint?: boolean;
  readonly requirePresaleOpen?: boolean;
}

/**
 * Progressive access gate for protected pages.
 *
 * Gate chain (in order):
 * 1. Wallet connected + correct chain (delegated to NetworkGuard)
 * 2. If requireWhitelisted: founderTier(address) > 0 on-chain (show rejection if not)
 * 3. If requireSprint: sprintCompleted === true (redirect to /sprint if not)
 * 4. If requirePresaleOpen: presale in OPEN state (show info if not)
 *
 * Each gate shows an informative UI rather than a blank wall.
 */
export function PageGuard({
  children,
  requireWhitelisted = false,
  requireSprint = false,
  requirePresaleOpen = false,
}: PageGuardProps) {
  return (
    <NetworkGuard>
      <PageGuardInner
        requireWhitelisted={requireWhitelisted}
        requireSprint={requireSprint}
        requirePresaleOpen={requirePresaleOpen}
      >
        {children}
      </PageGuardInner>
    </NetworkGuard>
  );
}

function PageGuardInner({
  children,
  requireWhitelisted,
  requireSprint,
  requirePresaleOpen,
}: Omit<PageGuardProps, never>) {
  const founderStatus = useFounderStatus();

  // Loading state
  if (founderStatus.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--blessup-green)]" />
          <p className="text-sm text-muted-foreground">Loading your status...</p>
        </div>
      </div>
    );
  }

  // Gate 2: Whitelist required — founderTier must be > 0 on-chain
  if (requireWhitelisted && !founderStatus.isWhitelisted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Not a Genesis Founder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This wallet is not registered as a Genesis Founder.
              Only wallets whitelisted by the BlessUP team can access
              the Genesis Presale.
            </p>
            <p className="text-sm text-muted-foreground">
              If you believe this is an error, contact the team at{' '}
              <a
                href="mailto:support@blessup.network"
                className="text-[var(--blessup-green)] underline"
              >
                support@blessup.network
              </a>
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 3: Sprint required but not completed
  if (requireSprint && !founderStatus.isQualified) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--blessup-gold)]/10">
              <ArrowRight className="h-8 w-8 text-[var(--blessup-gold)]" />
            </div>
            <CardTitle>Genesis Sprint Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete the Genesis Sprint (3 Mind Renewal sessions across 3 separate days)
              to unlock presale access.
            </p>
            <Link
              href="/sprint"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)]"
            >
              <ArrowRight className="h-4 w-4" />
              Go to Genesis Sprint
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 4: Presale must be open
  if (requirePresaleOpen && !founderStatus.canPurchase) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle>Presale Not Open</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The Genesis Presale is not currently open for purchases.
              Check back soon or follow BlessUP for updates.
            </p>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-6 text-sm font-semibold transition-colors hover:bg-accent"
            >
              Back to Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
