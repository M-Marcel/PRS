import { create } from 'zustand';
import { PresaleState } from '@/lib/constants';

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
  kycStatus: 'pending' | 'approved' | 'rejected' | 'not_started';
  setKycStatus: (status: 'pending' | 'approved' | 'rejected' | 'not_started') => void;
}

export const useAppStore = create<AppState>((set) => ({
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
}));
