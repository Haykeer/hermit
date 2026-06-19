# James Wynn Agent Research

This document turns the public-source intake into a launchable testnet policy. It is not an endorsement of Wynn's risk profile; it is a controlled agent design that copies the observable shape while adding explicit guardrails.

## Source Intake

- Cointelegraph reported that James Wynn increased a Hyperliquid BTC long to about $1.25B using 40x leverage after closing a PEPE position for about $25.2M profit. Source: https://cointelegraph.com/news/james-wynn-bitcoin-leverage-position-hyperliquid/
- Cointelegraph also reported almost $100M in BTC long liquidations after BTC moved below $105K, plus later partial manual closes to lower liquidation risk. Sources: https://cointelegraph.com/news/hyperliquid-whale-loss-100-million-bitcoin-dips-below-105 and https://cointelegraph.com/news/crypto-leverage-trader-james-wynn-loses-25m-bitcoin-bet
- Decrypt covered the same tracked wallet and Arkham attribution, emphasizing the 40x leveraged BTC exposure and liquidation path. Source: https://decrypt.co/322938/hyperliquid-trader-liquidated-100-million-bitcoin-bet-unravels?amp=1
- CoinDesk's PEPE archive summarizes Wynn rotating into PEPE after BTC losses and describes the public debate about whether the account is a risk-taking trader or a marketing magnet. Source: https://www.coindesk.com/tag/pepe/

## Distilled Strategy

The James Wynn Agent should not simply maximize leverage. It should express:

- Momentum continuation on BTC and ETH.
- Opportunistic HYPE or memecoin beta after major-market confirmation.
- Rolling exposure after winners, not static passive holding.
- Visible decision logging because public high-leverage strategies need post-trade auditability.

## Testnet Guardrails

- Production launch cap: 25x, even though public reports describe 40x BTC usage.
- Target markets: BTC, ETH, HYPE.
- Entry signal: 20 EMA above 50 EMA, price above 4h value-area high, funding below crowding threshold.
- Add condition: add 20% notional only after 1.5 ATR favorable move and no utilization breach.
- Stop loss: reduce when liquidation buffer drops below 2.2% or when price loses 1.2 ATR.
- Kill-switch: flatten at 14% account drawdown from high-water mark.
- Cooldown: 48 hours by default; user mandate may set 24 hours to 7 days.

## Mock Book Validation

The current app mock book uses BTC 25x, ETH 25x, and HYPE 20x. This matches the high-leverage rolling style while avoiding a raw 40x launch profile. It also aligns with the requested BTC/ETH/HYPE rolling-position framing.

## Open Requirement

Live testnet execution still requires the user-provided funded testnet account and API wallet setup. The app now exposes the builder-fee and sample order payloads, but it deliberately does not store private keys in the frontend.
