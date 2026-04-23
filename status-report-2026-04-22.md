Status: [ON TRACK]

Number of Hours spent on this task TODAY: 6HRs

Accomplishments TODAY:

- **Contract Verification & Role Setup**
  - Created and ran `verify-proxies.ts` script for BaseScan verification of GenesisPresale, PresaleVesting, and ACTXToken proxy contracts (EIP-1967 implementation discovery + source verification)
  - Created and ran `check-roles.ts` script — confirmed OPERATOR_ROLE, PAUSER_ROLE, and DEFAULT_ADMIN_ROLE on GenesisPresale; PRESALE_ROLE granted to GenesisPresale on PresaleVesting

- **Pool Funding & Token Minting**
  - Funded GenesisPresale pool with 3,000,000 ACTX via `fund-pool.ts` (bypassed RPC propagation lag on allowance check)
  - Created `mint-usdc.ts` script and minted 1,000 test USDC to founder wallet (`0xb822...`)

- **Database Seeding & Founder Registration**
  - Fixed `seed-founders.ts` Prisma adapter configuration (PrismaPg connection string)
  - Seeded Elite founder wallet and Admin wallet into database with KYC approved + sprint completed status
  - Registered founder wallet on-chain via Hardhat console: `qualifyWallet()` + `setWalletTier(addr, 1)` — confirmed Elite tier

- **Core UI Debugging & Write Hook Fixes**
  - Diagnosed Base Sepolia RPC gas estimation failures ("exceeds max transaction gas limit") on all write operations
  - Added explicit `gas` limits to all write calls across 3 hooks: `usePresaleWrite.ts` (approve: 100k, purchase: 500k), `useAdminWrite.ts` (all admin ops: 200k), `useClaimWrite.ts` (claim: 300k)
  - Added explicit `chainId: TARGET_CHAIN_ID` to all `writeContract` calls across all 3 hooks to resolve "invalid chain ID" errors from wallet provider conflicts
  - Resolved Sender wallet browser extension conflict interfering with MetaMask provider

- **Environment & Configuration**
  - Configured `NEXT_PUBLIC_RPC_URL` (Alchemy Base Sepolia), `NEXT_PUBLIC_CHAIN`, and `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in presale-ui `.env`
  - Cleared Next.js build cache to force env var reload
  - Confirmed PostgreSQL (Docker) connectivity and Prisma schema sync

- **Pre-Flight & Regression Checks Passed**
  - Phase 0: PRESALE_ROLE granted ✓, Pool funded (3M ACTX) ✓, Dev server clean ✓
  - API stats endpoint (`/api/presale/stats`) returning correct on-chain data with `version` field ✓
  - Regression: No stale `getAddresses().presale` refs ✓, No old ACTXPresale imports ✓, TypeScript compiles clean ✓, Error strings present in hooks ✓
  - Presale opened on-chain via Hardhat, founder wallet balance confirmed
