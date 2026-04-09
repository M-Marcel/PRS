import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { prisma } from '@/lib/prisma';
import { validateAddress } from '@/lib/validation';

const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;

const client = createPublicClient({
  chain,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;
const NUMERIC_STRING_REGEX = /^\d+$/;

interface EventPayload {
  readonly txHash: string;
  readonly buyer: string;
  readonly tokenAmount: string;
  readonly usdcAmount: string;
  readonly tier: number;
  readonly blockNumber: string;
  readonly eventType: string;
}

/**
 * POST: Log a detected on-chain presale event to the database.
 *
 * Verifies the transaction exists on-chain via eth_getTransactionReceipt
 * before writing, preventing fake event injection.
 *
 * Idempotent via txHash unique constraint.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EventPayload;

    // Validate txHash format (full 66-char hex)
    if (!body.txHash || !TX_HASH_REGEX.test(body.txHash)) {
      return NextResponse.json(
        { success: false, error: 'Invalid txHash: must be 0x-prefixed 64-char hex' },
        { status: 400 },
      );
    }

    const buyerAddress = validateAddress(body.buyer);
    if (!buyerAddress) {
      return NextResponse.json(
        { success: false, error: 'Invalid buyer address' },
        { status: 400 },
      );
    }

    if (!body.tokenAmount || !NUMERIC_STRING_REGEX.test(body.tokenAmount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid tokenAmount: must be a numeric string' },
        { status: 400 },
      );
    }

    if (!body.blockNumber || !NUMERIC_STRING_REGEX.test(body.blockNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid blockNumber: must be a numeric string' },
        { status: 400 },
      );
    }

    // Verify the transaction exists on-chain
    const receipt = await client.getTransactionReceipt({
      hash: body.txHash as `0x${string}`,
    }).catch(() => null);

    if (!receipt || receipt.status !== 'success') {
      return NextResponse.json(
        { success: false, error: 'Transaction not found or failed on-chain' },
        { status: 400 },
      );
    }

    const VALID_TIERS = [0, 1, 2];
    const tier = typeof body.tier === 'number' && VALID_TIERS.includes(body.tier) ? body.tier : 0;
    const usdcAmount = body.usdcAmount && NUMERIC_STRING_REGEX.test(body.usdcAmount)
      ? body.usdcAmount
      : null;

    // Upsert — idempotent on txHash unique constraint
    await prisma.presaleEvent.upsert({
      where: { txHash: body.txHash },
      create: {
        eventType: 'purchase',
        walletAddress: buyerAddress,
        txHash: body.txHash,
        blockNumber: BigInt(body.blockNumber),
        tokenAmount: body.tokenAmount,
        usdcAmount,
        tier,
      },
      update: {}, // No-op on duplicate — first writer wins
    });

    // Also update the Founder record if it exists and hasn't been set yet
    await prisma.founder.updateMany({
      where: {
        walletAddress: { equals: buyerAddress, mode: 'insensitive' },
        tokensPurchased: null,
      },
      data: {
        tokensPurchased: body.tokenAmount,
        usdcSpent: usdcAmount,
        purchaseTxHash: body.txHash,
        purchasedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    // Unique constraint violation is expected — treat as success
    if (
      error instanceof Error &&
      error.message.includes('Unique constraint')
    ) {
      return NextResponse.json({ success: true });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
