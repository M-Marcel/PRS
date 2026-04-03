// NOTE: This is the EXPECTED interface based on Eddy's spec.
// Replace with actual ABI after deployment.

export const PRESALE_ABI = [
  // === READ FUNCTIONS ===

  // Presale state
  'function presaleOpen() view returns (bool)',
  'function presaleClosed() view returns (bool)',
  'function tgeTriggered() view returns (bool)',
  'function totalTokensSold() view returns (uint256)',
  'function totalTokensAvailable() view returns (uint256)',
  'function remainingTokens() view returns (uint256)',

  // Founder/tier info
  'function founderTier(address) view returns (uint8)',  // 0=None, 1=Elite, 2=Legend
  'function hasCompletedSprint(address) view returns (bool)',
  'function tokensPurchased(address) view returns (uint256)',
  'function spendCapRemaining(address) view returns (uint256)',

  // Vesting
  'function getLockedBalance(address) view returns (uint256)',
  'function getClaimableBalance(address) view returns (uint256)',
  'function getVestedBalance(address) view returns (uint256)',
  'function getTotalPurchased(address) view returns (uint256)',
  'function hasClaimed25(address) view returns (bool)',

  // Pricing
  'function elitePrice() view returns (uint256)',   // USDC amount per token (6 decimals)
  'function legendPrice() view returns (uint256)',
  'function perWalletCap() view returns (uint256)', // 10,000 ACTX in 18 decimals

  // === WRITE FUNCTIONS ===

  // Purchase (requires USDC approval first)
  'function purchase(uint256 tokenAmount) external',

  // Claim vested tokens
  'function claimTGE() external',           // One-shot 25% claim
  'function claimVested() external',        // Claim available linear vest

  // Admin
  'function registerFounder(address wallet, uint8 tier) external',
  'function markSprintComplete(address wallet) external',
  'function openPresale() external',
  'function closePresale() external',
  'function triggerTGE() external',
  'function pause() external',
  'function unpause() external',

  // === EVENTS ===
  'event Purchase(address indexed buyer, uint256 tokenAmount, uint256 usdcPaid, uint8 tier)',
  'event TGETriggered(uint256 timestamp)',
  'event TGEClaimed(address indexed wallet, uint256 amount)',
  'event VestingClaimed(address indexed wallet, uint256 amount)',
  'event PresaleOpened(uint256 timestamp)',
  'event PresaleClosed(uint256 timestamp)',
  'event FounderRegistered(address indexed wallet, uint8 tier)',
  'event SprintCompleted(address indexed wallet)',
] as const;
