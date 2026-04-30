# BlessUP Genesis Presale UI

Frontend application for the BlessUP Network Genesis Presale -- where the first 1,000 Genesis Founders acquire ACTX tokens at exclusive founder pricing on Base L2.

## Project Overview

This is the presale platform for ACTX, the sovereign economic token of the BlessUP Network. Genesis Founders go through a gated flow: connect wallet, verify identity (KYC), complete the Genesis Sprint (3 Mind Renewal sessions across 3 days), purchase ACTX at tier pricing ($0.07 Elite / $0.05 Legend), and then claim vested tokens post-TGE (25% at TGE, 75% linear over 90 days).

The plan document lives at `docs/presale-frontend-plan.md` in the parent repository and defines 8 phases of implementation. The codebase currently covers Phases 1 and 2, with placeholder scaffolding for Phases 3-6.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.2 |
| Language | TypeScript (strict mode) | 5.x |
| UI Runtime | React | 19.2.4 |
| Wallet | wagmi + viem + RainbowKit | wagmi 2.19.5, viem 2.47.6, RainbowKit 2.2.10 |
| State (chain) | React Query (via wagmi) | @tanstack/react-query 5.96.1 |
| State (UI) | Zustand | 5.0.12 |
| Styling | TailwindCSS 4 + shadcn/ui (base-nova style) | Tailwind 4, shadcn 4.1.2 |
| Icons | Lucide React | 1.7.0 |
| Backend API | actx-cloud (NestJS) | localhost:3001 |
| KYC Provider | Persona (via actx-cloud) | API integration |
| Chain | Base Sepolia (testnet) / Base Mainnet (production) | Chain IDs: 84532 / 8453 |

## What Has Been Implemented

### Phase 1 -- Project Scaffold and Core Infrastructure (COMPLETE)

The entire foundation is in place and functional.

**Chain Configuration**
- `src/lib/chains.ts` -- Base Sepolia / Base Mainnet chain selection via `NEXT_PUBLIC_CHAIN` env var
- `src/lib/wagmi.ts` -- wagmi config with RainbowKit `getDefaultConfig`, SSR-safe with lazy singleton
- `src/lib/contracts.ts` -- Contract address registry by chain ID (presale address is still `0x0...0` -- awaiting deployment)

**Contract ABIs**
- `src/lib/abis/ACTXPresale.ts` -- Expected presale ABI with all read/write functions and events (based on spec, not yet deployed)
- `src/lib/abis/ACTXToken.ts` -- Minimal ERC-20 ABI for balance/supply display
- `src/lib/abis/USDC.ts` -- Standard ERC-20 ABI for balance, allowance, approve

**Business Constants and Types**
- `src/lib/constants.ts` -- All presale parameters: pool size (3M ACTX), per-wallet cap (10K), tier pricing, vesting schedule, sprint requirements, `FounderTier` and `PresaleState` enums
- `src/types/index.ts` -- Full TypeScript type definitions: `ApiResponse<T>`, `KycStatus`, `FounderStatus`, `PresaleStats`, `TransactionState`, `SprintSession`, `SprintStatus`, `NavLink`
- `src/lib/formatting.ts` -- `formatACTX` (18 decimals), `formatUSDC` (6 decimals), `calculateCost`, `poolPercentage`, `truncateAddress`, `daysUntil`
- `src/lib/validation.ts` -- `getErrorMessage` utility
- `src/lib/utils.ts` -- `cn` utility (clsx + tailwind-merge)

**Providers**
- `src/providers/Web3Provider.tsx` -- WagmiProvider + QueryClientProvider (10s refetch, 5s stale) + RainbowKitProvider (dark theme, BlessUP green accent)
- `src/providers/AppProvider.tsx` -- Composition wrapper for all providers

**Zustand Store**
- `src/store/useAppStore.ts` -- UI state: mobile nav toggle, pending TX hash, presale state, KYC status

