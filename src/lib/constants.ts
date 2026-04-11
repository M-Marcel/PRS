import { parseUnits } from 'viem';

// === PRESALE PARAMETERS ===
export const PRESALE = {
  // Token allocation
  TOTAL_POOL: parseUnits('3000000', 18),        // 3,000,000 ACTX
  PER_WALLET_CAP: parseUnits('10000', 18),       // 10,000 ACTX per founder

  // Pricing (USDC has 6 decimals)
  ELITE_PRICE: parseUnits('0.07', 6),            // $0.07 per ACTX
  LEGEND_PRICE: parseUnits('0.05', 6),           // $0.05 per ACTX
  PUBLIC_PRICE: parseUnits('0.10', 6),           // $0.10 (display only)

  // Caps in USDC
  ELITE_MAX_USDC: parseUnits('700', 6),          // 10,000 x $0.07
  LEGEND_MAX_USDC: parseUnits('500', 6),         // 10,000 x $0.05

  // Vesting
  TGE_UNLOCK_PCT: 25,                            // 25% unlocked at TGE
  VESTING_DURATION_DAYS: 90,                     // 75% linear over 90 days
  MULTIPLIER_BOOST: 0.1,                         // +0.1x while tokens locked

  // Timing
  PRESALE_DURATION_DAYS: 7,
  PRE_LAUNCH_BUFFER_HOURS: 48,
  UPGRADE_CUTOFF_HOURS: 24,                      // Before presale opens

  // Participants
  MAX_PARTICIPANTS: 300,                          // Per Final Blueprint

  // Genesis Sprint
  REQUIRED_RENEW_SESSIONS: 3,
  REQUIRED_DISTINCT_DAYS: 3,
} as const;

// === TIER ENUM (must match contract) ===
export enum FounderTier {
  NONE = 0,
  ELITE = 1,
  LEGEND = 2,
}

// === PRESALE STATES ===
export enum PresaleState {
  NOT_STARTED = 'NOT_STARTED',
  SPRINT_PHASE = 'SPRINT_PHASE',       // Founders completing Genesis Sprint
  OPEN = 'OPEN',                        // Presale window active
  CLOSED = 'CLOSED',                    // Presale ended, awaiting TGE
  TGE_TRIGGERED = 'TGE_TRIGGERED',     // 25% claimable
  VESTING = 'VESTING',                  // Linear vest in progress
  COMPLETED = 'COMPLETED',              // All tokens fully vested
}
