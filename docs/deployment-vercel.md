# Vercel Deployment

Hermit deploys to Vercel as a static Vite frontend. The frontend can show the James Wynn testnet console, wallet authorization entry points, strategy state, and signer-service status calls, but it must not hold the Hyperliquid API wallet private key.

## Build Settings

The repository includes `vercel.json`:

```json
{
  "framework": "vite",
  "installCommand": "npm ci",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

## Public Environment Variables

Only `VITE_` values are safe to expose to the deployed frontend:

```env
VITE_HERMIT_BUILDER_WALLET=0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f
VITE_HERMIT_MASTER_ADDRESS=0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f
VITE_HL_TESTNET_API=https://api.hyperliquid-testnet.xyz
VITE_HL_TESTNET_WS=wss://api.hyperliquid-testnet.xyz/ws
VITE_HL_TESTNET_APP=https://app.hyperliquid-testnet.xyz
VITE_ENABLE_LIVE_TESTNET=false
VITE_ENABLE_BUILDER_FEE=false
VITE_WALLETCONNECT_PROJECT_ID=18765a35d157f174d79e04b8a0f23da8
VITE_HERMIT_SIGNER_BASE_URL=http://127.0.0.1:8787
```

`VITE_HERMIT_SIGNER_BASE_URL` points to the local signer during operator testing. For a hosted signer later, use a dedicated backend URL with authentication and CORS restricted to the production domain.

## Server-Only Values

Do not add these values to Vercel frontend environment variables:

```env
HERMIT_HL_API_WALLET_PRIVATE_KEY
HERMIT_HL_API_WALLET_ADDRESS
HERMIT_HL_MASTER_ADDRESS
HERMIT_HL_AGENT_NAME
HERMIT_BUILDER_FEE_TENTHS_BPS
```

They belong in `.env.local` for local operator runs or in a separate signer service secret store. The static Vercel app should never be able to sign Hyperliquid orders by itself.

## Release Checks

Before promoting a deployment:

```bash
npm run build
npm run testnet:agent-flow:audit
```

The build proves the public frontend is deployable. The agent-flow audit proves the live testnet operator path still has the approved API wallet, funded account, BTC test position, builder-fee dry-run, and reduce-only close dry-run.
