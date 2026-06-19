import { hyperliquidConfig } from "./hyperliquid.js";

const signerBaseUrl = import.meta.env.VITE_HERMIT_SIGNER_BASE_URL || "http://127.0.0.1:8787";

export const signerConfig = {
  baseUrl: signerBaseUrl
};

async function requestSigner(path, options = {}) {
  const response = await fetch(`${signerBaseUrl}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const error = new Error(data.error || `Signer service request failed with ${response.status}`);
    error.data = data;
    throw error;
  }
  return data;
}

export function fetchTestnetStatus() {
  return requestSigner("/api/testnet/status");
}

export function dryRunTestnetOrder({ includeBuilder = hyperliquidConfig.builderFeeEnabled } = {}) {
  return requestSigner("/api/testnet/order/dry-run", {
    method: "POST",
    body: JSON.stringify({ includeBuilder })
  });
}

export function dryRunTestnetClose({ coin = "BTC", includeBuilder = false } = {}) {
  return requestSigner("/api/testnet/position/close/dry-run", {
    method: "POST",
    body: JSON.stringify({ coin, includeBuilder })
  });
}
