'use client';

import { useWatchContractEvent } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { parseAbi, zeroAddress } from 'viem';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import type { RecentPurchase } from '@/types';

const presaleAbi = parseAbi(PRESALE_ABI);
const ZERO_ADDRESS = zeroAddress;

/**
 * Persist a detected TokensPurchased event to the database.
 * Fire-and-forget — failures are non-fatal since the event is already
 * displayed in the UI via Zustand.
 */
function persistEvent(purchase: RecentPurchase, blockNumber: bigint): void {
  fetch('/api/presale/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      txHash: purchase.txHash,
      buyer: purchase.buyer,
      tokenAmount: purchase.amount.toString(),
      usdcAmount: purchase.usdcPaid.toString(),
      tier: purchase.tier,
      blockNumber: blockNumber.toString(),
      eventType: 'purchase',
    }),
  }).catch(() => {
    // Non-fatal: DB logging is supplementary
  });
}

interface UsePresaleEventsOptions {
  readonly enabled?: boolean;
}

/**
 * Watch for real-time TokensPurchased and TGETriggered events on the presale contract.
 *
 * - TokensPurchased events: added to the Zustand live feed + persisted to DB
 *   Event args: (buyer, tier, usdcAmount, tokenAmount, poolRemaining)
 * - TGETriggered events: toast notification + redirect to /dashboard
 */
export function usePresaleEvents({ enabled = true }: UsePresaleEventsOptions = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const presaleAddress = getAddresses().presale;
  const isDeployed = presaleAddress !== ZERO_ADDRESS;
  const shouldWatch = enabled && isDeployed;

  // Watch TokensPurchased events (was 'Purchase' in old contract)
  useWatchContractEvent({
    address: presaleAddress,
    abi: presaleAbi,
    eventName: 'TokensPurchased',
    enabled: shouldWatch,
    pollingInterval: 5_000,
    onLogs(logs) {
      for (const log of logs) {
        const { args } = log;
        if (!args || !('buyer' in args) || !args.buyer) continue;
        if (!log.transactionHash) continue;

        // TokensPurchased(buyer, tier, usdcAmount, tokenAmount, poolRemaining)
        const buyer = args.buyer as string;
        const tier = (args as Record<string, unknown>).tier as number | undefined;
        const usdcAmount = (args as Record<string, unknown>).usdcAmount as bigint | undefined;
        const tokenAmount = (args as Record<string, unknown>).tokenAmount as bigint | undefined;
        if (tokenAmount == null) continue;

        const purchase: RecentPurchase = {
          buyer,
          amount: tokenAmount,
          tier: tier ?? 0,
          txHash: log.transactionHash ?? '',
          timestamp: Date.now(),
          usdcPaid: usdcAmount ?? 0n,
        };

        useAppStore.getState().addPurchase(purchase);

        // Persist to DB (fire-and-forget)
        if (log.blockNumber != null) {
          persistEvent(purchase, log.blockNumber);
        }

        // Invalidate React Query caches so pool data refreshes
        queryClient.invalidateQueries({ queryKey: ['readContracts'] });
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
      }
    },
  });

  // Watch TGETriggered events
  useWatchContractEvent({
    address: presaleAddress,
    abi: presaleAbi,
    eventName: 'TGETriggered',
    enabled: shouldWatch,
    pollingInterval: 5_000,
    onLogs() {
      toast.success('TGE has been triggered! Your tokens are now claimable.', {
        duration: 5000,
      });
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    },
  });

  const recentPurchases = useAppStore((s) => s.recentPurchases);
  const lastPurchaseTimestamp = useAppStore((s) => s.lastPurchaseTimestamp);

  return { recentPurchases, lastPurchaseTimestamp, isDeployed };
}
