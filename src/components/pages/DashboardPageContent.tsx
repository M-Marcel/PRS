'use client';

import { useEffect, useRef } from 'react';
import { useFounderStatus } from '@/hooks/useFounderStatus';
import { useVesting } from '@/hooks/useVesting';
import { useClaimWrite } from '@/hooks/useClaimWrite';
import { formatACTX } from '@/lib/formatting';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { PageGuard } from '@/components/shared/PageGuard';
import { WalletInfo } from '@/components/wallet/WalletInfo';
import { TokenAmount } from '@/components/shared/TokenAmount';
import {
  VestingChart,
  ClaimButton,
  LockedBalanceCard,
  VestingSchedule,
} from '@/components/vesting';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

/**
 * Client-side content for the Vesting Dashboard page.
 * Wrapped by a server page component that sets `dynamic = 'force-dynamic'`.
 */
export function DashboardPageContent() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <PageGuard requireWhitelisted>
          <DashboardInner />
        </PageGuard>
      </main>
      <Footer />
    </div>
  );
}

function DashboardInner() {
  const founder = useFounderStatus();
  const vestingData = useVesting();
  const claimWrite = useClaimWrite();

  // Snapshot claimable amount before claim so the toast shows the correct value
  const claimAmountRef = useRef(vestingData.claimableBalance);
  useEffect(() => {
    if (vestingData.claimableBalance > 0n) {
      claimAmountRef.current = vestingData.claimableBalance;
    }
  }, [vestingData.claimableBalance]);

  // Toast on successful claim
  useEffect(() => {
    if (claimWrite.isConfirmed) {
      toast.success(`Successfully claimed ${formatACTX(claimAmountRef.current, 0)} ACTX!`);
    }
  }, [claimWrite.isConfirmed]);

  // Loading state
  if (vestingData.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--blessup-green)]" />
          <p className="text-sm text-muted-foreground">Loading vesting data...</p>
        </div>
      </div>
    );
  }

  // No tokens purchased — CTA to presale
  if (vestingData.totalPurchased === 0n) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <WalletInfo />
        <div className="mt-8">
          <h1 className="mb-4 text-3xl font-bold">Vesting Dashboard</h1>
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <p className="text-center text-muted-foreground">
                You haven&apos;t purchased any ACTX tokens yet.
                Visit the Genesis Presale to get started.
              </p>
              <Link
                href="/presale"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--blessup-green)] px-6 text-sm font-semibold text-white transition-colors hover:bg-[var(--blessup-green-dark)]"
              >
                <ArrowRight className="h-4 w-4" />
                Go to Presale
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <WalletInfo />

      <div className="mt-8 space-y-6">
        <h1 className="text-3xl font-bold">Your ACTX Holdings</h1>

        {/* Row 1: Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            title="Total Purchased"
            amount={vestingData.totalPurchased}
          />
          <StatCard
            title="Claimable Now"
            amount={vestingData.claimableBalance}
            highlight={vestingData.claimableBalance > 0n}
          />
          <StatCard
            title="Still Locked"
            amount={vestingData.lockedBalance}
          />
        </div>

        {/* Row 2: Vesting chart */}
        <VestingChart vestingData={vestingData} />

        {/* Row 3: Unified claim button */}
        <ClaimButton
          claimableBalance={vestingData.claimableBalance}
          canClaim={vestingData.canClaim}
          tgeTriggered={vestingData.tgeTriggered}
          isClaiming={claimWrite.isClaiming}
          isConfirming={claimWrite.isConfirming}
          isConfirmed={claimWrite.isConfirmed}
          claimHash={claimWrite.claimHash}
          onClaim={claimWrite.claimTokens}
        />

        {/* Claim errors */}
        {claimWrite.error && claimWrite.error !== 'Transaction cancelled' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{claimWrite.error}</AlertDescription>
          </Alert>
        )}

        {/* Row 4: Multiplier boost */}
        <LockedBalanceCard
          lockedBalance={vestingData.lockedBalance}
          totalPurchased={vestingData.totalPurchased}
          tierName={founder.tierName}
        />

        {/* Row 5: Vesting schedule table */}
        <VestingSchedule vestingData={vestingData} />
      </div>
    </div>
  );
}

function StatCard({
  title,
  amount,
  highlight = false,
}: {
  readonly title: string;
  readonly amount: bigint;
  readonly highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-[var(--blessup-green)]/30' : ''}>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <TokenAmount amount={amount} decimals={0} showIcon className="mt-1 text-xl" />
      </CardContent>
    </Card>
  );
}
