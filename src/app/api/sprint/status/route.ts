import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAddress, getErrorMessage } from '@/lib/validation';
import { PRESALE } from '@/lib/constants';
import type { ApiResponse, SprintStatus } from '@/types';

/**
 * GET /api/sprint/status?wallet=0x...
 *
 * Returns the Genesis Sprint progress for a given wallet address.
 * Queries the off-chain database for session records.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SprintStatus>>> {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    const validatedAddress = validateAddress(wallet);

    if (!validatedAddress) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing wallet address' },
        { status: 400 },
      );
    }

    const founder = await prisma.founder.findUnique({
      where: { walletAddress: validatedAddress.toLowerCase() },
      select: {
        sprintCompleted: true,
        sprintMarkedOnChain: true,
        sprintSessions: {
          orderBy: { sessionDate: 'asc' },
          select: {
            id: true,
            sessionDate: true,
            actionHash: true,
            verifiedOnChain: true,
            createdAt: true,
          },
        },
      },
    });

    if (!founder) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 },
      );
    }

    const sessions = founder.sprintSessions;
    const sessionsCompleted = sessions.length;

    const distinctDays = new Set(
      sessions.map((s) => s.sessionDate.toISOString().slice(0, 10)),
    ).size;

    const isComplete =
      sessionsCompleted >= PRESALE.REQUIRED_RENEW_SESSIONS &&
      distinctDays >= PRESALE.REQUIRED_DISTINCT_DAYS;

    // Check if there's already a session for today (UTC)
    const todayUTC = new Date().toISOString().slice(0, 10);
    const hasSessionToday = sessions.some(
      (s) => s.sessionDate.toISOString().slice(0, 10) === todayUTC,
    );
    const canDoSessionToday = !isComplete && !hasSessionToday;

    return NextResponse.json({
      success: true,
      data: {
        sessionsCompleted,
        distinctDays,
        isComplete,
        canDoSessionToday,
        markedOnChain: founder.sprintMarkedOnChain,
        sessions: sessions.map((s) => ({
          id: s.id,
          sessionDate: s.sessionDate.toISOString().slice(0, 10),
          actionHash: s.actionHash,
          verifiedOnChain: s.verifiedOnChain,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
