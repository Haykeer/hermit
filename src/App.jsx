import React, { useMemo, useState } from "react";
import { agentGenerationFlow, agents, builderWallet } from "./data/agents.js";
import { calculateExitPenalty, calculateRevenue } from "./lib/fees.js";
import {
  buildApproveBuilderFeeAction,
  buildOrderAction,
  approveBuilderFeeWithMetaMask,
  connectMetaMask,
  connectMockWallet,
  hyperliquidConfig
} from "./lib/hyperliquid.js";
import { calculatePortfolio, currency, pct } from "./lib/metrics.js";
import {
  dryRunTestnetClose,
  dryRunTestnetOrder,
  fetchTestnetStatus,
  signerConfig
} from "./lib/signer.js";

const walletModes = [
  { id: "metamask", label: "MetaMask" },
  { id: "walletconnect", label: "WalletConnect" },
  { id: "hyperliquid", label: "Hyperliquid native" }
];

const testnetAssetIds = {
  BTC: 3,
  ETH: 4,
  HYPE: 135
};

export function App() {
  const [activeAgentId, setActiveAgentId] = useState("james-wynn");
  const [walletState, setWalletState] = useState(null);
  const [walletError, setWalletError] = useState("");
  const [hireAgentId, setHireAgentId] = useState(null);
  const [builderApproval, setBuilderApproval] = useState({
    status: "idle",
    message: "Not approved in this session."
  });
  const [testnetRuntime, setTestnetRuntime] = useState({
    status: "idle",
    action: "Not connected to signer service.",
    data: null
  });
  const [hireConfig, setHireConfig] = useState({
    allocationUsd: 25000,
    maxLeverage: 3,
    lockDays: 60,
    coolingHours: 72
  });
  const [portfolio, setPortfolio] = useState(null);

  const activeAgent = agents.find((agent) => agent.id === activeAgentId) || agents[0];
  const hireAgent = agents.find((agent) => agent.id === hireAgentId);
  const jamesAgent = agents.find((agent) => agent.id === "james-wynn");
  const burryAgent = agents.find((agent) => agent.id === "michael-burry");

  const aggregate = useMemo(() => {
    const holding = agents.reduce((sum, agent) => sum + agent.holdingUsd, 0);
    const pnl = agents.reduce((sum, agent) => sum + agent.pnlUsd, 0);
    return { holding, pnl };
  }, []);

  const portfolioMetrics = portfolio
    ? calculatePortfolio(portfolio.agent, portfolio.allocationUsd)
    : calculatePortfolio(jamesAgent, 100000);

  const revenue = calculateRevenue({
    volumeUsd: portfolioMetrics.notional,
    builderFeeTenthsBps: portfolio?.agent.builderFeeTenthsBps || jamesAgent.builderFeeTenthsBps,
    realizedPnlUsd: portfolioMetrics.pnl,
    carryRate: portfolio?.agent.id === "michael-burry" ? 0.12 : 0.18,
    allocationUsd: portfolioMetrics.allocationUsd,
    serviceFeeApr: portfolio?.agent.id === "michael-burry" ? 0.008 : 0.01,
    lockDays: portfolio?.lockDays || jamesAgent.minLockDays
  });

  const penalty = calculateExitPenalty({
    closeAmountUsd: portfolioMetrics.notional,
    remainingLockDays: portfolio?.lockDays ? Math.ceil(portfolio.lockDays * 0.65) : 21,
    totalLockDays: portfolio?.lockDays || 60,
    realizedPnlUsd: portfolioMetrics.pnl
  });

  async function connectWallet(mode) {
    setWalletError("");
    try {
      if (mode === "metamask") {
        setWalletState(await connectMetaMask());
      } else {
        setWalletState(connectMockWallet(mode));
      }
    } catch (error) {
      setWalletError(error.message);
    }
  }

  function openHire(agent) {
    setHireAgentId(agent.id);
    setHireConfig({
      allocationUsd: agent.id === "michael-burry" ? 25000 : 10000,
      maxLeverage: agent.id === "michael-burry" ? 2 : Math.min(agent.maxLeverage, 10),
      lockDays: agent.minLockDays,
      coolingHours: agent.defaultCoolingHours
    });
  }

  function confirmHire() {
    setPortfolio({
      agent: hireAgent,
      allocationUsd: Number(hireConfig.allocationUsd),
      maxLeverage: Number(hireConfig.maxLeverage),
      lockDays: Number(hireConfig.lockDays),
      coolingHours: Number(hireConfig.coolingHours),
      createdAt: new Date().toISOString()
    });
    setActiveAgentId(hireAgent.id);
    setHireAgentId(null);
  }

  async function handleApproveBuilderFee() {
    setBuilderApproval({
      status: "pending",
      message: "Waiting for MetaMask signature and Hyperliquid confirmation..."
    });
    try {
      const response = await approveBuilderFeeWithMetaMask({
        expectedAddress: hyperliquidConfig.masterAddress,
        builder: builderWallet,
        maxFeeRate: `${activeAgent.builderFeeTenthsBps / 1000}%`
      });
      setBuilderApproval({
        status: "ok",
        message: `Builder fee approved. Response: ${JSON.stringify(response)}`
      });
    } catch (error) {
      console.error("Builder fee approval failed", error);
      setBuilderApproval({
        status: "error",
        message: `${formatError(error)}\n\nRaw error:\n${stringifyErrorPart(error)}`
      });
    }
  }

  async function runSignerAction(action, label) {
    setTestnetRuntime({
      status: "pending",
      action: label,
      data: null
    });
    try {
      const data = await action();
      setTestnetRuntime({
        status: "ok",
        action: label,
        data
      });
    } catch (error) {
      setTestnetRuntime({
        status: "error",
        action: label,
        data: error.data || { error: error.message }
      });
    }
  }

  const approveBuilderFeePayload = buildApproveBuilderFeeAction({
    maxFeeTenthsBps: activeAgent.builderFeeTenthsBps
  });
  const sampleOrder = buildOrderAction({
    assetId: testnetAssetIds[activeAgent.positions[0].symbol] ?? 0,
    isBuy: true,
    price: activeAgent.positions[0].mark,
    size: "0.001",
    builderFeeTenthsBps: activeAgent.builderFeeTenthsBps
  });

  return (
    <main className="app-shell">
      <section className="top-bar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Icon name="activity" />
          </span>
          <div>
            <p className="eyebrow">Hermit testnet console</p>
            <h1>Agent launch room</h1>
          </div>
        </div>
        <nav className="top-nav" aria-label="Primary">
          <a href="#agents">Agents</a>
          <a href="#portfolio">Portfolio</a>
          <a href="#hip3">HIP-3</a>
          <a href="#execution">Execution</a>
          <a href={hyperliquidConfig.testnetApp} target="_blank" rel="noreferrer">
            Testnet
          </a>
        </nav>
        <div className="top-actions">
          <button className="btn primary" onClick={() => connectWallet("metamask")}>
            <Icon name="wallet" />
            Connect
          </button>
          <button className="btn" onClick={() => openHire(burryAgent)}>
            <Icon name="briefcase" />
            Hire
          </button>
        </div>
      </section>

      <section className="status-grid">
        <Metric label="Total holding" value={currency(aggregate.holding)} />
        <Metric label="Aggregate PnL" value={`+${currency(aggregate.pnl)}`} tone="up" />
        <Metric label="Revenue wallet" value={builderWallet.slice(0, 10) + "..."} />
        <Metric label="Live mode" value={hyperliquidConfig.liveEnabled ? "Enabled" : "Simulation"} tone="warn" />
      </section>

      <section className="workspace" id="agents">
        <aside className="side-panel">
          <h2>Wallet authorization</h2>
          <p>
            Builder fee approval must be signed by the user's main wallet. API wallets are for later
            order execution.
          </p>
          <div className="wallet-buttons">
            {walletModes.map((mode) => (
              <button key={mode.id} className="btn" onClick={() => connectWallet(mode.id)}>
                <Icon name="wallet" />
                {mode.label}
              </button>
            ))}
          </div>
          {walletState ? (
            <div className="notice ok">
              <strong>{walletState.type}</strong>
              <span>{walletState.address}</span>
              <small>{walletState.status}</small>
            </div>
          ) : null}
          {walletError ? <div className="notice danger">{walletError}</div> : null}

          <h2>Agent factory</h2>
          <ol className="flow-list">
            {agentGenerationFlow.map((step) => (
              <li key={step.name}>
                <strong>{step.name}</strong>
                <span>{step.output}</span>
                <small>{step.jamesWynnStatus}</small>
              </li>
            ))}
          </ol>
        </aside>

        <section className="main-panel">
          <div className="agent-tabs">
            {agents.map((agent) => (
              <button
                key={agent.id}
                className={agent.id === activeAgentId ? "tab active" : "tab"}
                onClick={() => setActiveAgentId(agent.id)}
              >
                {agent.name}
              </button>
            ))}
          </div>

          <AgentDetail agent={activeAgent} onHire={() => openHire(activeAgent)} />

          <div className="split-grid">
            <PortfolioPanel
              portfolio={portfolio}
              metrics={portfolioMetrics}
              revenue={revenue}
              penalty={penalty}
            />
            <Hip3Panel
              approveBuilderFeeAction={approveBuilderFeePayload}
              approvalState={builderApproval}
              sampleOrder={sampleOrder}
              onApproveBuilderFee={handleApproveBuilderFee}
            />
          </div>
          <TestnetExecutionPanel
            runtime={testnetRuntime}
            onRefreshStatus={() => runSignerAction(fetchTestnetStatus, "Refresh testnet status")}
            onDryRunOrder={() => runSignerAction(() => dryRunTestnetOrder({ includeBuilder: false }), "Dry-run James BTC order")}
            onDryRunBuilderOrder={() =>
              runSignerAction(() => dryRunTestnetOrder({ includeBuilder: true }), "Dry-run James BTC order with builder fee")
            }
            onDryRunClose={() => runSignerAction(() => dryRunTestnetClose({ coin: "BTC" }), "Dry-run BTC reduce-only close")}
          />
        </section>
      </section>

      {hireAgent ? (
        <HireModal
          agent={hireAgent}
          config={hireConfig}
          setConfig={setHireConfig}
          onClose={() => setHireAgentId(null)}
          onConfirm={confirmHire}
        />
      ) : null}
    </main>
  );
}

