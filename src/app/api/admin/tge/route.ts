import { NextResponse } from 'next/server';

// POST: Trigger TGE (admin only)
//
// 1. Validate admin auth
// 2. Verify presale is closed
// 3. Call presale.triggerTGE() on-chain
// 4. Log AdminAction for audit trail
//
// CRITICAL: This is a one-shot irreversible action. Require confirmation.

export async function POST() {
  // TODO: Phase 6 — TGE trigger
  return NextResponse.json(
    { error: 'TGE trigger not yet implemented' },
    { status: 501 },
  );
}
