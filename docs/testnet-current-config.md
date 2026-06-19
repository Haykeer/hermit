# Current Testnet Config

Last checked: 2026-06-19

## Public Values

- Reown / WalletConnect project ID: `18765a35d157f174d79e04b8a0f23da8`
- Hyperliquid master wallet: `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`
- Hermit revenue / builder wallet: `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`
- Hyperliquid API wallet address: `0xE59466C744c919D36B13F4dd7C673b582727848D`
- Agent name: `hermit-james-wynn-testnet`

## Local Secret State

The API wallet private key is stored only in `.env.local`, which is ignored by git.

## Verified Commands

```bash
npm run check:config
npm run build
npm run check:hyperliquid
npm run testnet:order:dry-run
npm run testnet:order:dry-run:builder
npm run testnet:order:execute
npm run testnet:position:close:dry-run
npm run testnet:agent-flow:audit
npm run signer:dev
```

The local signer service, browser Execution panel, and repeatable agent-flow audit were validated against the live testnet account.

Vercel static deployment is configured through `vercel.json`. The deployed frontend remains keyless; real testnet signing stays in the local signer or a future dedicated signer backend.

## Latest Hyperliquid State

- Builder fee approval is active: `maxBuilderFee` is `10`.
- Master wallet perps account is funded. Latest sampled account value: `1325.786352`.
- API wallet order route executed successfully without the optional builder field.
- Builder-fee order route dry-run now passes with `builder: { b: 0x4419..., f: 10 }`.
- BTC reduce-only close dry-run now passes and can be executed if we need to clean up the test position.
- Filled BTC IOC test order:
  - asset: `BTC`
  - side: buy
  - size: `0.0002`
  - average price: `64220.0`
  - order id: `54348289210`
- Current post-test positions include:
  - `BTC` long `0.0002`
  - existing `ETH` short `-3.345`

## Local Signer Service Validation

- `GET /health` returns `status: ok`; browser-side execution remains disabled by default.
- `GET /api/testnet/status` returns the funded account state, `maxBuilderFee: 10`, and the BTC/ETH positions above.
- `POST /api/testnet/order/dry-run` with `includeBuilder: true` returns a builder-fee order with no blockers.
- `POST /api/testnet/position/close/dry-run` for BTC returns a reduce-only IOC close order with no blockers.
- The React `Testnet execution` panel was tested through the browser buttons on desktop and mobile widths. No horizontal overflow or console errors were observed.

## Repeatable Agent-Flow Audit

`npm run testnet:agent-flow:audit` now checks the full James Wynn testnet readiness path without sending a new order:

- `.env.local` is present and the server-only API wallet private key derives `0xE59466C744c919D36B13F4dd7C673b582727848D`.
- Master wallet perps account value is above the configured minimum.
- `BTC` testnet position size is at least `0.0002`.
- Builder fee approval satisfies `HERMIT_BUILDER_FEE_TENTHS_BPS=10`.
- Builder-fee order dry-run returns no blockers and includes `builder: { b: 0x4419..., f: 10 }`.
- BTC reduce-only close dry-run returns no blockers and uses the opposite side of the open position.

Latest audit verdict: `ready`.

## Order Route Fixes

- Price formatting now uses Hyperliquid SDK `formatPrice` with asset `szDecimals`, fixing `Price must be divisible by tick size`.
- Default BTC test order size is `0.0002`, keeping notional above Hyperliquid's `10` USDC minimum.
- Dry-run now reports notional and blocks execution if order value is too small.
- Builder-fee dry-run now checks `maxBuilderFee` instead of using a static blocker.
- Hyperliquid info calls now retry transient testnet RPC failures in status, order, and close dry-run scripts.
- Reduce-only close dry-run is available with `npm run testnet:position:close:dry-run`.

## Authorization Status

- API wallet trading authorization for `0xE59466C744c919D36B13F4dd7C673b582727848D`: user reported approved, and the real BTC IOC test order proves the route can trade.
- Builder fee approval for `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`: confirmed active at max fee `10`.
- Perps funding: confirmed funded; account value is above zero.

Hermit can now execute small Hyperliquid testnet orders with the approved API wallet. Builder-fee order execution can be enabled by setting `HERMIT_ORDER_INCLUDE_BUILDER=true` or by running the dry-run path with `npm run testnet:order:dry-run:builder`. The current BTC test position can be cleaned up with `npm run testnet:position:close:execute -- --coin=BTC` when desired.
