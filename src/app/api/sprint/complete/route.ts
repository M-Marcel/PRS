import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { keccak256, encodePacked } from 'viem';
import { prisma } from '@/lib/prisma';
import { validateAddress, getErrorMessage } from '@/lib/validation';
import { PRESALE } from '@/lib/constants';
import type { ApiResponse, SprintStatus } from '@/types';

/**
 * POST /api/sprint/complete
 * Body: { walletAddress: string }
 *
 * Records a completed RENEW session for the given wallet.
 * Validates: founder exists, session count < 3, no session today.
 * Generates an actionHash and creates a SprintSession record.
 *
 * All count/uniqueness checks are re-verified inside the transaction
 * to prevent race conditions from concurrent requests.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SprintStatus>>> {
  try {
    // Parse body with error boundary for malformed JSON
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing JSON body' },
        { status: 400 },
      );
    }

    const walletAddress =
      typeof body === 'object' && body !== null && 'walletAddress' in body
        ? (body as Record<string, unknown>).walletAddress
        : undefined;

    const validatedAddress = validateAddress(walletAddress);

    if (!validatedAddress) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing wallet address' },
        { status: 400 },
      );
    }

    const walletLower = validatedAddress.toLowerCase();

    const founder = await prisma.founder.findUnique({
      where: { walletAddress: walletLower },
      select: { id: true, sprintMarkedOnChain: true },
    });

    if (!founder) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 },
      );
    }

    // Generate action hash for BSI oracle verification (CSPRNG nonce)
    const timestamp = BigInt(Date.now());
    const nonce = BigInt(`0x${randomBytes(16).toString('hex')}`);
    const actionHash = keccak256(
      encodePacked(
        ['address', 'string', 'uint256', 'uint256'],
        [validatedAddress as `0x${string}`, 'RENEW_SESSION', timestamp, nonce],
      ),
    );

    // Today as a Date object at UTC midnight for Prisma @db.Date
    const todayUTC = new Date().toISOString().slice(0, 10);
    const todayDate = new Date(`${todayUTC}T00:00:00.000Z`);

    // All checks + insert inside a single transaction for atomicity
    const updatedSessions = await prisma.$transaction(async (tx) => {
      // Re-check session count inside the transaction to prevent races
      const existingCount = await tx.sprintSession.count({
        where: { founderId: founder.id },
      });

      if (existingCount >= PRESALE.REQUIRED_RENEW_SESSIONS) {
        throw new SessionLimitError('All sprint sessions already completed');
      }

      // Insert session (DB unique constraint on [founderId, sessionDate] catches duplicates)
      await tx.sprintSession.create({
        data: {
          founderId: founder.id,
          sessionDate: todayDate,
          actionHash,
        },
      });

      // Re-fetch authoritative session list after insert
      const sessions = await tx.sprintSession.findMany({
        where: { founderId: founder.id },
        orderBy: { sessionDate: 'asc' },
        select: {
          id: true,
          sessionDate: true,
          actionHash: true,
          verifiedOnChain: true,
          createdAt: true,
        },
      });

      const distinctDays = new Set(
        sessions.map((s) => s.sessionDate.toISOString().slice(0, 10)),
      ).size;

      const isNowComplete =
        sessions.length >= PRESALE.REQUIRED_RENEW_SESSIONS &&
        distinctDays >= PRESALE.REQUIRED_DISTINCT_DAYS;

      if (isNowComplete) {
        await tx.founder.update({
          where: { id: founder.id },
          data: {
            sprintCompleted: true,
            sprintCompletedAt: new Date(),
          },
        });
      }

      return sessions;
    });

    const sessionsCompleted = updatedSessions.length;
    const distinctDays = new Set(
      updatedSessions.map((s) => s.sessionDate.toISOString().slice(0, 10)),
    ).size;
    const isComplete =
      sessionsCompleted >= PRESALE.REQUIRED_RENEW_SESSIONS &&
      distinctDays >= PRESALE.REQUIRED_DISTINCT_DAYS;

    return NextResponse.json({
      success: true,
      data: {
        sessionsCompleted,
        distinctDays,
        isComplete,
        canDoSessionToday: false, // Just completed today's session
        markedOnChain: founder.sprintMarkedOnChain,
        sessions: updatedSessions.map((s) => ({
          id: s.id,
          sessionDate: s.sessionDate.toISOString().slice(0, 10),
          actionHash: s.actionHash,
          verifiedOnChain: s.verifiedOnChain,
          createdAt: s.createdAt.toISOString(),
        })),
      },
    });
  } catch (error: unknown) {
    // Handle session limit exceeded (thrown inside transaction)
    if (error instanceof SessionLimitError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 },
      );
    }

    // Handle Prisma unique constraint violation (race condition on same day)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, error: 'Session already recorded for today' },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}

/** Thrown inside the transaction when the session count limit is reached. */
class SessionLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionLimitError';
  }
}
