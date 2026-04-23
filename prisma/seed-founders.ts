/**
 * Seed script: insert test Founder rows for E2E test wallets.
 *
 * Usage: npx tsx prisma/seed-founders.ts
 *
 * Safe to re-run — uses upsert on walletAddress.
 *
 * NOTE: package.json does NOT currently declare a "prisma.seed" entry, so this
 *       script must be invoked directly rather than via `prisma db seed`.
 *       If/when a seed entry is added, it should point here.
 */

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

// --- Test wallets (lowercase) ---
// TODO: Fill in your test wallet addresses before running.
const BUYER_ELITE  = '0xb822c1870dc2d982bd921a7752c9562480efb934';
const BUYER_LEGEND = '0x';
const ADMIN        = '0x39494b88e3b2714f32f1249ce9738ec378646ffe';

interface FounderSeed {
  readonly walletAddress: string;
  readonly tier: number;
  readonly label: string;
}

const SEEDS: ReadonlyArray<FounderSeed> = [
  { walletAddress: BUYER_ELITE,  tier: 1, label: 'BUYER_ELITE'  },
  { walletAddress: BUYER_LEGEND, tier: 2, label: 'BUYER_LEGEND' },
  { walletAddress: ADMIN,        tier: 2, label: 'ADMIN'        },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set');
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const now = new Date();

    for (const seed of SEEDS) {
      if (!seed.walletAddress || seed.walletAddress === '0x') {
        console.warn(`Skipping ${seed.label}: placeholder address not set`);
        continue;
      }

      const record = await prisma.founder.upsert({
        where: { walletAddress: seed.walletAddress },
        create: {
          walletAddress:     seed.walletAddress,
          tier:              seed.tier,
          kycStatus:         'approved',
          kycCompletedAt:    now,
          sprintCompleted:   true,
          sprintCompletedAt: now,
        },
        update: {
          tier:              seed.tier,
          kycStatus:         'approved',
          kycCompletedAt:    now,
          sprintCompleted:   true,
          sprintCompletedAt: now,
        },
      });

      console.log(
        `Upserted ${seed.label}: id=${record.id} wallet=${record.walletAddress} tier=${record.tier}`,
      );
    }

    console.log('Seed complete.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
