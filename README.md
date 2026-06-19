# Hermit

Hermit is a Hyperliquid testnet launch console for hiring trading agents as portfolio managers.

Current focus:

- James Wynn Agent with high-leverage BTC/ETH/HYPE momentum-roll strategy.
- Michael Burry Agent hiring journey with wallet authorization, leverage cap, lock period, and cooling period controls.
- Portfolio performance view with PnL, utilization, Sharpe, max drawdown, and BTC benchmark.
- HIP-3/builder-fee preparation with revenue routed to `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`.

## Run

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` when enabling real testnet integration. Keep API wallet private keys in `.env.local` only.

## Verification

Public CI runs the secret-free build gate:

```bash
npm ci
npm run check:config
npm run build
```

The live testnet readiness gate stays local because it needs the server-only API wallet key:

```bash
npm run testnet:agent-flow:audit
```

## Deployment

Vercel deployment uses `vercel.json` with `npm ci`, `npm run build`, and `dist` output. Only public `VITE_` variables belong in Vercel; Hyperliquid API wallet keys stay in `.env.local` or a separate signer service secret store. See `docs/deployment-vercel.md`.

## Review Materials

- `docs/pr-description.md` contains the PR body for the readiness branch.
- `docs/release-readiness.md` contains the final pre-merge checklist and cleanup command for the BTC test position.

## Current State

This version has a working simulation UI plus a local signer path for Hyperliquid testnet validation. The James Wynn API wallet is approved, builder-fee approval is active, and a small real BTC testnet position has been opened to verify the route.

The browser still does not receive private keys or execute trades directly. For the current readiness check:

```bash
npm run testnet:agent-flow:audit
```

That command verifies the server-side API wallet, funded testnet account, live BTC position, builder-fee dry-run order, and reduce-only close dry-run.
