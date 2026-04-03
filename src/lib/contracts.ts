import { type Address } from 'viem';
import { TARGET_CHAIN_ID } from './chains';

type ContractAddresses = {
  presale: Address;
  actxToken: Address;
  usdc: Address;
  bsiOracle: Address;
};

const ADDRESSES: Record<number, ContractAddresses> = {
  // Base Sepolia (testnet)
  84532: {
    presale: '0x0000000000000000000000000000000000000000' as Address, // TODO: From Eddy's deployment
    actxToken: '0x901703625566C59EC59C81FD700f1bC59c41Fb6A' as Address,
    usdc: '0x0000000000000000000000000000000000000000' as Address, // TODO: Base Sepolia USDC
    bsiOracle: '0xBC450055089d285F69a853F38688B0acA1F645e6' as Address,
  },
  // Base Mainnet (production) — fill after mainnet deployment
  8453: {
    presale: '0x0000000000000000000000000000000000000000' as Address,
    actxToken: '0x0000000000000000000000000000000000000000' as Address,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address, // Official Base USDC
    bsiOracle: '0x0000000000000000000000000000000000000000' as Address,
  },
};

export const getAddresses = (): ContractAddresses => {
  const addrs = ADDRESSES[TARGET_CHAIN_ID];
  if (!addrs) throw new Error(`No addresses configured for chain ${TARGET_CHAIN_ID}`);
  return addrs;
};
