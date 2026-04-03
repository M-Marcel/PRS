import { formatUnits, parseUnits } from 'viem';

// ACTX: 18 decimals
export const formatACTX = (amount: bigint, decimals: number = 2): string => {
  return Number(formatUnits(amount, 18)).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// USDC: 6 decimals
export const formatUSDC = (amount: bigint): string => {
  return `$${Number(formatUnits(amount, 6)).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Calculate USDC cost for a given ACTX amount and tier price
export const calculateCost = (
  tokenAmount: bigint,  // 18 decimals
  pricePerToken: bigint // 6 decimals (USDC per 1 ACTX)
): bigint => {
  // (tokenAmount * pricePerToken) / 10^18
  return (tokenAmount * pricePerToken) / parseUnits('1', 18);
};

// Percentage of pool remaining
export const poolPercentage = (remaining: bigint, total: bigint): number => {
  if (total === 0n) return 0;
  return Number((remaining * 10000n) / total) / 100;
};

// Truncate wallet address
export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Days remaining from now to target date
export const daysUntil = (target: Date): number => {
  const diff = target.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};
