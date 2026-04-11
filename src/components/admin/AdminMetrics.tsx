'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { usePresaleState } from '@/hooks/usePresaleContract';
import { formatACTX, formatUSDC } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';

interface MetricsData {
  readonly totalFounders: number;
  readonly eliteCount: number;
  readonly legendCount: number;
  readonly sprintsCompleted: number;
  readonly purchaseCount: number;
  readonly registeredOnChain: number;
  readonly totalUsdcRaised: string;
  readonly avgPurchaseSize: string;
}

/**
 * Admin dashboard stats — on-chain presale data + DB aggregations.
 */
export function AdminMetrics() {
  const { address } = useAccount();
  const { data: presale, isLoading: isPresaleLoading } = usePresaleState();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    fetch('/api/admin/metrics', {
      headers: { 'x-admin-address': address },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setMetrics(res.data);
        } else {
          setMetricsError(res.error ?? 'Failed to load metrics');
        }
      })
      .catch((err) => {
        setMetricsError(err instanceof Error ? err.message : 'Failed to load metrics');
      })
      .finally(() => setIsMetricsLoading(false));
  }, [address]);

  const isLoading = isPresaleLoading || isMetricsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {metricsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{metricsError}</AlertDescription>
        </Alert>
      )}

      {/* Presale State Banner */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Presale State:</span>
        {presale && <PresaleStateBadge presale={presale} />}
      </div>

      {/* On-chain Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Tokens Sold"
          value={presale ? formatACTX(presale.totalTokensSold, 0) : '--'}
        />
        <MetricCard
          label="Tokens Remaining"
          value={presale ? formatACTX(presale.poolRemaining, 0) : '--'}
        />
        <MetricCard
          label="Total Founders"
          value={metrics?.totalFounders.toString() ?? '--'}
        />
        <MetricCard
          label="Elite Founders"
          value={metrics?.eliteCount.toString() ?? '--'}
        />
        <MetricCard
          label="Legend Founders"
          value={metrics?.legendCount.toString() ?? '--'}
        />
        <MetricCard
          label="Sprints Completed"
          value={metrics?.sprintsCompleted.toString() ?? '--'}
        />
        <MetricCard
          label="Purchases"
          value={metrics?.purchaseCount.toString() ?? '--'}
        />
        <MetricCard
          label="USDC Raised"
          value={metrics?.totalUsdcRaised && metrics.totalUsdcRaised !== '0'
            ? formatUSDC(BigInt(metrics.totalUsdcRaised))
            : '--'}
        />
        <MetricCard
          label="Avg Purchase Size"
          value={metrics?.avgPurchaseSize && metrics.avgPurchaseSize !== '0'
            ? `${formatACTX(BigInt(metrics.avgPurchaseSize), 0)} ACTX`
            : '--'}
        />
        <MetricCard
          label="Registered On-Chain"
          value={metrics?.registeredOnChain.toString() ?? '--'}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function PresaleStateBadge({ presale }: { readonly presale: { presaleOpen: boolean; presaleClosed: boolean; tgeTriggered: boolean; paused: boolean } }) {
  if (presale.paused) return <Badge variant="destructive">Paused</Badge>;
  if (presale.tgeTriggered) return <Badge className="bg-[var(--blessup-green)] text-white">TGE Triggered</Badge>;
  if (presale.presaleClosed) return <Badge variant="secondary">Closed</Badge>;
  if (presale.presaleOpen) return <Badge className="bg-[var(--blessup-green)] text-white">Open</Badge>;
  return <Badge variant="outline">Not Started</Badge>;
}
