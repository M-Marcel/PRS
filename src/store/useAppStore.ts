import { create } from 'zustand';
import { PresaleState } from '@/lib/constants';
import type { RecentPurchase, KycStatus } from '@/types';

const MAX_RECENT_PURCHASES = 20;

interface AppState {
  // UI state
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;

  // Transaction queue
  pendingTxHash: string | null;
  setPendingTxHash: (hash: string | null) => void;

  // Presale state (derived from contract reads, cached here for cross-component access)
  presaleState: PresaleState;
  setPresaleState: (state: PresaleState) => void;

  // KYC state
  kycStatus: KycStatus;
  setKycStatus: (status: KycStatus) => void;

  // Live purchase feed
  recentPurchases: readonly RecentPurchase[];
  lastPurchaseTimestamp: number | null;
  addPurchase: (purchase: RecentPurchase) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // UI state
  isMobileNavOpen: false,
  setMobileNavOpen: (open) => set({ isMobileNavOpen: open }),

  // Transaction queue
  pendingTxHash: null,
  setPendingTxHash: (hash) => set({ pendingTxHash: hash }),

  // Presale state
  presaleState: PresaleState.NOT_STARTED,
  setPresaleState: (presaleState) => set({ presaleState }),

  // KYC state
  kycStatus: 'not_started',
  setKycStatus: (kycStatus) => set({ kycStatus }),

  // Live purchase feed
  recentPurchases: [],
  lastPurchaseTimestamp: null,
  addPurchase: (purchase) => {
    const current = get().recentPurchases;
    // Deduplicate by txHash
    if (current.some((p) => p.txHash === purchase.txHash)) return;
    const updated = [purchase, ...current].slice(0, MAX_RECENT_PURCHASES);
    set({ recentPurchases: updated, lastPurchaseTimestamp: purchase.timestamp });
  },
}));
