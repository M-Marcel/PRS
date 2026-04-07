'use client';

import { useAccount } from 'wagmi';
import { Loader2, AlertCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageGuard } from '@/components/shared/PageGuard';
import { WalletInfo } from '@/components/wallet/WalletInfo';
import { SprintProgress, SprintCTA } from '@/components/sprint';
import { useSprintStatus } from '@/hooks/useSprintStatus';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Client-side content for the Genesis Sprint page.
 * Wrapped by a server page component that sets `dynamic = 'force-dynamic'`.
 */
export function SprintPageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PageGuard requireWhitelisted>
          <SprintContent />
        </PageGuard>
      </main>
      <Footer />
    </div>
  );
}

function SprintContent() {
  const { address } = useAccount();
  const { sprintStatus, isLoading, error, completeSession } =
    useSprintStatus(address);

  if (isLoading && !sprintStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--blessup-green)]" />
          <p className="text-sm text-muted-foreground">Loading sprint progress...</p>
        </div>
      </div>
    );
  }

  if (error && !sprintStatus) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="flex flex-col items-center gap-4 p-6">
            <AlertCircle className="h-10 w-10 text-destructive" />
            <div>
              <h3 className="text-lg font-bold">Error Loading Sprint</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <WalletInfo />
      <div className="mt-8 space-y-8">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Genesis Sprint</h1>
          <p className="text-muted-foreground">
            Complete 3 Mind Renewal sessions across 3 separate days to unlock presale access.
          </p>
        </div>

        <SprintProgress
          sessions={sprintStatus?.sessions ?? []}
          sessionsCompleted={sprintStatus?.sessionsCompleted ?? 0}
          canDoSessionToday={sprintStatus?.canDoSessionToday ?? false}
        />

        <SprintCTA
          canDoSessionToday={sprintStatus?.canDoSessionToday ?? false}
          isComplete={sprintStatus?.isComplete ?? false}
          markedOnChain={sprintStatus?.markedOnChain ?? false}
          sessionsCompleted={sprintStatus?.sessionsCompleted ?? 0}
          onSessionComplete={completeSession}
        />
      </div>
    </div>
  );
}
