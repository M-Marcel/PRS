'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useWriteContract, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { type Address, parseAbi } from 'viem';
import { truncateAddress } from '@/lib/formatting';
import { logAdminAction } from '@/lib/adminAudit';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TransactionStatus } from '@/components/shared/TransactionStatus';
import { Loader2, ChevronLeft, ChevronRight, CheckSquare, Square, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

const presaleAbi = parseAbi(PRESALE_ABI);
const { presale: presaleAddress } = getAddresses();

interface FounderRow {
  readonly id: string;
  readonly walletAddress: string;
  readonly tier: number;
  readonly kycStatus: string;
  readonly sprintCompleted: boolean;
  readonly registeredOnChain: boolean;
  readonly sprintMarkedOnChain: boolean;
  readonly tokensPurchased: string | null;
  readonly usdcSpent: string | null;
}

interface AdminWriteOps {
  readonly qualifyAndSetTier: (wallet: Address, tier: number) => Promise<void>;
  readonly qualify: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly tierOp: { isPending: boolean; isConfirming: boolean; isConfirmed: boolean; hash: string | null };
  readonly qualifyWallet: (wallet: Address) => void;
}

interface FounderTableProps {
  readonly adminWrite: AdminWriteOps;
}

const TIER_LABELS: Record<number, string> = { 0: 'None', 1: 'Elite', 2: 'Legend' };
const KYC_COLORS: Record<string, string> = {
  approved: 'bg-[var(--blessup-green)]/10 text-[var(--blessup-green)]',
  pending: 'bg-[var(--blessup-gold)]/10 text-[var(--blessup-gold)]',
  rejected: 'bg-destructive/10 text-destructive',
};

interface BulkProgress {
  readonly action: 'register' | 'sprint';
  readonly total: number;
  readonly completed: number;
  readonly failed: number;
  readonly inProgress: boolean;
}

/**
 * Paginated founder listing with filters, row-level admin actions, and bulk operations.
 */
export function FounderTable({ adminWrite }: FounderTableProps) {
  const { address: adminAddress } = useAccount();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();
  const [founders, setFounders] = useState<readonly FounderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const registerTargetRef = useRef<string | null>(null);
  const sprintTargetRef = useRef<string | null>(null);

  // Bulk selection
  const [selectedWallets, setSelectedWallets] = useState<ReadonlySet<string>>(new Set());
  const [bulkProgress, setBulkProgress] = useState<BulkProgress | null>(null);

  // Filters
  const [tierFilter, setTierFilter] = useState('');
  const [kycFilter, setKycFilter] = useState('');
  const [sprintFilter, setSprintFilter] = useState('');

  const limit = 20;

  const fetchFounders = useCallback(async () => {
    if (!adminAddress) return;
    setIsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (tierFilter) params.set('tier', tierFilter);
    if (kycFilter) params.set('kycStatus', kycFilter);
    if (sprintFilter) params.set('sprintCompleted', sprintFilter);

    try {
      const res = await fetch(`/api/admin/founders?${params}`, {
        headers: { 'x-admin-address': adminAddress },
      });
      const data = await res.json();
      if (data.success) {
        setFounders(data.data);
        setTotal(data.meta.total);
      }
    } catch {
      toast.error('Failed to load founders');
    } finally {
      setIsLoading(false);
    }
  }, [page, tierFilter, kycFilter, sprintFilter, adminAddress]);

  useEffect(() => {
    fetchFounders();
  }, [fetchFounders]);

  // Clear selection when page/filters change
  useEffect(() => {
    setSelectedWallets(new Set());
  }, [page, tierFilter, kycFilter, sprintFilter]);

  // Refetch + audit after qualify+tier confirms (register flow)
  useEffect(() => {
    if (adminWrite.tierOp.isConfirmed && registerTargetRef.current && adminAddress) {
      logAdminAction({
        adminAddress,
        action: 'register_founder',
        targetAddress: registerTargetRef.current,
        txHash: adminWrite.tierOp.hash ?? undefined,
      });
      registerTargetRef.current = '';
      toast.success('Founder registered on-chain');
      fetchFounders();
    }
  }, [adminWrite.tierOp.isConfirmed, adminWrite.tierOp.hash, adminAddress, fetchFounders]);

  // Refetch + audit after qualify confirms (sprint/qualify flow)
  useEffect(() => {
    if (adminWrite.qualify.isConfirmed && sprintTargetRef.current && adminAddress) {
      logAdminAction({
        adminAddress,
        action: 'mark_sprint',
        targetAddress: sprintTargetRef.current,
        txHash: adminWrite.qualify.hash ?? undefined,
      });
      sprintTargetRef.current = '';
      toast.success('Wallet qualified on-chain');
      fetchFounders();
    }
  }, [adminWrite.qualify.isConfirmed, adminWrite.qualify.hash, adminAddress, fetchFounders]);

  const totalPages = Math.ceil(total / limit);

  const handleRegister = (wallet: string, tier: number) => {
    registerTargetRef.current = wallet;
    adminWrite.qualifyAndSetTier(wallet as Address, tier).catch(() => {
      // Error state is captured by useAdminWrite hook
    });
  };

  const handleMarkSprint = (wallet: string) => {
    sprintTargetRef.current = wallet;
    adminWrite.qualifyWallet(wallet as Address);
  };

  // --- Bulk selection helpers ---

  const toggleWallet = (wallet: string) => {
    setSelectedWallets((prev) => {
      const next = new Set(prev);
      if (next.has(wallet)) {
        next.delete(wallet);
      } else {
        next.add(wallet);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allWallets = founders.map((f) => f.walletAddress);
    const allSelected = allWallets.every((w) => selectedWallets.has(w));
    if (allSelected) {
      setSelectedWallets(new Set());
    } else {
      setSelectedWallets(new Set(allWallets));
    }
  };

  // Founders eligible for bulk register (not on-chain, tier > 0)
  const registerableSelected = founders.filter(
    (f) => selectedWallets.has(f.walletAddress) && !f.registeredOnChain && f.tier > 0,
  );

  // Founders eligible for bulk sprint mark (sprint done, not marked on-chain)
  const sprintableSelected = founders.filter(
    (f) => selectedWallets.has(f.walletAddress) && f.sprintCompleted && !f.sprintMarkedOnChain,
  );

  const presale = presaleAddress;

  // --- Bulk operations ---

  const handleBulkRegister = async () => {
    if (registerableSelected.length === 0 || !adminAddress) return;

    const targets = [...registerableSelected];
    const wallets = targets.map((f) => f.walletAddress as Address);
    const tiers = targets.map((f) => f.tier);
    setBulkProgress({ action: 'register', total: 2, completed: 0, failed: 0, inProgress: true });

    try {
      // Step 1: Batch qualify all wallets
      const qualifyHash = await writeContractAsync({
        address: presale,
        abi: presaleAbi,
        functionName: 'qualifyWallets',
        args: [wallets],
      });
      await waitForTransactionReceipt(config, { hash: qualifyHash });
      setBulkProgress({ action: 'register', total: 2, completed: 1, failed: 0, inProgress: true });

      // Step 2: Batch set tiers
      const tierHash = await writeContractAsync({
        address: presale,
        abi: presaleAbi,
        functionName: 'setWalletTiers',
        args: [wallets, tiers],
      });
      await waitForTransactionReceipt(config, { hash: tierHash });

      for (const founder of targets) {
        logAdminAction({
          adminAddress,
          action: 'register_founder',
          targetAddress: founder.walletAddress,
          txHash: tierHash,
        });
      }

      setBulkProgress({ action: 'register', total: 2, completed: 2, failed: 0, inProgress: false });
      toast.success(`Registered ${targets.length} founders in 2 batch transactions`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isUserRejection = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied');
      if (isUserRejection) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(`Bulk register failed: ${msg.slice(0, 80)}`);
      }
      setBulkProgress({ action: 'register', total: 2, completed: 0, failed: 1, inProgress: false });
    } finally {
      setSelectedWallets(new Set());
      fetchFounders();
    }
  };

  const handleBulkMarkSprint = async () => {
    if (sprintableSelected.length === 0 || !adminAddress) return;

    const targets = [...sprintableSelected];
    const wallets = targets.map((f) => f.walletAddress as Address);
    setBulkProgress({ action: 'sprint', total: 1, completed: 0, failed: 0, inProgress: true });

    try {
      // Single batch qualify call
      const hash = await writeContractAsync({
        address: presale,
        abi: presaleAbi,
        functionName: 'qualifyWallets',
        args: [wallets],
      });
      await waitForTransactionReceipt(config, { hash });

      for (const founder of targets) {
        logAdminAction({
          adminAddress,
          action: 'mark_sprint',
          targetAddress: founder.walletAddress,
          txHash: hash,
        });
      }

      setBulkProgress({ action: 'sprint', total: 1, completed: 1, failed: 0, inProgress: false });
      toast.success(`Qualified ${targets.length} wallets in 1 batch transaction`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isUserRejection = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('user denied');
      if (isUserRejection) {
        toast.error('Transaction cancelled by user');
      } else {
        toast.error(`Bulk qualify failed: ${msg.slice(0, 80)}`);
      }
      setBulkProgress({ action: 'sprint', total: 1, completed: 0, failed: 1, inProgress: false });
    } finally {
      setSelectedWallets(new Set());
      fetchFounders();
    }
  };

  const isBulkActive = bulkProgress?.inProgress ?? false;
  const allOnPageSelected = founders.length > 0 && founders.every((f) => selectedWallets.has(f.walletAddress));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Founders ({total})</CardTitle>
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 pt-2">
          <select
            value={tierFilter}
            onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">All Tiers</option>
            <option value="1">Elite</option>
            <option value="2">Legend</option>
          </select>
          <select
            value={kycFilter}
            onChange={(e) => { setKycFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">All KYC</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={sprintFilter}
            onChange={(e) => { setSprintFilter(e.target.value); setPage(1); }}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <option value="">All Sprint</option>
            <option value="true">Completed</option>
            <option value="false">Not Completed</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Bulk action toolbar */}
        {selectedWallets.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium">{selectedWallets.size} selected</span>
            {registerableSelected.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleBulkRegister}
                disabled={isBulkActive}
              >
                <Users className="mr-1 h-3 w-3" />
                Register {registerableSelected.length}
              </Button>
            )}
            {sprintableSelected.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={handleBulkMarkSprint}
                disabled={isBulkActive}
              >
                <Zap className="mr-1 h-3 w-3" />
                Mark Sprint {sprintableSelected.length}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto h-7 text-xs"
              onClick={() => setSelectedWallets(new Set())}
              disabled={isBulkActive}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Bulk progress */}
        {bulkProgress && (
          <div className="mb-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {bulkProgress.inProgress ? 'Processing...' : 'Complete'}{' '}
                ({bulkProgress.completed + bulkProgress.failed}/{bulkProgress.total})
              </span>
              {bulkProgress.failed > 0 && (
                <span className="text-destructive">{bulkProgress.failed} failed</span>
              )}
            </div>
            <Progress value={((bulkProgress.completed + bulkProgress.failed) / bulkProgress.total) * 100} className="h-2" />
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : founders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No founders found.</p>
        ) : (
          <div className="space-y-2">
            {/* Select all header */}
            <div className="flex items-center gap-2 px-3 py-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                disabled={isBulkActive}
                className="text-muted-foreground hover:text-foreground"
                aria-label={allOnPageSelected ? 'Deselect all' : 'Select all'}
              >
                {allOnPageSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span className="text-xs text-muted-foreground">Select all on page</span>
            </div>
            {founders.map((f) => (
              <div
                key={f.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                  selectedWallets.has(f.walletAddress) ? 'border-[var(--blessup-green)]/40 bg-[var(--blessup-green)]/5' : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleWallet(f.walletAddress)}
                    disabled={isBulkActive}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={selectedWallets.has(f.walletAddress) ? 'Deselect' : 'Select'}
                  >
                    {selectedWallets.has(f.walletAddress) ? (
                      <CheckSquare className="h-4 w-4 text-[var(--blessup-green)]" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span className="font-mono text-xs">{truncateAddress(f.walletAddress)}</span>
                  <Badge variant="outline" className="text-xs">
                    {TIER_LABELS[f.tier] ?? 'Unknown'}
                  </Badge>
                  <Badge variant="outline" className={`text-xs ${KYC_COLORS[f.kycStatus] ?? ''}`}>
                    {f.kycStatus}
                  </Badge>
                  {f.sprintCompleted && (
                    <Badge variant="outline" className="text-xs bg-[var(--blessup-green)]/10 text-[var(--blessup-green)]">
                      Sprint
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {f.tokensPurchased && (
                    <span className="text-xs text-muted-foreground">
                      {f.tokensPurchased} tokens
                    </span>
                  )}
                  {!f.registeredOnChain && f.tier > 0 && !isBulkActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleRegister(f.walletAddress, f.tier)}
                      disabled={adminWrite.qualify.isPending || adminWrite.tierOp.isPending}
                    >
                      Register
                    </Button>
                  )}
                  {f.sprintCompleted && !f.sprintMarkedOnChain && !isBulkActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleMarkSprint(f.walletAddress)}
                      disabled={adminWrite.qualify.isPending || adminWrite.qualify.isConfirming}
                    >
                      Mark Sprint
                    </Button>
                  )}
                  {f.registeredOnChain && (
                    <Badge variant="outline" className="text-xs">On-Chain</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TX status */}
        {(adminWrite.tierOp.hash || adminWrite.qualify.hash) && (
          <div className="mt-3">
            {adminWrite.tierOp.hash && (
              <TransactionStatus hash={adminWrite.tierOp.hash} label="Register Founder" />
            )}
            {adminWrite.qualify.hash && (
              <TransactionStatus hash={adminWrite.qualify.hash} label="Qualify Wallet" />
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
