import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const envPath = [".env.local", ".env"].map((file) => path.join(root, file)).find(fs.existsSync);

function parseEnv(filePath) {
  if (!filePath) return {};
  const content = fs.readFileSync(filePath, "utf8");
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        if (index === -1) return [line, ""];
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
      })
  );
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isPrivateKey(value) {
  return /^0x[a-fA-F0-9]{64}$/.test(value || "");
}

function asNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactAccount(address) {
  return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "missing";
}

function runNodeJson(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: root,
      env: process.env,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      let payload = null;
      try {
        payload = JSON.parse(stdout.trim());
      } catch {
        payload = { stdout: stdout.trim(), stderr: stderr.trim() };
      }

      if (code === 0) {
        resolve(payload);
        return;
      }

      const error = new Error(stderr.trim() || stdout.trim() || `${script} exited with ${code}`);
      error.payload = payload;
      error.exitCode = code;
      reject(error);
    });
  });
}

function addCheck(checks, id, pass, detail, evidence = {}) {
  checks.push({
    id,
    status: pass ? "pass" : "fail",
    detail,
    evidence
  });
}

const env = parseEnv(envPath);
const checks = [];
const requiredCoin = (env.HERMIT_AUDIT_REQUIRED_COIN || env.HERMIT_CLOSE_COIN || env.HERMIT_ORDER_COIN || "BTC").toUpperCase();
const minPositionSize = asNumber(env.HERMIT_AUDIT_MIN_POSITION_SIZE || env.HERMIT_ORDER_SIZE || "0.0002");
const minAccountValue = asNumber(env.HERMIT_AUDIT_MIN_ACCOUNT_VALUE || "1");
const requiredBuilderFee = Number(env.HERMIT_BUILDER_FEE_TENTHS_BPS || 10);

const masterWallet = env.HERMIT_HL_MASTER_ADDRESS;
const apiWallet = env.HERMIT_HL_API_WALLET_ADDRESS;
const builderWallet = env.VITE_HERMIT_BUILDER_WALLET;
const apiPrivateKey = env.HERMIT_HL_API_WALLET_PRIVATE_KEY;
let derivedApiWallet = null;

addCheck(checks, "env-file", Boolean(envPath), envPath ? `Loaded ${path.basename(envPath)}` : "Missing .env.local or .env");
addCheck(checks, "master-wallet", isAddress(masterWallet), "Master wallet address is configured", {
  masterWallet
});
addCheck(checks, "api-wallet", isAddress(apiWallet), "API wallet address is configured", {
  apiWallet
});
addCheck(checks, "builder-wallet", isAddress(builderWallet), "Builder wallet address is configured", {
  builderWallet
});
addCheck(checks, "api-private-key-format", isPrivateKey(apiPrivateKey), "API wallet private key has server-only format", {
  configured: Boolean(apiPrivateKey)
});

if (isPrivateKey(apiPrivateKey)) {
  derivedApiWallet = privateKeyToAccount(apiPrivateKey).address;
  addCheck(
    checks,
    "api-private-key-match",
    derivedApiWallet.toLowerCase() === String(apiWallet || "").toLowerCase(),
    "API wallet private key derives the configured API wallet address",
    {
      derivedApiWallet,
      configuredApiWallet: apiWallet
    }
  );
}

let status = null;
let builderOrder = null;
let closeOrder = null;

try {
  status = await runNodeJson("scripts/check-hyperliquid-testnet.mjs");
  const accountValue = asNumber(status.accountValue);
  const position = (status.perpPositions || []).find((item) => item.coin === requiredCoin);
  const positionSize = asNumber(position?.size);
  const maxBuilderFee = asNumber(status.maxBuilderFee);

  addCheck(checks, "testnet-account-funded", accountValue >= minAccountValue, "Master wallet perps account is funded", {
    accountValue: status.accountValue,
    minAccountValue
  });
  addCheck(checks, "builder-fee-approved", maxBuilderFee >= requiredBuilderFee, "Builder fee approval is active", {
    maxBuilderFee: status.maxBuilderFee,
    requiredBuilderFee
  });
  addCheck(checks, "real-position-open", Math.abs(positionSize) >= minPositionSize, `${requiredCoin} testnet position is open`, {
    position,
    minPositionSize
  });
} catch (error) {
  addCheck(checks, "hyperliquid-status", false, "Could not fetch Hyperliquid testnet status", {
    error: error.message,
    payload: error.payload || null
  });
}

