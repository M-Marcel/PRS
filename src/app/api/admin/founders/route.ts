import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';

// GET: Paginated list of founders with optional filters.
// Query params: page (default 1), limit (default 50, max 100), tier, kycStatus, sprintCompleted
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '50')));
    const tierParam = searchParams.get('tier');
    const kycStatus = searchParams.get('kycStatus');
    const sprintCompleted = searchParams.get('sprintCompleted');
    const hasPurchased = searchParams.get('hasPurchased');

    const where: Prisma.FounderWhereInput = {};

    if (tierParam !== null && tierParam !== '') {
      where.tier = Number(tierParam);
    }
    if (kycStatus !== null && kycStatus !== '') {
      where.kycStatus = kycStatus;
    }
    if (sprintCompleted !== null) {
      where.sprintCompleted = sprintCompleted === 'true';
    }
    if (hasPurchased === 'true') {
      where.tokensPurchased = { not: null };
    } else if (hasPurchased === 'false') {
      where.tokensPurchased = null;
    }

    const [founders, total] = await Promise.all([
      prisma.founder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddress: true,
          tier: true,
          kycStatus: true,
          sprintCompleted: true,
          registeredOnChain: true,
          sprintMarkedOnChain: true,
          tokensPurchased: true,
          usdcSpent: true,
          createdAt: true,
        },
      }),
      prisma.founder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: founders,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