function formatError(error) {
  const parts = [];
  const push = (value) => {
    const text = stringifyErrorPart(value);
    if (text && !parts.includes(text)) {
      parts.push(text);
    }
  };

  if (error instanceof Error) {
    push(error.shortMessage);
    push(error.message);
  } else if (error && typeof error === "object") {
    if (error.code === 4001) {
      push("MetaMask signature request was rejected. Click the button again and confirm the signature in MetaMask.");
    }
    push(error.shortMessage);
    push(error.message);
    push(error.details);
  } else {
    push(String(error || "Unknown builder approval error"));
  }

  push(error?.cause?.shortMessage);
  push(error?.cause?.message);
  push(error?.details);

  if (!parts.length) {
    return "Unknown builder approval error";
  }

  return parts.join(" Detail: ");
}

function stringifyErrorPart(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Error) {
    return stringifyObject({
      name: value.name,
      message: value.message,
      shortMessage: value.shortMessage,
      details: value.details,
      code: value.code,
      data: value.data,
      cause: value.cause,
      ...Object.fromEntries(Object.getOwnPropertyNames(value).map((key) => [key, value[key]]))
    });
  }

  return stringifyObject(value);
}

function stringifyObject(value) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (_key, nestedValue) => {
        if (nestedValue instanceof Error) {
          return {
            name: nestedValue.name,
            message: nestedValue.message,
            shortMessage: nestedValue.shortMessage,
            details: nestedValue.details,
            cause: nestedValue.cause
          };
        }
        if (nestedValue && typeof nestedValue === "object") {
          if (seen.has(nestedValue)) {
            return "[Circular]";
          }
          seen.add(nestedValue);
        }
        return nestedValue;
      },
      2
    );
  } catch {
    return String(value);
  }
}