**Hooks (Read-Only)**
- `src/hooks/usePresaleContract.ts` -- `usePresaleState` (multicall: open/closed/tge/sold/available/remaining), `useFounderContractData` (multicall: tier/sprint/purchased/cap/locked/claimable), `usePresalePricing` (multicall: elitePrice/legendPrice/perWalletCap), `usePresaleFlag` (single boolean read)
- `src/hooks/useUSDC.ts` -- `useUSDCBalance`, `useUSDCAllowance`
- `src/hooks/useACTXToken.ts` -- `useACTXBalance`, `useACTXTotalSupply`
- `src/hooks/useFounderStatus.ts` -- Composite hook combining contract data + derived state (`isWhitelisted`, `isElite`, `isLegend`, `tierPrice`, `canPurchase`, etc.)
- `src/hooks/useAdmin.ts` -- `useIsAdmin` checks connected wallet against `NEXT_PUBLIC_ADMIN_WALLETS` env var (UI gate only)

**Layout Components**
- `src/components/layout/Header.tsx` -- Sticky nav bar with BlessUP logo, nav links (Home, Genesis Sprint, Presale, Dashboard), wallet connect button, responsive
- `src/components/layout/Footer.tsx` -- Contract links (with block explorer URLs, handles zero-address gracefully), brand, resources, legal disclaimer
- `src/components/layout/MobileNav.tsx` -- Hamburger menu with overlay/drawer, Zustand-managed open state

**Shared Components**
- `src/components/shared/PageGuard.tsx` -- Progressive access gate: NetworkGuard -> whitelist check -> sprint check -> presale open check, each with informative UI
- `src/components/shared/TransactionStatus.tsx` -- Displays TX lifecycle (pending/confirming/confirmed/failed) with BaseScan link
- `src/components/shared/TokenAmount.tsx` -- Formatted ACTX display with optional icon/symbol
- `src/components/shared/USDCAmount.tsx` -- Formatted USDC display with optional icon
- `src/components/shared/Countdown.tsx` -- Generic countdown timer (days/hours/min/sec) with `onComplete` callback

**shadcn/ui Components**
- `src/components/ui/` -- alert, badge, button, card, dialog, input, label, progress, separator, sonner (toast), tabs

**Global Styles**
- `src/app/globals.css` -- Tailwind v4 setup, shadcn theme (light + dark mode with oklch colors), BlessUP design tokens (green, gold, purple), gradient utilities, tier badge color classes

**Landing Page**
- `src/app/page.tsx` -- Public SSR landing page with hero section, "How It Works" 4-step flow, Elite/Legend tier comparison cards

### Phase 2 -- Wallet Connection and Founder Whitelist Gate (COMPLETE)

**Wallet Components**
- `src/components/wallet/ConnectButton.tsx` -- Custom RainbowKit wrapper with BlessUP styling, SSR-safe, handles connected/wrong-network/disconnected states
- `src/components/wallet/NetworkGuard.tsx` -- Enforces wallet connection + correct chain (Base Sepolia or Mainnet), shows connect prompt or switch network button with `useSwitchChain`
- `src/components/wallet/WalletInfo.tsx` -- Displays truncated address, USDC balance, and ACTX balance for connected wallet

**KYC Integration**
- `src/hooks/useKycStatus.ts` -- `useKycStatus` (polls `/api/kyc/status` every 10s when status is `pending`), `useKycInitiate` (calls `/api/kyc/initiate` to start Persona flow)
- `src/app/api/kyc/initiate/route.ts` -- Full implementation: validates wallet, rate limits (3/24h), checks existing founder, creates Persona inquiry via API, upserts Founder record, returns inquiry URL. Falls back to dev mock when Persona keys not set.
- `src/app/api/kyc/status/route.ts` -- Full implementation: looks up Founder by wallet address, returns KYC status
- `src/app/api/kyc/webhook/route.ts` -- Full implementation: HMAC signature verification, maps Persona status to internal status, updates Founder record, logs AdminAction audit trail
- `src/app/api/kyc/dev-approve/route.ts` -- Development-only auto-approve endpoint (disabled when `PERSONA_API_KEY` is set), redirects to `/sprint` after approval

**Page Guard**
- `src/components/shared/PageGuard.tsx` -- Fully implemented with progressive gates and informative rejection UIs for each failure state

