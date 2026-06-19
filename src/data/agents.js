export const builderWallet =
  import.meta.env.VITE_HERMIT_BUILDER_WALLET ||
  "0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f";

export const agentGenerationFlow = [
  {
    name: "Public-source intake",
    output: "Claims, wallets, public posts, trade history, caveats",
    jamesWynnStatus: "Seeded from Cointelegraph, Decrypt, Hyperdash/Hypurrscan reporting"
  },
  {
    name: "Strategy distillation",
    output: "Entry signals, add rules, stop loss, drawdown kill-switch, cooldown",
    jamesWynnStatus: "High-leverage BTC/ETH/HYPE momentum with strict production guardrails"
  },
  {
    name: "Mock-position validation",
    output: "Positions aligned with observed style and explicit risk caps",
    jamesWynnStatus: "BTC/ETH/HYPE rolling book capped at 25x for testnet launch"
  },
  {
    name: "Decision journal",
    output: "Machine-readable records for every signal, order, and risk override",
    jamesWynnStatus: "Implemented as initial agent decision log"
  },
  {
    name: "Testnet execution",
    output: "API wallet, builder fee approval, signed orders, and reconciled fills",
    jamesWynnStatus: "API wallet approved; BTC testnet position opened and signer dry-runs verified"
  }
];

