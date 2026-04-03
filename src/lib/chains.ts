import { base, baseSepolia } from 'viem/chains';

export const SUPPORTED_CHAINS = [baseSepolia, base] as const;

export const TARGET_CHAIN = process.env.NEXT_PUBLIC_CHAIN === 'mainnet'
  ? base
  : baseSepolia;

export const TARGET_CHAIN_ID = TARGET_CHAIN.id;
