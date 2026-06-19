# Pull Request Description

Title:

```text
Add Hyperliquid testnet agent flow readiness
```

## Summary

- Adds the Hermit React/Vite testnet launch console for hiring and monitoring trading agents, centered on the James Wynn Agent.
- Adds a local Hyperliquid signer service path so the browser never receives the API wallet private key.
- Adds real testnet order tooling for dry-run order construction, builder-fee routing, and reduce-only position close checks.
- Adds `npm run testnet:agent-flow:audit`, a repeatable readiness gate for the James Wynn testnet flow.
- Adds CI and Vercel deployment configuration for the public, keyless frontend.

## Live Testnet Evidence

- API wallet: `0xE59466C744c919D36B13F4dd7C673b582727848D`
- Master/revenue/builder wallet: `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`
- Real BTC testnet IOC order was filled:
  - side: buy
  - size: `0.0002`
  - average price: `64220.0`
  - order id: `54348289210`
- Builder fee approval is active with `maxBuilderFee: 10`.
- Current readiness audit verifies:
  - funded perps account
  - open BTC testnet position
  - builder-fee order dry-run with no blockers
  - BTC reduce-only close dry-run with no blockers

## Verification

```bash
npm run check:config
npm run build
npm run testnet:agent-flow:audit
```

Public CI runs the secret-free build gate:

```bash
npm ci
npm run check:config
npm run build
```

## Security Notes

- No private key is committed.
- `.env.local`, build output, local logs, and `node_modules` are ignored.
- Vercel should only receive public `VITE_` variables.
- `HERMIT_HL_API_WALLET_PRIVATE_KEY` must stay in `.env.local` or a separate signer service secret store.
- Browser-side live execution remains disabled by default; live testnet actions go through the local signer or explicit CLI commands.

## Review Focus

- Confirm the frontend deploys as a static Vite app through `vercel.json`.
- Confirm CI does not require real testnet secrets.
- Confirm `scripts/testnet-agent-flow-audit.mjs` proves the live James Wynn testnet route without sending a new order.
- Confirm signer service endpoints never return or expose the API wallet private key.
- Confirm docs clearly distinguish the Vercel frontend from the server-side signer path.
