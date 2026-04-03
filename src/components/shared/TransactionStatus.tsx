'use client';

import { useWaitForTransactionReceipt } from 'wagmi';
import { type Address } from 'viem';
import { TARGET_CHAIN } from '@/lib/chains';
import { truncateAddress } from '@/lib/formatting';
import { Card, CardContent } from '@/components/ui/card';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import type { TransactionState } from '@/types';

interface TransactionStatusProps {
  readonly hash: string | null;
  readonly label?: string;
  readonly onConfirmed?: () => void;
}

function getBlockExplorerTxUrl(hash: string): string {
  const explorer = TARGET_CHAIN.blockExplorers?.default;
  if (!explorer) return '#';
  return `${explorer.url}/tx/${hash}`;
}

/**
 * Displays the current state of a pending blockchain transaction.
 * Automatically polls for confirmation and shows success/failure.
 */
export function TransactionStatus({ hash, label, onConfirmed }: TransactionStatusProps) {
  const { data: receipt, isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: hash as Address | undefined,
    query: {
      enabled: Boolean(hash),
    },
  });

  // Call onConfirmed when we get a successful receipt
  if (isSuccess && receipt && onConfirmed) {
    // Schedule for next tick to avoid state updates during render
    setTimeout(onConfirmed, 0);
  }

  if (!hash) return null;

  const state: TransactionState = isLoading
    ? 'confirming'
    : isSuccess
      ? 'confirmed'
      : isError
        ? 'failed'
        : 'pending';

  return (
    <Card className={getCardClass(state)}>
      <CardContent className="flex items-center gap-3 py-3">
        <TransactionIcon state={state} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {label ?? 'Transaction'}{' '}
            <StatusLabel state={state} />
          </p>
          <a
            href={getBlockExplorerTxUrl(hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {truncateAddress(hash)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionIcon({ state }: { readonly state: TransactionState }) {
  switch (state) {
    case 'confirming':
    case 'pending':
    case 'preparing':
      return <Loader2 className="h-5 w-5 animate-spin text-[var(--blessup-green)]" />;
    case 'confirmed':
      return <CheckCircle2 className="h-5 w-5 text-[var(--blessup-green)]" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return null;
  }
}

function StatusLabel({ state }: { readonly state: TransactionState }) {
  switch (state) {
    case 'preparing':
      return <span className="text-muted-foreground">preparing...</span>;
    case 'pending':
      return <span className="text-muted-foreground">pending...</span>;
    case 'confirming':
      return <span className="text-[var(--blessup-green)]">confirming...</span>;
    case 'confirmed':
      return <span className="text-[var(--blessup-green)]">confirmed</span>;
    case 'failed':
      return <span className="text-destructive">failed</span>;
    default:
      return null;
  }
}

function getCardClass(state: TransactionState): string {
  switch (state) {
    case 'confirmed':
      return 'border-[var(--blessup-green)]/30';
    case 'failed':
      return 'border-destructive/30';
    default:
      return '';
  }
}
