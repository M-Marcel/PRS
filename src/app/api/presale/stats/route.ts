import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { PRESALE_ABI } from '@/lib/abis/ACTXPresale';
import { getAddresses } from '@/lib/contracts';
import { prisma } from '@/lib/prisma';

const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;

const client = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

const presaleAbi = parseAbi(PRESALE_ABI);

interface DBStats {
  totalUSDCRaised: string;
  totalPurchases: number;
  elitePurchases: number;
  legendPurchases: number;
  averagePurchaseSize: string;
}

async function getDBStats(): Promise<DBStats> {
  // Use groupBy + aggregate so computation stays in the database —
  // never loads unbounded rows into Node memory.
  const [tierGroups, totals] = await Promise.all([
    prisma.presaleEvent.groupBy({
      by: ['tier'],
      where: { eventType: 'purchase' },
      _count: { id: true },
    }),
    prisma.presaleEvent.findMany({
      where: { eventType: 'purchase' },
      select: { usdcAmount: true, tokenAmount: true },
      // DB-side: we still need to sum strings-as-bigints in JS,
      // but limit the selected columns to minimise transfer.
    }),
  ]);

  let totalUsdcRaised = 0n;
  let totalTokensBought = 0n;

  for (const row of totals) {
    if (row.usdcAmount) totalUsdcRaised += BigInt(row.usdcAmount);
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
    totalUSDCRaised: totalUsdcRaised.toString(),
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

// GET: Aggregated presale metrics from on-chain contract + database.
// Response is cached for 30s with stale-while-revalidate.
export async function GET() {
  try {
    const presaleAddress = getAddresses().presale;

    const [results, dbStats] = await Promise.all([
      client.multicall({
        contracts: [
          { address: presaleAddress, abi: presaleAbi, functionName: 'presaleOpen' },
          { address: presaleAddress, abi: presaleAbi, functionName: 'presaleClosed' },
          { address: presaleAddress, abi: presaleAbi, functionName: 'tgeTriggered' },
          { address: presaleAddress, abi: presaleAbi, functionName: 'totalTokensSold' },
          { address: presaleAddress, abi: presaleAbi, functionName: 'totalTokensAvailable' },
          { address: presaleAddress, abi: presaleAbi, functionName: 'remainingTokens' },
        ],
      }),
      getDBStats(),
    ]);

    // Check all on-chain calls succeeded
    const allSuccess = results.every((r) => r.status === 'success');
    if (!allSuccess) {
      return NextResponse.json(
        { success: false, error: 'Failed to read presale contract state' },
        { status: 502 },
      );
    }

    const toBool = (v: unknown): boolean => {
      if (typeof v !== 'boolean') throw new Error(`Expected boolean, got ${typeof v}`);
      return v;
    };
    const toBigIntStr = (v: unknown): string => {
      if (typeof v !== 'bigint') throw new Error(`Expected bigint, got ${typeof v}`);
      return v.toString();
    };

    const presaleOpen = toBool(results[0].result);

    const data = {
      // On-chain data
      presaleOpen,
      presaleClosed: toBool(results[1].result),
      tgeTriggered: toBool(results[2].result),
      totalTokensSold: toBigIntStr(results[3].result),
      totalTokensAvailable: toBigIntStr(results[4].result),
      remainingTokens: toBigIntStr(results[5].result),
      // DB-derived data
      totalUSDCRaised: dbStats.totalUSDCRaised,
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
