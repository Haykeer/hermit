export const revenueWallet =
  import.meta.env.VITE_HERMIT_BUILDER_WALLET ||
  "0x4419f739aa8d9e9098fe85caaf58af46ea0ac41f";

export function calculateRevenue({
  volumeUsd,
  builderFeeTenthsBps,
  realizedPnlUsd,
  carryRate,
  allocationUsd,
  serviceFeeApr,
  lockDays
}) {
  const builderFeeUsd = volumeUsd * (builderFeeTenthsBps / 10 / 10000);
  const carryUsd = Math.max(realizedPnlUsd, 0) * carryRate;
  const serviceFeeUsd = allocationUsd * serviceFeeApr * (lockDays / 365);
  return {
    builderFeeUsd,
    carryUsd,
    serviceFeeUsd,
    totalUsd: builderFeeUsd + carryUsd + serviceFeeUsd,
    receiver: revenueWallet
  };
}

export function calculateExitPenalty({
  closeAmountUsd,
  remainingLockDays,
  totalLockDays,
  realizedPnlUsd
}) {
  const lockRatio = totalLockDays ? Math.max(remainingLockDays, 0) / totalLockDays : 0;
  const liquidityPenaltyUsd = closeAmountUsd * 0.015 * lockRatio;
  const profitClawbackUsd = Math.max(realizedPnlUsd, 0) * 0.08 * lockRatio;
  const networkAndSlippageUsd = closeAmountUsd * 0.0025;
  return {
    liquidityPenaltyUsd,
    profitClawbackUsd,
    networkAndSlippageUsd,
    totalPenaltyUsd: liquidityPenaltyUsd + profitClawbackUsd + networkAndSlippageUsd
  };
}
