# Testnet Configuration Checklist

This checklist is for moving Hermit from simulation to Hyperliquid testnet execution.

## Safety Rules

- Do not paste private keys, seed phrases, or exported wallet keys into chat.
- Do not put private keys in any `VITE_` environment variable. `VITE_` variables are bundled into browser JavaScript.
- Store API wallet private keys only in `.env.local` or in a dedicated signer service secret store.
- Use a fresh Hyperliquid API wallet for this project. Hyperliquid recommends not reusing API wallet addresses after deregistration because nonce state can be pruned.

## What We Need

### 1. MetaMask

- A browser profile with MetaMask installed and enabled.
- The master EVM wallet address that will control the Hyperliquid testnet account.
- Testnet mock USDC on Hyperliquid. The official faucet gives 1,000 mock USDC, but the same address needs prior mainnet deposit eligibility.

### 2. WalletConnect

- Reown Dashboard project ID.
- Dapp metadata for production:
  - name: `Hermit`
  - URL: final deployment URL
  - icon URL

Reown AppKit requires a `projectId` from the Reown Dashboard for WalletConnect/AppKit connections.

### 3. Hyperliquid API Wallet

- Master account address: `HERMIT_HL_MASTER_ADDRESS`
- Fresh API wallet address: `HERMIT_HL_API_WALLET_ADDRESS`
- API wallet private key, stored only as `HERMIT_HL_API_WALLET_PRIVATE_KEY` in `.env.local` or signer secrets
- Agent name: `HERMIT_HL_AGENT_NAME`, default `hermit-james-wynn-testnet`
- Optional vault/subaccount address: `HERMIT_HL_VAULT_ADDRESS`

The master account must approve the API wallet with an `approveAgent` action before it can trade.

### 4. Optional Builder Fee Approval

Revenue wallet:

`0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`

The user must sign `approveBuilderFee` with the main wallet, not with the API wallet. This is now approved on testnet for the Hermit revenue wallet with `maxBuilderFee: 10`. Keep browser-side live trading disabled by default, but the local signer dry-run can include the optional `builder` field for verification.

After approval is available, future order actions can include a builder field such as:

```json
{
  "builder": {
    "b": "0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f",
    "f": 10
  }
}
```

`f: 10` means 1 basis point because Hyperliquid represents builder fees in tenths of a basis point.

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Fill non-secret browser variables:

```env
VITE_WALLETCONNECT_PROJECT_ID=...
VITE_ENABLE_LIVE_TESTNET=false
VITE_ENABLE_BUILDER_FEE=false
```

3. Fill server-only values:

```env
HERMIT_HL_MASTER_ADDRESS=0x...
HERMIT_HL_API_WALLET_ADDRESS=0x...
HERMIT_HL_API_WALLET_PRIVATE_KEY=0x...
HERMIT_HL_AGENT_NAME=hermit-james-wynn-testnet
```

4. Validate:

```bash
npm run check:config
npm run check:hyperliquid
npm run testnet:order:dry-run
npm run testnet:order:dry-run:builder
npm run testnet:position:close:dry-run
npm run testnet:agent-flow:audit
npm run signer:dev
```

`testnet:agent-flow:audit` is the launch-readiness gate for the James Wynn testnet flow. It verifies the API wallet, funded account, real BTC position, builder-fee order dry-run, and reduce-only close dry-run without submitting a new order.

`testnet:order:dry-run` prepares a small IOC testnet order without sending it. To execute after the perps account is funded:

```bash
npm run testnet:order:execute
```

To clean up the BTC test position with a reduce-only IOC order:

```bash
npm run testnet:position:close:execute -- --coin=BTC
```

For UI validation, run `npm run dev` and `npm run signer:dev`, then use the `Testnet execution` panel. The browser calls only the local signer service; the API wallet private key stays server-side in `.env.local`.

## Vercel Frontend Deployment

Use `vercel.json` for the static Vite deployment. Configure only public `VITE_` values in Vercel. Do not put `HERMIT_HL_API_WALLET_PRIVATE_KEY` or any server-only signer values in the Vercel frontend environment. See `docs/deployment-vercel.md`.

## Official References

- Hyperliquid exchange endpoint: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/exchange-endpoint
- Hyperliquid API wallets and nonces: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/nonces-and-api-wallets
- Hyperliquid builder codes: https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes
- Hyperliquid testnet faucet: https://hyperliquid.gitbook.io/hyperliquid-docs/onboarding/testnet-faucet
- Reown AppKit React installation: https://docs.reown.com/appkit/react/core/installation
