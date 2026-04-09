import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminWallet } from '@/lib/validation';

// GET: Aggregated founder and purchase metrics for the admin dashboard.
// Requires x-admin-address header for authorization.
export async function GET(request: NextRequest) {
  const adminAddress = request.headers.get('x-admin-address');
  if (!adminAddress || !isAdminWallet(adminAddress)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 403 },
    );
  }
  try {
    const [
      totalFounders,
      foundersByTier,
      sprintsCompleted,
      purchaseCount,
      registeredOnChain,
      foundersWithPurchases,
    ] = await Promise.all([
      prisma.founder.count(),
      prisma.founder.groupBy({
        by: ['tier'],
        _count: { tier: true },
      }),
      prisma.founder.count({ where: { sprintCompleted: true } }),
      prisma.founder.count({ where: { tokensPurchased: { not: null } } }),
      prisma.founder.count({ where: { registeredOnChain: true } }),
      prisma.founder.findMany({
        where: { tokensPurchased: { not: null } },
        select: { usdcSpent: true, tokensPurchased: true },
      }),
    ]);

    const tierCounts: Record<number, number> = {};
    for (const group of foundersByTier) {
      tierCounts[group.tier] = group._count.tier;
    }

    // Compute USDC raised and average purchase size from Founder records
    let totalUsdcRaised = 0n;
    let totalTokensBought = 0n;
    for (const f of foundersWithPurchases) {
      if (f.usdcSpent) {
        totalUsdcRaised += BigInt(f.usdcSpent);
      }
      if (f.tokensPurchased) {
        totalTokensBought += BigInt(f.tokensPurchased);
      }
    }
    const avgPurchaseSize = foundersWithPurchases.length > 0
      ? (totalTokensBought / BigInt(foundersWithPurchases.length)).toString()
      : '0';

    return NextResponse.json({
      success: true,
      data: {
        totalFounders,
        eliteCount: tierCounts[1] ?? 0,
        legendCount: tierCounts[2] ?? 0,
        sprintsCompleted,
        purchaseCount,
        registeredOnChain,
        totalUsdcRaised: totalUsdcRaised.toString(),
        avgPurchaseSize,
      },
    }, {
      headers: {
        'Cache-Control': 'private, max-age=10, stale-while-revalidate=30',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
