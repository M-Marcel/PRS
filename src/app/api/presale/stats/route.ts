import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { GENESIS_PRESALE_ABI } from '@/lib/abis/GenesisPresale';
import { PRESALE_VESTING_ABI } from '@/lib/abis/PresaleVesting';
import { getAddresses } from '@/lib/contracts';
import { prisma } from '@/lib/prisma';

const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;

function getClient() {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
  if (!rpcUrl) throw new Error('NEXT_PUBLIC_RPC_URL is not configured');
  return createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
}

const genesisPresaleAbi = parseAbi(GENESIS_PRESALE_ABI);
const presaleVestingAbi = parseAbi(PRESALE_VESTING_ABI);

interface DBStats {
  totalPurchases: number;
  elitePurchases: number;
  legendPurchases: number;
  averagePurchaseSize: string;
}

async function getDBStats(): Promise<DBStats> {
  const [tierGroups, totals] = await Promise.all([
    prisma.presaleEvent.groupBy({
      by: ['tier'],
      where: { eventType: 'purchase' },
      _count: { id: true },
    }),
    prisma.presaleEvent.findMany({
      where: { eventType: 'purchase' },
      select: { tokenAmount: true },
    }),
  ]);

  let totalTokensBought = 0n;

  for (const row of totals) {
    if (row.tokenAmount) totalTokensBought += BigInt(row.tokenAmount);
  }

  let elitePurchases = 0;
  let legendPurchases = 0;
  let totalPurchases = 0;

  for (const group of tierGroups) {
    totalPurchases += group._count.id;
    if (group.tier === 1) elitePurchases = group._count.id;
    if (group.tier === 2) legendPurchases = group._count.id;
  }

  const avgPurchaseSize = totalPurchases > 0
    ? (totalTokensBought / BigInt(totalPurchases)).toString()
    : '0';

  return {
    totalPurchases,
    elitePurchases,
    legendPurchases,
    averagePurchaseSize: avgPurchaseSize,
  };
}

function computeTimeRemaining(presaleOpen: boolean): number | null {
  if (!presaleOpen) return null;
  const closeDate = process.env.NEXT_PUBLIC_PRESALE_CLOSE_DATE;
  if (!closeDate) return null;
  const closeDateMs = new Date(closeDate).getTime();
  if (!Number.isFinite(closeDateMs)) return null;
  const remaining = Math.floor((closeDateMs - Date.now()) / 1000);
  return Math.max(0, remaining);
}

// GET: Aggregated presale metrics from on-chain getPresaleStats() + database.
// Response is cached for 30s with stale-while-revalidate.
export async function GET() {
  try {
    const genesisPresaleAddress = getAddresses().genesisPresale;
    const presaleVestingAddress = getAddresses().presaleVesting;

    const [statsResult, tgeResult, dbStats] = await Promise.all([
      getClient().readContract({
        address: genesisPresaleAddress,
        abi: genesisPresaleAbi,
        functionName: 'getPresaleStats',
      }),
      getClient().readContract({
        address: presaleVestingAddress,
        abi: presaleVestingAbi,
        functionName: 'tgeTriggered',
      }),
      getDBStats(),
    ]);

    const stats = statsResult as readonly [bigint, bigint, bigint, bigint, boolean, bigint, bigint, bigint];
    const poolTotal        = stats[0];
    const poolRemaining    = stats[1];
    const totalUsdcRaised  = stats[2];
    const totalParticipants = stats[3];
    const presaleOpen      = stats[4];
    const tgeTriggered = tgeResult as boolean;
    const totalTokensSold = poolTotal - poolRemaining;

    const data = {
      presaleOpen,
      presaleClosed: !presaleOpen,
      tgeTriggered,
      poolTotal: poolTotal.toString(),
      poolRemaining: poolRemaining.toString(),
      totalTokensSold: totalTokensSold.toString(),
      totalUsdcRaised: totalUsdcRaised.toString(),
      totalParticipants: Number(totalParticipants),
      totalPurchases: dbStats.totalPurchases,
      elitePurchases: dbStats.elitePurchases,
      legendPurchases: dbStats.legendPurchases,
      averagePurchaseSize: dbStats.averagePurchaseSize,
      timeRemaining: computeTimeRemaining(presaleOpen),
    };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