export const agents = [
  {
    id: "james-wynn",
    name: "James Wynn Agent",
    status: "Testnet live candidate",
    style: "High-leverage momentum roll",
    riskBand: "Very high",
    minLockDays: 14,
    maxLeverage: 25,
    defaultCoolingHours: 48,
    feeModel: "1.0% service APR + 18% carry",
    builderFeeTenthsBps: 10,
    followers: 1084,
    holdingUsd: 1180000,
    pnlUsd: 182400,
    pnlPct: 18.7,
    about:
      "James Wynn Agent is a testnet-only high-beta momentum manager. It watches BTC, ETH, and HYPE for breakout continuation, rolling exposure only when momentum, funding, and liquidation-distance checks agree.",
    strategy: {
      thesis:
        "Public reporting around Wynn shows a trader who concentrated into large Hyperliquid perp positions, used extreme leverage, flipped between directional views, and pressed winners after closing PEPE profit. The production agent copies the momentum and rolling-position shape, but caps leverage at 25x for testnet safety.",
      entrySignals: [
        "BTC or ETH 20 EMA above 50 EMA with price reclaiming the prior 4h value area high",
        "HYPE relative strength exceeds BTC by 8% over 24h while open interest expands",
        "Funding is positive but below crowded-trade threshold, avoiding late entries",
        "Liquidation buffer remains above 2.8% after the proposed add"
      ],
      addConditions: [
        "Add 20% notional after mark price closes 1.5 ATR above entry",
        "Roll profits into HYPE only if BTC and ETH remain above trailing VWAP",
        "Never add while unrealized drawdown exceeds 6% or funding spikes above policy"
      ],
      stopLoss:
        "Initial stop at 1.2 ATR or when liquidation buffer falls below 2.2%; reduce first, then flatten if the second check also fails.",
      maxDrawdownClear:
        "Clear all positions and enter cooldown when account drawdown reaches 14% from high-water mark.",
      coolingPeriod:
        "48 hours after a forced flatten, configurable between 24 hours and 7 days for hired portfolios.",
      validation:
        "Mock book uses 25x BTC, 25x ETH, and 20x HYPE rolling positions, matching the high-leverage habit while staying below the 40x public reports for launch safety."
    },
    positions: [
      {
        symbol: "BTC",
        side: "Long",
        leverage: 25,
        notionalUsd: 520000,
        marginUsd: 20800,
        entry: 106200,
        mark: 109450,
        pnlUsd: 39800,
        liquidationBufferPct: 3.1,
        reason: "20/50 EMA trend continuation and 4h breakout reclaim."
      },
      {
        symbol: "ETH",
        side: "Long",
        leverage: 25,
        notionalUsd: 360000,
        marginUsd: 14400,
        entry: 3820,
        mark: 3975,
        pnlUsd: 14600,
        liquidationBufferPct: 3.4,
        reason: "ETH beta follow-through after BTC breakout confirmation."
      },
      {
        symbol: "HYPE",
        side: "Long",
        leverage: 20,
        notionalUsd: 220000,
        marginUsd: 11000,
        entry: 58.4,
        mark: 63.8,
        pnlUsd: 20300,
        liquidationBufferPct: 4.2,
        reason: "HYPE relative strength and ecosystem momentum."
      }
    ],
    decisionLog: [
      {
        time: "T-02:40",
        action: "Opened BTC 25x long",
        signal: "4h momentum reclaim",
        reason:
          "Price reclaimed prior value-area high while 20 EMA stayed above 50 EMA; builder-fee route set to Hermit wallet.",
        riskCheck: "Liquidation buffer 3.1%, within policy"
      },
      {
        time: "T-01:10",
        action: "Added ETH 25x long",
        signal: "Beta confirmation",
        reason:
          "ETH followed BTC breakout with lower funding than HYPE, giving cleaner second-leg exposure.",
        riskCheck: "Account utilization below 72%"
      },
      {
        time: "T-00:25",
        action: "Rolled realized BTC profit into HYPE",
        signal: "Relative strength",
        reason:
          "HYPE outperformed BTC over 24h and remained above intraday VWAP; size capped at 20x.",
        riskCheck: "Drawdown from high-water mark 3.8%"
      }
    ],
    returns: [0.01, -0.004, 0.022, 0.018, -0.011, 0.031, 0.009, -0.006, 0.025, 0.014],
    btcBenchmark: [0.006, -0.002, 0.012, 0.009, -0.008, 0.014, 0.004, -0.004, 0.011, 0.006]
  },
  {
    id: "michael-burry",
    name: "Michael Burry Agent",
    status: "Hire-ready",
    style: "Contrarian hedge overlays",
    riskBand: "Medium",
    minLockDays: 60,
    maxLeverage: 3,
    defaultCoolingHours: 72,
    feeModel: "0.8% service APR + 12% carry",
    builderFeeTenthsBps: 8,
    followers: 403,
    holdingUsd: 780000,
    pnlUsd: 38100,
    pnlPct: 4.12,
    about:
      "Contrarian portfolio manager for users who want asymmetric setups, hedged shorts, and lower turnover than the James Wynn high-beta agent.",
    strategy: {
      thesis:
        "Waits for consensus one-way positioning, then builds hedged dislocation trades with small leverage and cash reserves.",
      entrySignals: [
        "Funding imbalance above policy threshold",
        "Risk asset rally with weakening breadth",
        "Asset trades above 2 standard deviations from 30d mean"
      ],
      addConditions: [
        "Add only after borrow/funding cost remains favorable",
        "Pair long value legs with short overextended beta"
      ],
      stopLoss: "Reduce if thesis invalidates or if drawdown reaches 7%.",
      maxDrawdownClear: "Flatten at 10% drawdown from high-water mark.",
      coolingPeriod: "72 hours after forced flatten.",
      validation: "Mock book favors XLE, TSLA short, and ETH hedge at low leverage."
    },
    positions: [
      {
        symbol: "XLE",
        side: "Long",
        leverage: 1.4,
        notionalUsd: 210000,
        marginUsd: 150000,
        entry: 88.2,
        mark: 91.7,
        pnlUsd: 8120,
        liquidationBufferPct: 28,
        reason: "Energy dislocation with controlled downside."
      },
      {
        symbol: "TSLA",
        side: "Short",
        leverage: 1.5,
        notionalUsd: 170000,
        marginUsd: 113333,
        entry: 360,
        mark: 346,
        pnlUsd: 6410,
        liquidationBufferPct: 25,
        reason: "Crowded upside positioning faded."
      },
      {
        symbol: "ETH",
        side: "Long",
        leverage: 1.3,
        notionalUsd: 120000,
        marginUsd: 92308,
        entry: 4020,
        mark: 3940,
        pnlUsd: -2320,
        liquidationBufferPct: 30,
        reason: "Crypto beta hedge for short book."
      }
    ],
    decisionLog: [
      {
        time: "T-03:00",
        action: "Opened TSLA short",
        signal: "Crowding fade",
        reason: "Momentum stalled while funding and sentiment were stretched.",
        riskCheck: "Pair hedge active"
      }
    ],
    returns: [0.002, 0.006, -0.003, 0.008, 0.004, -0.001, 0.007, 0.003, -0.002, 0.005],
    btcBenchmark: [0.006, -0.002, 0.012, 0.009, -0.008, 0.014, 0.004, -0.004, 0.011, 0.006]
  }
];
