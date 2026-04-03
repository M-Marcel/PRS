import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateAddress, getErrorMessage } from '@/lib/validation';
import type { ApiResponse, KycInitiateResponse } from '@/types';

const PERSONA_API_KEY = process.env.PERSONA_API_KEY;
const PERSONA_TEMPLATE_ID = process.env.PERSONA_TEMPLATE_ID;
const PERSONA_API_BASE = 'https://withpersona.com/api/v1';

// Rate limit: 3 attempts per wallet per 24 hours (in-memory for dev, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function checkRateLimit(walletAddress: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(walletAddress);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(walletAddress, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  rateLimitMap.set(walletAddress, { ...entry, count: entry.count + 1 });
  return true;
}

/**
 * POST /api/kyc/initiate
 * Body: { walletAddress: string }
 *
 * Initiates a KYC verification session with Persona.
 *
 * Flow:
 * 1. Validate wallet address
 * 2. Check rate limit
 * 3. Check if wallet already has a Founder record with approved KYC
 * 4. Create or resume Persona inquiry
 * 5. Upsert Founder record with kycSessionId
 * 6. Return inquiry URL for frontend redirect
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<KycInitiateResponse>>> {
  try {
    const body = await request.json() as { walletAddress?: string };
    const walletAddress = validateAddress(body.walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing walletAddress' },
        { status: 400 },
      );
    }

    const normalizedAddress = walletAddress.toLowerCase();

    // Rate limit check
    if (!checkRateLimit(normalizedAddress)) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Maximum 3 KYC attempts per 24 hours.' },
        { status: 429 },
      );
    }

    // Check existing founder record
    const existingFounder = await prisma.founder.findUnique({
      where: { walletAddress: normalizedAddress },
      select: { kycStatus: true, kycSessionId: true },
    });

    // Already approved — no need to redo KYC
    if (existingFounder?.kycStatus === 'approved') {
      return NextResponse.json({
        success: true,
        data: {
          inquiryUrl: '',
          inquiryId: existingFounder.kycSessionId ?? '',
          alreadyApproved: true,
        },
      });
    }

    // Create Persona inquiry
    // NOTE: If Persona API key is not configured, return a mock URL for development
    if (!PERSONA_API_KEY || !PERSONA_TEMPLATE_ID) {
      // Development mode: create a mock founder record
      const founder = await prisma.founder.upsert({
        where: { walletAddress: normalizedAddress },
        update: {
          kycStatus: 'pending',
          kycProvider: 'persona',
          kycSessionId: `dev_${Date.now()}`,
        },
        create: {
          walletAddress: normalizedAddress,
          kycStatus: 'pending',
          kycProvider: 'persona',
          kycSessionId: `dev_${Date.now()}`,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          inquiryUrl: `/api/kyc/dev-approve?wallet=${normalizedAddress}`,
          inquiryId: founder.kycSessionId ?? '',
          alreadyApproved: false,
        },
      });
    }

    // Production: Create Persona inquiry via their API
    const personaResponse = await fetch(`${PERSONA_API_BASE}/inquiries`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERSONA_API_KEY}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
        'Key-Inflection': 'camel',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            inquiryTemplateId: PERSONA_TEMPLATE_ID,
            referenceId: normalizedAddress,
          },
        },
      }),
    });

    if (!personaResponse.ok) {
      const errorText = await personaResponse.text();
      throw new Error(`Persona API error: ${personaResponse.status} - ${errorText}`);
    }

    const personaData = await personaResponse.json() as {
      data: {
        id: string;
        attributes: {
          status: string;
        };
      };
      meta: {
        sessionToken: string;
      };
    };

    const inquiryId = personaData.data.id;
    const sessionToken = personaData.meta.sessionToken;

    // Upsert founder record with Persona inquiry ID
    await prisma.founder.upsert({
      where: { walletAddress: normalizedAddress },
      update: {
        kycStatus: 'pending',
        kycProvider: 'persona',
        kycSessionId: inquiryId,
      },
      create: {
        walletAddress: normalizedAddress,
        kycStatus: 'pending',
        kycProvider: 'persona',
        kycSessionId: inquiryId,
      },
    });

    // Build the Persona hosted flow URL
    const inquiryUrl = `https://withpersona.com/verify?inquiry-id=${inquiryId}&session-token=${sessionToken}`;

    return NextResponse.json({
      success: true,
      data: {
        inquiryUrl,
        inquiryId,
        alreadyApproved: false,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: getErrorMessage(error) },
      { status: 500 },
    );
  }
}
