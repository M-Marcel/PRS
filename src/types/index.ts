import type { Address } from 'viem';

// === API Response Envelope ===

export interface ApiResponse<T> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
}

// === KYC Types ===

export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export interface KycInitiateRequest {
  readonly walletAddress: string;
}

export interface KycInitiateResponse {
  readonly inquiryUrl: string;
  readonly inquiryId: string;
  readonly alreadyApproved: boolean;
}

export interface KycWebhookPayload {
  readonly data: {
    readonly id: string;
    readonly type: string;
    readonly attributes: {
      readonly status: string;
      readonly 'reference-id': string;
    };
  };
}

export interface KycStatusResponse {
  readonly walletAddress: string;
  readonly kycStatus: KycStatus;
  readonly kycCompletedAt: string | null;
}

// === Founder Types ===

export interface FounderInfo {
  readonly walletAddress: Address;
  readonly tier: number;
  readonly kycStatus: KycStatus;
  readonly sprintCompleted: boolean;
  readonly registeredOnChain: boolean;
  readonly tokensPurchased: string | null;
  readonly usdcSpent: string | null;
}

export interface FounderStatus {
  readonly isConnected: boolean;
  readonly isCorrectChain: boolean;
  readonly tier: number;
  readonly tierName: string;
  readonly isWhitelisted: boolean;
  readonly isElite: boolean;
  readonly isLegend: boolean;
  readonly tierPrice: bigint;
  readonly sprintCompleted: boolean;
  readonly hasPurchased: boolean;
  readonly canPurchase: boolean;
  readonly tokensPurchased: bigint;
  readonly spendCapRemaining: bigint;
  readonly lockedBalance: bigint;
  readonly claimableBalance: bigint;
  readonly isLoading: boolean;
}

// === Presale Types ===

export interface PresaleStats {
  readonly totalTokensSold: bigint;
  readonly totalTokensAvailable: bigint;
  readonly remainingTokens: bigint;
  readonly presaleOpen: boolean;
  readonly presaleClosed: boolean;
  readonly tgeTriggered: boolean;
  readonly paused: boolean;
}

// === Transaction Types ===

export type TransactionState = 'idle' | 'preparing' | 'pending' | 'confirming' | 'confirmed' | 'failed';

export interface TransactionInfo {
  readonly state: TransactionState;
  readonly hash: string | null;
  readonly error: string | null;
}

// === Sprint Types ===

export interface SprintSession {
  readonly id: string;
  readonly sessionDate: string;
  readonly actionHash: string;
  readonly verifiedOnChain: boolean;
  readonly createdAt: string;
}

export interface SprintStatus {
  readonly sessionsCompleted: number;
  readonly distinctDays: number;
  readonly isComplete: boolean;
  readonly canDoSessionToday: boolean;
  readonly markedOnChain: boolean;
  readonly sessions: ReadonlyArray<SprintSession>;
}

// === Vesting Types ===

export interface VestingData {
  readonly totalPurchased: bigint;
  readonly lockedBalance: bigint;
  readonly claimableBalance: bigint;
  readonly vestedBalance: bigint;
  readonly hasClaimed25: boolean;
  readonly tgeTriggered: boolean;
  readonly tgeAmount: bigint;
  readonly linearVestTotal: bigint;
  readonly dailyVestRate: bigint;
  readonly currentDay: number;
  readonly percentVested: number;
  readonly totalClaimed: bigint;
  readonly canClaimTGE: boolean;
  readonly canClaimVested: boolean;
  readonly isFullyVested: boolean;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

// === Live Feed Types ===

export interface RecentPurchase {
  readonly buyer: string;
  readonly amount: bigint;
  readonly tier: number;
  readonly txHash: string;
  readonly timestamp: number;
  readonly usdcPaid: bigint;
}

export interface EnhancedPresaleStats {
  readonly presaleOpen: boolean;
  readonly presaleClosed: boolean;
  readonly tgeTriggered: boolean;
  readonly totalTokensSold: string;
  readonly totalTokensAvailable: string;
  readonly remainingTokens: string;
  readonly totalUSDCRaised: string;
  readonly totalPurchases: number;
  readonly elitePurchases: number;
  readonly legendPurchases: number;
  readonly averagePurchaseSize: string;
  readonly timeRemaining: number | null;
}

// === Navigation Types ===

export interface NavLink {
  readonly href: string;
  readonly label: string;
  readonly requiresAuth: boolean;
}