**Page Routes**
- `src/app/sprint/page.tsx` -- Server page with `force-dynamic`, delegates to `SprintPageContent` (client component with PageGuard)
- `src/app/presale/page.tsx` -- Server page with `force-dynamic`, delegates to `PresalePageContent` (client component with PageGuard requiring whitelist + sprint)
- `src/app/dashboard/page.tsx` -- Server page with `force-dynamic`, delegates to `DashboardPageContent` (client component with PageGuard)
- `src/app/admin/layout.tsx` -- Wraps admin pages in `AdminShell` (network guard + admin role gate)
- `src/app/admin/page.tsx` -- Admin landing with WalletInfo and placeholder content

**Admin Shell**
- `src/components/admin/AdminShell.tsx` -- Header/footer, NetworkGuard, admin role check via `useIsAdmin`, access denied card for non-admins

**API Stubs**
- `src/app/api/health/route.ts` -- Working health check endpoint returning status, timestamp, version
- `src/app/api/sprint/status/route.ts` -- Stub returning 501
- `src/app/api/presale/stats/route.ts` -- Stub returning 501
- `src/app/api/admin/founders/route.ts` -- Stub returning 501
- `src/app/api/admin/whitelist/route.ts` -- Stub returning 501
- `src/app/api/admin/tge/route.ts` -- Stub returning 501

## What Remains To Be Done

### Phase 3 -- Genesis Sprint Tracker (NOT STARTED)

Sprint page content currently shows a placeholder. Needs:

- **Sprint components**: `SprintProgress` (3-step progress indicator), `SprintDay` (individual day completion card), `SprintCTA` ("Start RENEW Session" button)
- **Sprint session flow**: Simplified RENEW session experience (placeholder content card with 5-minute minimum timer), session completion API call
- **API route** `POST /api/sprint/complete`: Verify founder, check daily limit, generate actionHash, create SprintSession record, set sprintCompleted flag at 3 sessions across 3 distinct days
- **API route** `GET /api/sprint/status`: Implement actual DB query (currently stub)
- **Sprint status hook** `useSprintStatus`: Fetch from `/api/sprint/status` + on-chain `hasCompletedSprint`
- **BSI oracle integration**: Call `BSIOracleSimulator.verifyAction` on-chain for session verification (can be deferred)
- **Sprint completion -> on-chain mark**: Automated or admin-triggered call to `presaleContract.markSprintComplete(wallet)`

### Phase 4 -- Presale Purchase Flow (NOT STARTED)

Presale page content currently shows a placeholder. Needs:

- **Purchase form components**: `PoolTracker` (live remaining tokens bar), `PurchaseForm` (amount input with USDC cost calculation), `TierBadge`, `PriceDisplay`, `ApproveButton`, `PurchaseButton`, `PurchaseReceipt`, `PresaleCountdown`
- **Write hooks**: `usePresaleWrite` with `approveUSDC(amount)` and `purchaseTokens(tokenAmount)` -- including client-side pre-flight checks before TX submission
- **USDC approval pattern**: Check existing allowance, handle re-approval, optional MAX_UINT256 approval
- **Quick-fill buttons**: MAX / 25% / 50% / 75% of affordable amount
- **Post-purchase receipt**: TX hash link to BaseScan, updated balances

**Blocked by**: ACTXPresale.sol deployment on Base Sepolia (contract addresses in `contracts.ts` are still zero addresses)

### Phase 5 -- Vesting Dashboard and Claim Flow (NOT STARTED)

Dashboard page content currently shows a placeholder. Needs:

- **Vesting components**: `VestingChart` (visual timeline), `ClaimTGEButton` (one-shot 25%), `ClaimVestedButton` (claim linear vest), `LockedBalanceCard`, `VestingSchedule` (day-by-day unlock table)
- **Vesting hook** `useVesting`: Reads `getTotalPurchased`, `getLockedBalance`, `getClaimableBalance`, `getVestedBalance`, `hasClaimed25`, `tgeTriggered`; exposes `claimTGE()` and `claimVested()` write functions
- **Multiplier boost display**: Show +0.1x BSI boost from locked tokens

**Blocked by**: Phase 4 + TGE mechanism on contract

### Phase 6 -- Admin Panel (NOT STARTED)

Admin page currently shows a placeholder. Needs:

