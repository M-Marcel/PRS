import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAddress } from '@/lib/validation';
// Dev-only route: no ApiResponse needed since we redirect on success

/**
 * GET /api/kyc/dev-approve?wallet=0x...
 *
 * Development-only endpoint that auto-approves KYC for testing.
 * This endpoint is DISABLED in production (when PERSONA_API_KEY is set).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Block in production
  if (process.env.PERSONA_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Dev approve is disabled in production' },
      { status: 403 },
    );
  }

  const wallet = request.nextUrl.searchParams.get('wallet');
  const validatedAddress = validateAddress(wallet);

  if (!validatedAddress) {
    return NextResponse.json(
      { success: false, error: 'Invalid wallet address' },
      { status: 400 },
    );
  }

  const normalizedAddress = validatedAddress.toLowerCase();

  await prisma.founder.update({
    where: { walletAddress: normalizedAddress },
    data: {
      kycStatus: 'approved',
      kycCompletedAt: new Date(),
    },
  });

  await prisma.adminAction.create({
    data: {
      adminAddress: 'dev-system',
      action: 'kyc_approved',
      targetAddress: normalizedAddress,
      metadata: { source: 'dev-approve' },
    },
  });

  // Redirect back to the sprint page after dev approval
  return NextResponse.redirect(new URL('/sprint', request.url));
}
