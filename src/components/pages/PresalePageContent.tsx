'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageGuard } from '@/components/shared/PageGuard';
import { WalletInfo } from '@/components/wallet/WalletInfo';

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
          <div className="mx-auto max-w-3xl px-4 py-8">
            <WalletInfo />
            <div className="mt-8">
              <h1 className="mb-4 text-3xl font-bold">Genesis Presale</h1>
              <p className="text-muted-foreground">
                Purchase ACTX tokens at founder pricing after completing the Genesis Sprint.
              </p>
              {/* TODO: Phase 4 -- PoolTracker, PurchaseForm, TierBadge, ApproveButton, PurchaseButton */}
              <div className="mt-8 rounded-lg border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Purchase flow components will be implemented in Phase 4.
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
