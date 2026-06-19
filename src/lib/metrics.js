export function currency(value) {
  return `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function pct(value, digits = 2) {
  return `${Number(value).toFixed(digits)}%`;
}

export function calculateSharpe(returns) {
  if (!returns.length) return 0;
  const avg = returns.reduce((sum, item) => sum + item, 0) / returns.length;
  const variance =
    returns.reduce((sum, item) => sum + Math.pow(item - avg, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);
  if (!volatility) return 0;
  return (avg / volatility) * Math.sqrt(365);
}

export function calculateMaxDrawdown(returns) {
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  for (const dailyReturn of returns) {
    equity *= 1 + dailyReturn;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
  }
  return maxDrawdown;
}

export function calculatePortfolio(agent, allocationUsd) {
  const scale = agent.holdingUsd ? allocationUsd / agent.holdingUsd : 1;
  const notional =
    agent.positions.reduce((sum, position) => sum + position.notionalUsd, 0) * scale;
  const margin = agent.positions.reduce((sum, position) => sum + position.marginUsd, 0) * scale;
  const pnl = agent.positions.reduce((sum, position) => sum + position.pnlUsd, 0) * scale;
  return {
    allocationUsd,
    notional,
    margin,
    pnl,
    pnlPct: allocationUsd ? (pnl / allocationUsd) * 100 : 0,
    utilizationPct: allocationUsd ? (margin / allocationUsd) * 100 : 0,
    sharpe: calculateSharpe(agent.returns),
    maxDrawdownPct: calculateMaxDrawdown(agent.returns) * 100,
    btcReturnPct:
      (agent.btcBenchmark.reduce((equity, dailyReturn) => equity * (1 + dailyReturn), 1) - 1) *
      100
  };
}
