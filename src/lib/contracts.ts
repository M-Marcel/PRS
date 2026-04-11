import { type Address } from 'viem';
import { TARGET_CHAIN_ID } from './chains';

type ContractAddresses = {
  presale: Address;
  actxToken: Address;
  usdc: Address;
};

const ADDRESSES: Record<number, ContractAddresses> = {
  // Base Sepolia (testnet)
  84532: {
    presale: '0xA5c93F78ee3eD5395d2fa92e8ce8f856F292fc9e' as Address,
    actxToken: '0x66180Db496d3F130A655a453221482bb2bcf8d9B' as Address,
    usdc: '0x21fF62001F5Fc428C36dbBE25F4FE82494d9FEfa' as Address, // MockUSDC
  },
  // Base Mainnet (production) — fill after mainnet deployment
  8453: {
    presale: '0x0000000000000000000000000000000000000000' as Address,
    actxToken: '0x0000000000000000000000000000000000000000' as Address,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address, // Official Base USDC
  },
};

export const getAddresses = (): ContractAddresses => {
  const addrs = ADDRESSES[TARGET_CHAIN_ID];
  if (!addrs) throw new Error(`No addresses configured for chain ${TARGET_CHAIN_ID}`);
  return addrs;
};
