# Release Readiness

Last updated: 2026-06-19

Branch: `codex/testnet-agent-flow-readiness`

## Required Gates

| Gate | Command or Evidence | Status |
| --- | --- | --- |
| Frontend build | `npm run build` | Passing |
| Local config | `npm run check:config` | Passing |
| James Wynn testnet flow | `npm run testnet:agent-flow:audit` | Passing |
| Public CI | `.github/workflows/ci.yml` runs `npm ci`, `check:config`, and `build` with dummy non-secret env | Configured |
| Vercel static frontend | `vercel.json` uses Vite, `npm ci`, `npm run build`, and `dist` output | Configured |
| Secret boundary | `.env.local` ignored; deployment docs keep API wallet private key out of Vercel | Documented |

## Current Testnet State

- API wallet is approved and can trade for the master wallet.
- Master wallet perps account is funded.
- Builder fee approval is active at `maxBuilderFee: 10`.
- Real BTC testnet position is open: `0.0002 BTC`, entry `64220.0`.
- Existing ETH short remains present on the account and is tracked by status checks.
- BTC reduce-only close dry-run is ready if the test position should be cleaned up.

## Manual Release Steps

1. Open the PR from `codex/testnet-agent-flow-readiness` to `main`.
2. Use `docs/pr-description.md` as the PR body.
3. Confirm GitHub Actions passes on the PR.
4. Confirm Vercel preview builds the static frontend.
5. Run the local live gate before merging:

```bash
npm run testnet:agent-flow:audit
```

6. Keep the BTC test position open for continued agent-flow validation, or clean it up intentionally:

```bash
npm run testnet:position:close:execute -- --coin=BTC
```

## Do Not Do

- Do not add `HERMIT_HL_API_WALLET_PRIVATE_KEY` to Vercel frontend env vars.
- Do not enable browser-side live execution without a dedicated authenticated signer backend.
- Do not merge if CI build fails or the local agent-flow audit no longer reports `ready`.
