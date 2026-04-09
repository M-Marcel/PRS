import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminWallet, validateAddress } from '@/lib/validation';

// POST: Log a founder-related admin action (register_founder, mark_sprint).
// Also updates the Founder record in the database.
//
// Body: { adminAddress, action, targetAddress, txHash?, metadata? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adminAddress, action, targetAddress, txHash, metadata } = body;

    // Server-side admin validation
    if (!adminAddress || !isAdminWallet(adminAddress)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: not an admin wallet' },
        { status: 403 },
      );
    }

    const validAdmin = validateAddress(adminAddress);
    const validTarget = targetAddress ? validateAddress(targetAddress) : null;

    if (!validAdmin) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin address' },
        { status: 400 },
      );
    }

    if (!action || !['register_founder', 'mark_sprint'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be register_founder or mark_sprint.' },
        { status: 400 },
      );
    }

    if (!validTarget) {
      return NextResponse.json(
        { success: false, error: 'Valid target address is required' },
        { status: 400 },
      );
    }

    // Create audit record
    await prisma.adminAction.create({
      data: {
        adminAddress: validAdmin,
        action,
        targetAddress: validTarget,
        txHash: txHash ?? null,
        metadata: metadata ?? null,
      },
    });

    // Update founder record
    if (action === 'register_founder') {
      await prisma.founder.updateMany({
        where: { walletAddress: validTarget },
        data: { registeredOnChain: true },
      });
    } else if (action === 'mark_sprint') {
      await prisma.founder.updateMany({
        where: { walletAddress: validTarget },
        data: { sprintMarkedOnChain: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