function TestnetExecutionPanel({
  runtime,
  onRefreshStatus,
  onDryRunOrder,
  onDryRunBuilderOrder,
  onDryRunClose
}) {
  const positions = runtime.data?.perpPositions || [];
  return (
    <article className="panel execution-panel" id="execution">
      <div className="section-head compact">
        <div>
          <h2>Testnet execution</h2>
          <p>Local signer service: {signerConfig.baseUrl}. Browser never receives the API wallet key.</p>
        </div>
        <Icon name="activity" />
      </div>
      <div className="execution-actions">
        <button className="btn primary" disabled={runtime.status === "pending"} onClick={onRefreshStatus}>
          <Icon name="refresh" />
          Refresh status
        </button>
        <button className="btn" disabled={runtime.status === "pending"} onClick={onDryRunOrder}>
          <Icon name="file" />
          Dry-run order
        </button>
        <button className="btn" disabled={runtime.status === "pending"} onClick={onDryRunBuilderOrder}>
          <Icon name="shield" />
          Dry-run builder
        </button>
        <button className="btn danger" disabled={runtime.status === "pending"} onClick={onDryRunClose}>
          <Icon name="user-x" />
          Dry-run close
        </button>
      </div>
      <div
        className={
          runtime.status === "error" ? "notice danger" : runtime.status === "ok" ? "notice ok" : "notice"
        }
      >
        {runtime.status === "pending" ? "Waiting for signer service response..." : runtime.action}
      </div>
      {positions.length ? (
        <div className="mini-grid execution-positions">
          {positions.map((position) => (
            <Metric
              key={position.coin}
              label={`${position.coin} position`}
              value={`${position.size} @ ${position.entryPx}`}
              tone={Number(position.unrealizedPnl || 0) >= 0 ? "up" : "down"}
            />
          ))}
        </div>
      ) : null}
      {runtime.data ? <CodeBlock title="Signer response" data={runtime.data} /> : null}
    </article>
  );
}

