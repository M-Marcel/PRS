import { NextResponse } from 'next/server';

// GET: Sprint progress for a wallet
// Query: ?wallet=0x...
//
// Returns: { sessionsCompleted: number, distinctDays: number, isComplete: boolean, sessions: SprintSession[] }

export async function GET() {
  // TODO: Phase 3 — Sprint status from database
  return NextResponse.json(
    { error: 'Sprint status not yet implemented' },
    { status: 501 },
  );
}
