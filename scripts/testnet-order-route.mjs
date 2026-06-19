import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";

const root = process.cwd();
const envPath = [".env.local", ".env"].map((file) => path.join(root, file)).find(fs.existsSync);
const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const force = args.has("--force");

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
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
      })
  );
}

function requireAddress(value, name) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value || "")) {
    throw new Error(`${name} is missing or invalid.`);
  }
  return value;
}

function asNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function compactAccount(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

async function withRetry(label, task) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  throw new Error(`${label} failed after retries: ${lastError?.message || lastError}`);
}

const env = parseEnv(envPath);
const api = env.VITE_HL_TESTNET_API || "https://api.hyperliquid-testnet.xyz";
const masterWallet = requireAddress(env.HERMIT_HL_MASTER_ADDRESS, "HERMIT_HL_MASTER_ADDRESS");
const apiWalletPrivateKey = env.HERMIT_HL_API_WALLET_PRIVATE_KEY;
const expectedApiWallet = env.HERMIT_HL_API_WALLET_ADDRESS;
const builderWallet = env.VITE_HERMIT_BUILDER_WALLET;
const includeBuilder = args.has("--with-builder") || (env.HERMIT_ORDER_INCLUDE_BUILDER === "true" && !args.has("--without-builder"));
const builderFeeTenthsBps = Number(env.HERMIT_BUILDER_FEE_TENTHS_BPS || 10);
const coin = (env.HERMIT_ORDER_COIN || "BTC").toUpperCase();
const side = (env.HERMIT_ORDER_SIDE || "buy").toLowerCase();
const size = env.HERMIT_ORDER_SIZE || "0.0002";
const slippageBps = Number(env.HERMIT_ORDER_SLIPPAGE_BPS || 15);

if (!/^0x[a-fA-F0-9]{64}$/.test(apiWalletPrivateKey || "")) {
  throw new Error("HERMIT_HL_API_WALLET_PRIVATE_KEY is missing or invalid.");
}

const wallet = privateKeyToAccount(apiWalletPrivateKey);
if (expectedApiWallet && wallet.address.toLowerCase() !== expectedApiWallet.toLowerCase()) {
  throw new Error(
    `API wallet private key derives ${wallet.address}, but HERMIT_HL_API_WALLET_ADDRESS is ${expectedApiWallet}.`
  );
}

if (includeBuilder) {
  requireAddress(builderWallet, "VITE_HERMIT_BUILDER_WALLET");
  if (!Number.isInteger(builderFeeTenthsBps) || builderFeeTenthsBps < 0) {
    throw new Error("HERMIT_BUILDER_FEE_TENTHS_BPS must be a non-negative integer.");
  }
}

const transport = new HttpTransport({ isTestnet: true, apiUrl: api });
const info = new InfoClient({ transport });
const exchange = new ExchangeClient({ transport, wallet });

const [metaAndAssetCtxs, allMids, clearinghouseState, maxBuilderFee] = await Promise.all([
  withRetry("metaAndAssetCtxs", () => info.metaAndAssetCtxs()),
  withRetry("allMids", () => info.allMids()),
  withRetry("clearinghouseState", () => info.clearinghouseState({ user: masterWallet })),
  includeBuilder
    ? withRetry("maxBuilderFee", () => info.maxBuilderFee({ user: masterWallet, builder: builderWallet }))
    : Promise.resolve(null)
]);

const [meta] = metaAndAssetCtxs;
const assetId = meta.universe.findIndex((asset) => asset.name === coin);
if (assetId < 0) {
  throw new Error(`${coin} was not found in Hyperliquid testnet perp universe.`);
}
const assetMeta = meta.universe[assetId];

const mid = asNumber(allMids[coin]);
if (!mid) {
  throw new Error(`No testnet mid price found for ${coin}.`);
}

const isBuy = side !== "sell";
const price = formatPrice(mid * (isBuy ? 1 + slippageBps / 10000 : 1 - slippageBps / 10000), assetMeta.szDecimals);
const orderSize = formatSize(size, assetMeta.szDecimals);
const order = {
  orders: [
    {
      a: assetId,
      b: isBuy,
      p: price,
      s: orderSize,
      r: false,
      t: { limit: { tif: "Ioc" } }
    }
  ],
  grouping: "na"
};

if (includeBuilder) {
  order.builder = {
    b: builderWallet,
    f: builderFeeTenthsBps
  };
}

const accountValue = asNumber(clearinghouseState.marginSummary?.accountValue);
const notionalUsd = asNumber(price) * asNumber(orderSize);
const blockers = [];
if (accountValue <= 0) {
  blockers.push("Master wallet perps account value is 0; transfer testnet USDC from Spot to Perps before execution.");
}
if (notionalUsd < 10) {
  blockers.push(`Order notional is ${notionalUsd.toFixed(4)} USDC; Hyperliquid minimum order value is 10 USDC.`);
}
if (includeBuilder && asNumber(maxBuilderFee) < builderFeeTenthsBps) {
  blockers.push(
    `Builder fee is enabled, but maxBuilderFee is ${maxBuilderFee}; required ${builderFeeTenthsBps}.`
  );
}

const summary = {
  mode: execute ? "execute" : "dry-run",
  endpoint: api,
  masterWallet,
  apiWallet: compactAccount(wallet.address),
  accountValue: clearinghouseState.marginSummary?.accountValue || "0",
  withdrawable: clearinghouseState.withdrawable || "0",
  notionalUsd: notionalUsd.toFixed(4),
  order,
  includeBuilder,
  maxBuilderFee,
  builderFeeTenthsBps: includeBuilder ? builderFeeTenthsBps : 0,
  blockers,
  nextCommand: "npm run testnet:order:execute"
};

if (!execute) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(blockers.length ? 2 : 0);
}

if (blockers.length && !force) {
  console.error(JSON.stringify(summary, null, 2));
  console.error("Refusing to execute. Resolve blockers first, or pass --force intentionally.");
  process.exit(2);
}

const response = await exchange.order(order);
console.log(
  JSON.stringify(
    {
      ...summary,
      response
    },
    null,
    2
  )
);