try {
  builderOrder = await runNodeJson("scripts/testnet-order-route.mjs", ["--with-builder"]);
  const hasBuilder = Boolean(builderOrder.order?.builder);
  const noBlockers = (builderOrder.blockers || []).length === 0;
  const notionalOk = asNumber(builderOrder.notionalUsd) >= 10;
  const builderMatches = String(builderOrder.order?.builder?.b || "").toLowerCase() === String(builderWallet || "").toLowerCase();

  addCheck(checks, "builder-order-dry-run", hasBuilder && noBlockers && notionalOk && builderMatches, "Builder-fee order dry-run is executable", {
    includeBuilder: builderOrder.includeBuilder,
    notionalUsd: builderOrder.notionalUsd,
    builder: builderOrder.order?.builder || null,
    blockers: builderOrder.blockers || []
  });
} catch (error) {
  addCheck(checks, "builder-order-dry-run", false, "Builder-fee order dry-run failed", {
    error: error.message,
    payload: error.payload || null
  });
}

try {
  closeOrder = await runNodeJson("scripts/testnet-position-close.mjs", [`--coin=${requiredCoin}`, "--without-builder"]);
  const order = closeOrder.order?.orders?.[0];
  const statusPosition = (status?.perpPositions || []).find((item) => item.coin === requiredCoin);
  const expectedCloseBuy = asNumber(statusPosition?.size) < 0;
  const noBlockers = (closeOrder.blockers || []).length === 0;
  const reduceOnly = order?.r === true;
  const sideIsOpposite = order?.b === expectedCloseBuy;

  addCheck(checks, "reduce-only-close-dry-run", noBlockers && reduceOnly && sideIsOpposite, "Reduce-only close dry-run is ready", {
    coin: closeOrder.coin,
    closeSize: order?.s,
    reduceOnly,
    sideIsBuy: order?.b,
    expectedCloseBuy,
    blockers: closeOrder.blockers || []
  });
} catch (error) {
  addCheck(checks, "reduce-only-close-dry-run", false, "Reduce-only close dry-run failed", {
    error: error.message,
    payload: error.payload || null
  });
}

const failed = checks.filter((check) => check.status !== "pass");
const report = {
  generatedAt: new Date().toISOString(),
  verdict: failed.length ? "not-ready" : "ready",
  agent: env.HERMIT_HL_AGENT_NAME || "hermit-james-wynn-testnet",
  endpoint: env.VITE_HL_TESTNET_API || "https://api.hyperliquid-testnet.xyz",
  wallets: {
    masterWallet,
    apiWallet,
    derivedApiWallet: derivedApiWallet || compactAccount(apiWallet),
    builderWallet
  },
  requirements: {
    requiredCoin,
    minPositionSize,
    minAccountValue,
    requiredBuilderFee
  },
  checks,
  evidence: {
    accountValue: status?.accountValue || null,
    withdrawable: status?.withdrawable || null,
    maxBuilderFee: status?.maxBuilderFee ?? null,
    perpPositions: status?.perpPositions || [],
    builderOrder: builderOrder
      ? {
          notionalUsd: builderOrder.notionalUsd,
          includeBuilder: builderOrder.includeBuilder,
          order: builderOrder.order,
          blockers: builderOrder.blockers || []
        }
      : null,
    closeOrder: closeOrder
      ? {
          coin: closeOrder.coin,
          currentPosition: closeOrder.currentPosition,
          closeNotionalUsd: closeOrder.closeNotionalUsd,
          order: closeOrder.order,
          blockers: closeOrder.blockers || []
        }
      : null
  }
};

console.log(JSON.stringify(report, null, 2));

if (failed.length) {
  process.exit(1);
}