- **Admin components**: `FounderTable` (paginated list with filters), `RegisterFounderForm` (wallet + tier), `PresaleControls` (open/close/pause/unpause), `TGETrigger` (triple confirmation dialog)
- **API routes**: Implement `GET /api/admin/founders` (paginated listing), `POST /api/admin/whitelist` (batch founder registration), `POST /api/admin/tge` (TGE trigger with validation)
- **On-chain admin functions**: Frontend-signed TX calls to `registerFounder`, `markSprintComplete`, `openPresale`, `closePresale`, `triggerTGE`, `pause`, `unpause`
- **Admin hook enhancements**: On-chain role check via `presaleContract.hasRole(DEFAULT_ADMIN_ROLE, address)` in addition to env var check
- **Metrics dashboard**: Total sold/remaining, USDC raised, founders by tier, purchase count, average purchase size

### Phase 7 -- Real-Time Pool Tracker and Live Feed (NOT STARTED)

- **Event listener hook** `usePresaleEvents`: `useWatchContractEvent` for Purchase, TGE events; maintain live feed in Zustand store (last 20 purchases)
- **Pool progress bar component**: Animated bar with color transitions (green > yellow > red), numeric display, floating "-X ACTX" animation on new purchases
- **Live purchase feed**: Real-time scrolling feed of recent purchases with wallet, amount, tier, time ago
- **Public stats API**: Implement `GET /api/presale/stats` with aggregated metrics, 30-second cache

### Phase 8 -- Testing, Security, and Deployment (NOT STARTED)

- **Unit tests**: formatting utils, constants validation, hook logic, component rendering (PurchaseForm, VestingChart, PoolTracker)
- **Integration tests**: Full purchase flow (approve -> purchase -> verify), vesting flow (TGE claim -> linear claim), sprint flow against Base Sepolia
- **E2E tests** (Playwright): Happy path, wrong network, insufficient funds, presale closed scenarios
- **Security hardening**: CSP headers, CSRF protection, webhook signature enforcement, no sensitive data in client state
- **Performance optimization**: RSC for static content, aggressive React Query caching, contract read batching, skeleton loaders, error boundaries
- **Deployment**: Vercel environment variables, RPC endpoint (Alchemy/QuickNode), domain SSL, analytics setup

### Cross-Cutting Items Not Yet Addressed

- **ACTXPresale.sol contract**: Not yet deployed -- presale and USDC addresses in `contracts.ts` are zero addresses. All purchase/vesting/admin functionality is blocked on this.
- **KYC flow integration**: The plan originally described KYC as Phase 2, then was revised to on-chain whitelist-only. The codebase implements both -- KYC API routes exist and work, but `PageGuard` checks on-chain `founderTier` (not KYC status). Clarify which flow is canonical.
- **RENEW session content**: The actual meditation/audio/video experience is a separate workstream. The sprint page needs at minimum a placeholder content card with a timer.
- **Analytics**: PostHog/Mixpanel integration is mentioned in the plan but not implemented.
- **Tier upgrade flow**: Elite -> Legend upgrade ($1,000 payment, cutoff 24h before presale) is described in business rules but has no UI or contract function.

## Project Structure

