# Hermit Agent Generation Flow

This is the standard process for turning a public trader/persona into a Hyperliquid testnet-ready portfolio manager.

## 1. Public-Source Intake

Collect public posts, reported positions, attributed wallets, linked analytics pages, and contradictions. Every extracted claim must keep its source URL and confidence level.

Required output:

- Public evidence table.
- Known assets and venues.
- Known leverage range.
- Known failure modes.

## 2. Strategy Distillation

Translate the public behavior into a safe, explicit trading policy.

Required output:

- Entry signals.
- Add or roll conditions.
- Stop loss.
- Max drawdown clear threshold.
- Cooling period.
- Markets allowed.
- Leverage cap.

## 3. Mock-Position Validation

Create a mock portfolio and validate it against the strategy. If the public trader uses 40x leverage, the launch portfolio may use a lower cap, but the rationale must be documented.

Required output:

- Position list.
- Leverage and liquidation buffer.
- Why each position exists.
- Validation notes.

## 4. Mandate and Wallet Authorization

The user hires an agent through a mandate:

- Wallet connection: MetaMask, WalletConnect, or Hyperliquid native path.
- Max leverage, not above the agent cap.
- Lock period, not below the agent minimum.
- Cooling period, 24 hours to 7 days.
- Main wallet signs Hyperliquid builder fee approval.
- API wallet handles future signed orders after approval.

## 5. Testnet Execution

The first live milestone is small-size testnet execution, not production capital.

Required output:

- Funded testnet account.
- Approved API wallet.
- Builder fee approval for Hermit revenue wallet.
- Signed update leverage action.
- Signed order action with builder field.
- Fill reconciliation and decision log entry.

## 6. Revenue Settlement

Revenue routes to:

`0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`

Revenue sources:

- Builder fee on fills routed through Hermit.
- Carry on positive realized PnL for the fixed period.
- Service fee calculated after unlock and deducted from USDC.

## 7. Ongoing Audit

Each agent decision must record:

- Timestamp.
- Signal.
- Chosen action.
- Risk checks.
- Expected failure mode.
- Result after fill or cancellation.
