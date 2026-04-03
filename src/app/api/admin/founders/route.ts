import { NextResponse } from 'next/server';

// GET: List all founders + status
//
// Returns: Array of { walletAddress, tier, kycStatus, sprintCompleted, tokensPurchased, ... }
// Query params: ?page=1&limit=50&tier=1&kycStatus=approved

export async function GET() {
  // TODO: Phase 6 — Founder listing from database
  return NextResponse.json(
    { error: 'Founder listing not yet implemented' },
    { status: 501 },
  );
}
