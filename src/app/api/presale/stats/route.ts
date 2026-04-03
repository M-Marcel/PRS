import { NextResponse } from 'next/server';

// GET: Aggregated presale metrics
//
// Returns: { totalSold, remaining, founderCount, purchases, avgPurchaseSize }

export async function GET() {
  // TODO: Phase 4 — Aggregated presale stats from contract + database
  return NextResponse.json(
    { error: 'Presale stats not yet implemented' },
    { status: 501 },
  );
}
