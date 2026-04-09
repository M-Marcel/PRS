import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminWallet, validateAddress } from '@/lib/validation';

// POST: Log a presale state change action (open, close, tge, pause, unpause).
//
// Body: { adminAddress, action, txHash?, metadata? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminAddress, action, txHash, metadata } = body;

    // Server-side admin validation
    if (!adminAddress || !isAdminWallet(adminAddress)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: not an admin wallet' },
        { status: 403 },
      );
    }

    const validAdmin = validateAddress(adminAddress);
    if (!validAdmin) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin address' },
        { status: 400 },
      );
    }

    const validActions = ['open', 'close', 'tge', 'pause', 'unpause'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // Create audit record
    await prisma.adminAction.create({
      data: {
        adminAddress: validAdmin,
        action,
        txHash: txHash ?? null,
        metadata: metadata ?? null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