function Metric({ label, value, tone }) {
  return (
    <article className="metric">
      <label>{label}</label>
      <strong className={tone || ""}>{value}</strong>
    </article>
  );
}

function AgentDetail({ agent, onHire }) {
  return (
    <article className="agent-detail">
      <div className="section-head">
        <div>
          <p className="eyebrow">{agent.status}</p>
          <h2>{agent.name}</h2>
          <p>{agent.about}</p>
        </div>
        <button className="btn primary" onClick={onHire}>
          <Icon name="briefcase" />
          Hire agent
        </button>
      </div>
      <div className="strategy-grid">
        <Metric label="Style" value={agent.style} />
        <Metric
          label="Max leverage"
          value={`${agent.maxLeverage}x`}
          tone={agent.maxLeverage > 10 ? "danger-text" : ""}
        />
        <Metric label="Minimum lock" value={`${agent.minLockDays} days`} />
        <Metric label="Cooling period" value={`${agent.defaultCoolingHours}h`} />
      </div>
      <div className="strategy-block">
        <h3>Trading strategy</h3>
        <p>{agent.strategy.thesis}</p>
        <div className="strategy-columns">
          <RuleList title="Entry signals" items={agent.strategy.entrySignals} />
          <RuleList title="Add conditions" items={agent.strategy.addConditions} />
          <div>
            <h4>Risk exits</h4>
            <p>{agent.strategy.stopLoss}</p>
            <p>{agent.strategy.maxDrawdownClear}</p>
            <p>{agent.strategy.coolingPeriod}</p>
          </div>
        </div>
      </div>
      <PositionsTable positions={agent.positions} />
      <DecisionLog logs={agent.decisionLog} />
    </article>
  );
}

