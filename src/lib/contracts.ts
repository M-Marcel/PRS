import { type Address } from 'viem';
import { TARGET_CHAIN_ID } from './chains';

type ContractAddresses = {
  genesisPresale: Address;
  presaleVesting:  Address;
  actxToken: Address;
  usdc: Address;
};

const ADDRESSES: Record<number, ContractAddresses> = {
  84532: {
    genesisPresale: '0x4bBAFA96Fc2A29c0fC0904aE1eC3099a5Aa6cF44' as Address,
    presaleVesting:  '0xc8a4E16bcEC023cd0941107aA392C9Cb5021e2c3' as Address,
    actxToken: '0x3f9ccf19F1372f0859E5d3CCd9270aA5Da080C30' as Address,
    usdc: '0x8e18720B9A8b9f86018Cd1Fd36C827D7190490C1' as Address,
  },
  8453: {
    genesisPresale: '0x0000000000000000000000000000000000000000' as Address,
    presaleVesting:  '0x0000000000000000000000000000000000000000' as Address,
    actxToken: '0x0000000000000000000000000000000000000000' as Address,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address,
  },
};

export const getAddresses = (): ContractAddresses => {
  const addrs = ADDRESSES[TARGET_CHAIN_ID];
  if (!addrs) throw new Error(`No addresses configured for chain ${TARGET_CHAIN_ID}`);
  return addrs;
};
