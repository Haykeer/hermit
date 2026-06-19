# Testnet Agent Flow Audit

Last run: 2026-06-19

Command:

```bash
npm run testnet:agent-flow:audit
```

Verdict: `ready`

## Evidence Summary

- Agent: `hermit-james-wynn-testnet`
- Master wallet: `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`
- API wallet: `0xE59466C744c919D36B13F4dd7C673b582727848D`
- Builder wallet: `0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f`
- Account value sampled by audit: `1325.786352`
- Builder fee approval: `maxBuilderFee = 10`
- Open testnet position: `BTC` long `0.0002`, entry `64220.0`, sampled position value `12.6256`
- Existing additional position: `ETH` short `-3.345`

## Passing Checks

- `.env.local` is loaded.
- API wallet private key derives the configured API wallet address.
- Master wallet perps account is funded above the minimum.
- Required BTC testnet position is open at or above `0.0002`.
- Builder-fee order dry-run includes the Hermit builder wallet and has no blockers.
- BTC reduce-only close dry-run has no blockers and sells the open long position.

The audit does not submit a new order. It proves the current testnet account can continue the James Wynn agent flow and can clean up the BTC test position when needed.