```
presale-ui/
  src/
    app/
      layout.tsx                  # Root layout with AppProvider + Toaster
      page.tsx                    # Landing page (SSR, public)
      globals.css                 # Tailwind v4 + shadcn theme + BlessUP tokens
      sprint/page.tsx             # Genesis Sprint (force-dynamic)
      presale/page.tsx            # Purchase flow (force-dynamic)
      dashboard/page.tsx          # Vesting dashboard (force-dynamic)
      admin/
        layout.tsx                # AdminShell wrapper
        page.tsx                  # Admin panel
    components/
      layout/                     # Header, Footer, MobileNav
      wallet/                     # ConnectButton, NetworkGuard, WalletInfo
      shared/                     # PageGuard, TransactionStatus, TokenAmount, USDCAmount, Countdown
      pages/                      # SprintPageContent, PresalePageContent, DashboardPageContent
      admin/                      # AdminShell, AdminMetrics, FounderTable, PresaleControls, TGETrigger
      presale/                    # PoolTracker, PurchaseForm, LiveFeed
      ui/                         # shadcn/ui components
    hooks/
      useSiweAuth.ts              # SIWE authentication flow
      usePresaleContract.ts       # Contract read hooks (multicall)
      useSprintStatus.ts          # Sprint progress + completion
      useKycStatus.ts             # KYC polling + initiation
      usePresaleEvents.ts         # On-chain event listener + persistence
      useFounderStatus.ts         # Composite founder state
      useAdminWrite.ts            # Admin contract write operations
      useAdmin.ts                 # Admin wallet check (client-side)
    lib/
      api-client.ts               # Centralized HTTP client (Bearer token, error handling)
      abis/                       # ACTXPresale, ACTXToken, USDC, PresaleVesting ABIs
      chains.ts                   # Chain config
      wagmi.ts                    # wagmi config
      contracts.ts                # Address registry
      constants.ts                # Business constants + enums
      formatting.ts               # Token formatting utils
      validation.ts               # Error message utility
      adminAudit.ts               # Admin action audit logging
      utils.ts                    # cn utility
    providers/
      Web3Provider.tsx            # wagmi + RainbowKit + React Query
      AuthProvider.tsx            # SIWE authentication context
      AppProvider.tsx             # Provider composition
    store/
      useAppStore.ts              # Zustand UI state
    types/
      index.ts                    # All TypeScript interfaces and types
```

## Setup and Run Instructions

### Prerequisites

- Node.js 18+
- actx-cloud backend running at `http://localhost:3001` (see `actx-cloud/` README)
- WalletConnect Project ID (from https://cloud.walletconnect.com)

### Installation

```bash
cd presale-ui
npm install
```

### Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CHAIN` | Yes | `sepolia` or `mainnet` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | WalletConnect cloud project ID |
| `NEXT_PUBLIC_RPC_URL` | Yes | Base chain RPC URL (Alchemy recommended) |
| `NEXT_PUBLIC_API_URL` | Yes | actx-cloud backend URL (e.g. `http://localhost:3001/api/v1`) |
| `NEXT_PUBLIC_ADMIN_WALLETS` | Yes | Comma-separated admin wallet addresses (client-side UI gate) |
| `NEXT_PUBLIC_PRESALE_OPEN_DATE` | Yes | ISO 8601 presale start time |
| `NEXT_PUBLIC_PRESALE_CLOSE_DATE` | Yes | ISO 8601 presale end time |
| `NEXT_PUBLIC_DEX_LAUNCH_DATE` | Yes | ISO 8601 DEX launch date |

### Run Development Server

Start actx-cloud first (database, Redis, KYC, auth all run there):

```bash
cd ../actx-cloud && docker-compose up -d && npm run start:dev
```

Then start the frontend:

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Build for Production

```bash
npm run build
npm start
```

### Lint

```bash
npm run lint
```

## Contract Addresses

| Contract | Base Sepolia | Base Mainnet |
|----------|-------------|--------------|
| ACTXToken | `0x901703625566C59EC59C81FD700f1bC59c41Fb6A` | TBD |
| ACTXPresale | Not deployed | TBD |
| USDC | Not configured | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| BSIOracleSimulator | `0xBC450055089d285F69a853F38688B0acA1F645e6` | TBD |

## Phase Completion Summary

| Phase | Description | Status | Blocked By |
|-------|-------------|--------|------------|
| 1 | Scaffold, chain config, DB schema, utilities | COMPLETE | -- |
| 2 | Wallet connection, KYC, whitelist gate, page guards | COMPLETE | -- |
| 3 | Genesis Sprint tracker and completion flow | NOT STARTED | BSI Oracle integration |
| 4 | Presale purchase flow (approve + buy) | NOT STARTED | ACTXPresale.sol deployment |
| 5 | Vesting dashboard and claim flow | NOT STARTED | Phase 4, TGE mechanism |
| 6 | Admin panel | NOT STARTED | Phase 4 |
| 7 | Real-time pool tracker and live feed | NOT STARTED | Phase 4 |
| 8 | Testing, security hardening, deployment | NOT STARTED | All phases |

Estimated remaining effort: 19-25 days (per plan estimates for Phases 3-8).

## Git History

```
f4fd75f phase 2(kyc) completed
28414f8 feat: initial commit
```

The project has its own git repository within the `presale-ui/` directory, separate from the parent NaXum monorepo.