function RuleList({ title, items }) {
  return (
    <div>
      <h4>{title}</h4>
      <ul className="compact-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PositionsTable({ positions }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Side</th>
            <th>Lev</th>
            <th>Notional</th>
            <th>Margin</th>
            <th>PnL</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((position) => (
            <tr key={`${position.symbol}-${position.side}`}>
              <td>{position.symbol}</td>
              <td>{position.side}</td>
              <td>{position.leverage}x</td>
              <td>{currency(position.notionalUsd)}</td>
              <td>{currency(position.marginUsd)}</td>
              <td className={position.pnlUsd >= 0 ? "up" : "down"}>
                {position.pnlUsd >= 0 ? "+" : ""}
                {currency(position.pnlUsd)}
              </td>
              <td>{position.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DecisionLog({ logs }) {
  return (
    <div className="decision-log">
      <h3>Agent decision record</h3>
      {logs.map((log) => (
        <article key={`${log.time}-${log.action}`}>
          <strong>{log.action}</strong>
          <span>{log.time}</span>
          <p>{log.reason}</p>
          <small>
            {log.signal} | {log.riskCheck}
          </small>
        </article>
      ))}
    </div>
  );
}

function PortfolioPanel({ portfolio, metrics, revenue, penalty }) {
  return (
    <article className="panel" id="portfolio">
      <div className="section-head compact">
        <div>
          <h2>Portfolio performance</h2>
          <p>{portfolio ? `${portfolio.agent.name} hired` : "Using James Wynn mock portfolio"}</p>
        </div>
        <Icon name="activity" />
      </div>
      <div className="mini-grid">
        <Metric label="PnL" value={`${metrics.pnl >= 0 ? "+" : ""}${currency(metrics.pnl)} (${pct(metrics.pnlPct)})`} tone={metrics.pnl >= 0 ? "up" : "down"} />
        <Metric label="Utilization" value={pct(metrics.utilizationPct)} />
        <Metric label="Sharpe" value={metrics.sharpe.toFixed(2)} />
        <Metric label="Max drawdown" value={pct(metrics.maxDrawdownPct)} tone="down" />
        <Metric label="BTC benchmark" value={pct(metrics.btcReturnPct)} />
        <Metric label="Notional" value={currency(metrics.notional)} />
      </div>
      <div className="fee-box">
        <h3>Revenue and penalty model</h3>
        <p>Builder fees, carry, and service fees route to {revenue.receiver}.</p>
        <ul className="compact-list">
          <li>Builder fee: {currency(revenue.builderFeeUsd)}</li>
          <li>Carry after close: {currency(revenue.carryUsd)}</li>
          <li>Service fee after unlock: {currency(revenue.serviceFeeUsd)}</li>
          <li>Early switch/fire penalty: {currency(penalty.totalPenaltyUsd)}</li>
        </ul>
        <button className="btn danger">
          <Icon name="user-x" />
          Simulate fire agent
        </button>
      </div>
    </article>
  );
}

function Hip3Panel({ approveBuilderFeeAction, approvalState, sampleOrder, onApproveBuilderFee }) {
  const builderFeeEnabled = sampleOrder.builderFeeEnabled;
  return (
    <article className="panel" id="hip3">
      <div className="section-head compact">
        <div>
          <h2>HIP-3 and builder fee route</h2>
          <p>Prepared for testnet execution with the approved API wallet and local signer service.</p>
        </div>
        <Icon name="shield" />
      </div>
      <div className={builderFeeEnabled ? "notice ok" : "notice warn"}>
        {builderFeeEnabled
          ? "Builder fee approval is active on testnet. The local signer can dry-run builder-routed orders without exposing the API wallet key."
          : "Builder fee approval is active, but this browser build is showing the no-builder sample order. Use the local signer builder dry-run for the live route."}
      </div>
      <button
        className="btn primary approve-builder-btn"
        disabled={approvalState.status === "pending"}
        onClick={onApproveBuilderFee}
      >
        <Icon name="shield" />
        {approvalState.status === "pending" ? "Approving..." : "Approve builder fee"}
      </button>
      <div className={approvalState.status === "error" ? "notice danger" : approvalState.status === "ok" ? "notice ok" : "notice"}>
        {approvalState.message}
      </div>
      <CodeBlock title="Main-wallet approval" data={approveBuilderFeeAction} />
      <CodeBlock
        title={sampleOrder.builderFeeEnabled ? "Sample order with builder fee" : "Sample order without builder fee"}
        data={sampleOrder}
      />
    </article>
  );
}

function CodeBlock({ title, data }) {
  return (
    <div className="code-block">
      <h3>
        <Icon name="file" />
        {title}
      </h3>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function HireModal({ agent, config, setConfig, onClose, onConfirm }) {
  const lockTooShort = Number(config.lockDays) < agent.minLockDays;
  const coolingInvalid = Number(config.coolingHours) < 24 || Number(config.coolingHours) > 168;
  const leverageInvalid = Number(config.maxLeverage) < 1 || Number(config.maxLeverage) > agent.maxLeverage;
  const invalid = lockTooShort || coolingInvalid || leverageInvalid || Number(config.allocationUsd) < 100;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="section-head compact">
          <div>
            <h2>Hire {agent.name}</h2>
            <p>Configure the portfolio manager mandate before HIP-3 authorization.</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>
        <FormRow label="Initial allocation USDC">
          <input
            type="number"
            min="100"
            step="100"
            value={config.allocationUsd}
            onChange={(event) => setConfig({ ...config, allocationUsd: event.target.value })}
          />
        </FormRow>
        <FormRow label={`Max leverage, cap ${agent.maxLeverage}x`}>
          <input
            type="range"
            min="1"
            max={agent.maxLeverage}
            value={config.maxLeverage}
            onChange={(event) => setConfig({ ...config, maxLeverage: event.target.value })}
          />
          <strong>{config.maxLeverage}x</strong>
        </FormRow>
        <FormRow label={`Lock period, minimum ${agent.minLockDays} days`}>
          <input
            type="number"
            min={agent.minLockDays}
            value={config.lockDays}
            onChange={(event) => setConfig({ ...config, lockDays: event.target.value })}
          />
          {lockTooShort ? <small className="field-error">Below minimum lock period.</small> : null}
        </FormRow>
        <FormRow label="Cooling period, 24h to 7d">
          <input
            type="number"
            min="24"
            max="168"
            value={config.coolingHours}
            onChange={(event) => setConfig({ ...config, coolingHours: event.target.value })}
          />
          {coolingInvalid ? <small className="field-error">Cooling period must be 24 to 168 hours.</small> : null}
        </FormRow>
        <div className="notice ok">
          This creates a simulated mandate now. Live mode will request main-wallet builder approval,
          then use an approved API wallet for testnet orders.
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={invalid} onClick={onConfirm}>
            <Icon name="refresh" />
            Confirm hire
          </button>
        </div>
      </article>
    </div>
  );
}

function FormRow({ label, children }) {
  return (
    <label className="form-row">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Icon({ name }) {
  return <span className={`icon icon-${name}`} aria-hidden="true" />;
}
