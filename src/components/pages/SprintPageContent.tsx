'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageGuard } from '@/components/shared/PageGuard';
import { WalletInfo } from '@/components/wallet/WalletInfo';

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
          <div className="mx-auto max-w-3xl px-4 py-8">
            <WalletInfo />
            <div className="mt-8">
              <h1 className="mb-4 text-3xl font-bold">Genesis Sprint</h1>
              <p className="text-muted-foreground">
                Complete 3 Mind Renewal sessions across 3 separate days to unlock presale access.
              </p>
              {/* TODO: Phase 3 -- SprintProgress, SprintDay, SprintCTA components */}
              <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Sprint tracking components will be implemented in Phase 3.
                </p>
              </div>
            </div>
          </div>
        </PageGuard>
      </main>
      <Footer />
    </div>
  );
}
