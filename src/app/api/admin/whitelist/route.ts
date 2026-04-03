import { NextResponse } from 'next/server';

// POST: Register founder on-chain
// Body: { walletAddress: string, tier: 1 | 2 }
//
// 1. Validate admin auth (wallet signature or API key)
// 2. Call presale.registerFounder(wallet, tier) on-chain
// 3. Update Founder record in database
// 4. Log AdminAction for audit trail

export async function POST() {
  // TODO: Phase 6 — Admin whitelist management
  return NextResponse.json(
    { error: 'Admin whitelist not yet implemented' },
    { status: 501 },
  );
}
