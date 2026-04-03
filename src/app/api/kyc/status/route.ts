import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAddress, getErrorMessage } from '@/lib/validation';
import type { ApiResponse, KycStatusResponse } from '@/types';

/**
 * GET /api/kyc/status?wallet=0x...
 *
 * Returns the KYC status for a given wallet address.
 * Used by the frontend to poll for KYC completion after Persona redirect.
 */
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<KycStatusResponse>>> {
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
        walletAddress: true,
        kycStatus: true,
        kycCompletedAt: true,
      },
    });

    if (!founder) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        walletAddress: founder.walletAddress,
        kycStatus: founder.kycStatus as KycStatusResponse['kycStatus'],
        kycCompletedAt: founder.kycCompletedAt?.toISOString() ?? null,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
