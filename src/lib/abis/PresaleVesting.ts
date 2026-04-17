// src/lib/abis/PresaleVesting.ts
// PresaleVesting.sol — token custody, TGE, 90-day linear vesting, BSI multiplier
// Proxy: 0xc8a4E16bcEC023cd0941107aA392C9Cb5021e2c3

export const PRESALE_VESTING_ABI = [
  // === View Functions ===
  'function getPurchase(address wallet) view returns (uint256 totalTokens, uint256 claimed)',
  'function getClaimable(address wallet) view returns (uint256)',
  'function getLockedBalance(address wallet) view returns (uint256)',
  'function getVestingMultiplier(address wallet) view returns (uint256)',
  'function tgeTriggered() view returns (bool)',
  'function tgeTimestamp() view returns (uint256)',
  'function actxToken() view returns (address)',
  'function version() view returns (uint256)',
  'function paused() view returns (bool)',

  // === Write Functions ===
  'function triggerTGE() external',
  'function claim() external',
  'function pause() external',
  'function unpause() external',
  'function rescueETH(address to) external',
  'function rescueToken(address token, address to, uint256 amount) external',

  // === Events ===
  'event PurchaseRecorded(address indexed buyer, uint256 tokens, uint256 totalAllocation)',
  'event TGETriggered(uint256 timestamp)',
  'event TokensClaimed(address indexed wallet, uint256 amount, uint256 totalClaimed)',
  'event ContractUpgraded(address indexed newImplementation, uint256 version)',

  // === Errors ===
  'error TGEAlreadyTriggered()',
  'error TGENotTriggered()',
  'error NothingToClaim()',
  'error ZeroAddress()',
  'error ZeroAmount()',
  'error ETHTransferFailed()',
  'error CannotRescueACTX()',
] as const;
