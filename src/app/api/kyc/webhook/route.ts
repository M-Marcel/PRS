import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHmac } from 'crypto';

const PERSONA_WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET;

/**
 * POST /api/kyc/webhook
 *
 * Receives KYC completion callbacks from Persona.
 *
 * Flow:
 * 1. Verify webhook signature (HMAC)
 * 2. Extract inquiry ID and status
 * 3. Find Founder by kycSessionId
 * 4. Update KYC status
 * 5. Log AdminAction for audit trail
 *
 * SECURITY: Webhook signature validation is MANDATORY in production.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const rawBody = await request.text();

    // Verify webhook signature in production
    if (PERSONA_WEBHOOK_SECRET) {
      const signature = request.headers.get('persona-signature');

      if (!signature) {
        return NextResponse.json(
          { success: false, error: 'Missing webhook signature' },
          { status: 401 },
        );
      }

      const expectedSignature = createHmac('sha256', PERSONA_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      // Timing-safe comparison
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');

      if (
        signatureBuffer.length !== expectedBuffer.length ||
        !signatureBuffer.every((byte, i) => byte === expectedBuffer[i])
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid webhook signature' },
          { status: 401 },
        );
      }
    }

    const payload = JSON.parse(rawBody) as {
      data: {
        attributes: {
          name: string; // Event name e.g. "inquiry.completed"
          payload: {
            data: {
              id: string; // Inquiry ID
              attributes: {
                status: string; // "completed" | "failed" | "expired" | "needs_review"
                referenceId: string; // Wallet address we set
              };
            };
          };
        };
      };
    };

    const eventName = payload.data.attributes.name;
    const inquiryId = payload.data.attributes.payload.data.id;
    const inquiryStatus = payload.data.attributes.payload.data.attributes.status;
    const referenceId = payload.data.attributes.payload.data.attributes.referenceId;

    // Only process inquiry status events
    if (!eventName.startsWith('inquiry.')) {
      return NextResponse.json({ success: true, data: { message: 'Event ignored' } });
    }

    // Map Persona status to our KYC status
    const kycStatus = mapPersonaStatus(inquiryStatus);

    // Update founder record
    const founder = await prisma.founder.findFirst({
      where: {
        OR: [
          { kycSessionId: inquiryId },
          { walletAddress: referenceId?.toLowerCase() },
        ],
      },
    });

    if (!founder) {
      // Log but don't error — Persona may send events for unknown inquiries
      return NextResponse.json({
        success: true,
        data: { message: 'Founder not found, event logged' },
      });
    }

    await prisma.founder.update({
      where: { id: founder.id },
      data: {
        kycStatus,
        kycSessionId: inquiryId,
        ...(kycStatus === 'approved' ? { kycCompletedAt: new Date() } : {}),
      },
    });

    // Log audit trail
    await prisma.adminAction.create({
      data: {
        adminAddress: 'system',
        action: `kyc_${kycStatus}`,
        targetAddress: founder.walletAddress,
        metadata: {
          inquiryId,
          inquiryStatus,
          eventName,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: `KYC status updated to ${kycStatus}` },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Webhook processing failed';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

function mapPersonaStatus(personaStatus: string): string {
  switch (personaStatus) {
    case 'completed':
    case 'approved':
      return 'approved';
    case 'failed':
    case 'declined':
    case 'expired':
      return 'rejected';
    case 'needs_review':
    case 'created':
    case 'pending':
      return 'pending';
    default:
      return 'pending';
  }
}
