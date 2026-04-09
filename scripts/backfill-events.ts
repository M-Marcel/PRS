/**
 * One-time backfill script to seed the PresaleEvent table with historical
 * Purchase events from the on-chain contract.
 *
 * Usage: npx tsx scripts/backfill-events.ts [fromBlock]
 *
 * Requires DATABASE_URL and NEXT_PUBLIC_RPC_URL in .env
 */

import { createPublicClient, http, parseAbiItem } from 'viem';
import { baseSepolia, base } from 'viem/chains';
import { PrismaClient } from '@prisma/client';

const PRESALE_ABI_EVENTS = [
  'event Purchase(address indexed buyer, uint256 tokenAmount, uint256 usdcPaid, uint8 tier)',
] as const;

const purchaseEvent = parseAbiItem(PRESALE_ABI_EVENTS[0]);

// --- Config ---
const chain = process.env.NEXT_PUBLIC_CHAIN === 'mainnet' ? base : baseSepolia;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? (chain.id === 84532 ? 'https://sepolia.base.org' : 'https://mainnet.base.org');

// TODO: Update with actual presale contract address after deployment
const PRESALE_ADDRESS = process.env.PRESALE_ADDRESS as `0x${string}` | undefined;

async function main() {
  if (!PRESALE_ADDRESS || PRESALE_ADDRESS === '0x0000000000000000000000000000000000000000') {
    console.error('Error: Set PRESALE_ADDRESS env var to the deployed presale contract address');
    process.exit(1);
  }

  const fromBlockArg = process.argv[2];
  const fromBlock = fromBlockArg ? BigInt(fromBlockArg) : 0n;

  console.log(`Chain: ${chain.name} (${chain.id})`);
  console.log(`Presale: ${PRESALE_ADDRESS}`);
  console.log(`From block: ${fromBlock}`);
  console.log('---');

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const prisma = new PrismaClient();

  try {
    const logs = await client.getLogs({
      address: PRESALE_ADDRESS,
      event: purchaseEvent,
      fromBlock,
      toBlock: 'latest',
    });

    console.log(`Found ${logs.length} Purchase events`);

    let created = 0;
    let skipped = 0;

    for (const log of logs) {
      const args = log.args as {
        buyer: string;
        tokenAmount: bigint;
        usdcPaid: bigint;
        tier: number;
      };

      const txHash = log.transactionHash;
      if (!txHash || !args.buyer) {
        skipped++;
        continue;
      }

      try {
        await prisma.presaleEvent.upsert({
          where: { txHash },
          create: {
            eventType: 'purchase',
            walletAddress: args.buyer,
            txHash,
            blockNumber: log.blockNumber ?? 0n,
            tokenAmount: args.tokenAmount.toString(),
            usdcAmount: args.usdcPaid.toString(),
            tier: args.tier,
          },
          update: {},
        });
        created++;
      } catch (error) {
        console.warn(`Skipped ${txHash}: ${error instanceof Error ? error.message : 'unknown'}`);
        skipped++;
      }
    }

    console.log(`Done: ${created} created, ${skipped} skipped`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
