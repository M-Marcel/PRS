'use client';

import { useFounderStatus } from '@/hooks/useFounderStatus';
import { usePresaleEvents } from '@/hooks/usePresaleEvents';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageGuard } from '@/components/shared/PageGuard';
import { WalletInfo } from '@/components/wallet/WalletInfo';
import { TierBadge, PoolTracker, PurchaseForm, PresaleCountdown, LiveFeed } from '@/components/presale';

/**
 * Client-side content for the Genesis Presale page.
 * Wrapped by a server page component that sets `dynamic = 'force-dynamic'`.
 */
export function PresalePageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PageGuard requireWhitelisted requireSprint>
          <PresaleInner />
        </PageGuard>
      </main>
      <Footer />
    </div>
  );
}

function PresaleInner() {
  const founder = useFounderStatus();
  // Activate real-time event listeners for Purchase + TGE events
  usePresaleEvents();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <WalletInfo />

      <div className="mt-8 space-y-6">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold">Genesis Presale</h1>
            <p className="mt-1 text-muted-foreground">
              Purchase ACTX tokens at founder pricing.
            </p>
          </div>
          <TierBadge tier={founder.tier} />
        </div>

        <PoolTracker />

        <LiveFeed />

        <PurchaseForm />

        <PresaleCountdown />
      </div>
    </div>
  );
}
