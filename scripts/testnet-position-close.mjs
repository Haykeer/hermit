import fs from "node:fs";
import path from "node:path";
import { privateKeyToAccount } from "viem/accounts";
import { ExchangeClient, HttpTransport, InfoClient } from "@nktkas/hyperliquid";
import { formatPrice, formatSize } from "@nktkas/hyperliquid/utils";

const root = process.cwd();
const envPath = [".env.local", ".env"].map((file) => path.join(root, file)).find(fs.existsSync);
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const execute = args.has("--execute");

function argValue(name) {
  const prefix = `${name}=`;
  return rawArgs.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

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
const coin = (argValue("--coin") || env.HERMIT_CLOSE_COIN || env.HERMIT_ORDER_COIN || "BTC").toUpperCase();
const slippageBps = Number(env.HERMIT_CLOSE_SLIPPAGE_BPS || env.HERMIT_ORDER_SLIPPAGE_BPS || 25);

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
const position = (clearinghouseState.assetPositions || []).find((item) => item.position?.coin === coin)?.position;
const size = asNumber(position?.szi);
const absSize = Math.abs(size);
const isClosingShort = size < 0;
const mid = asNumber(allMids[coin]);
const price = mid
  ? formatPrice(mid * (isClosingShort ? 1 + slippageBps / 10000 : 1 - slippageBps / 10000), assetMeta.szDecimals)
  : "0";
const orderSize = formatSize(absSize, assetMeta.szDecimals);
const notionalUsd = asNumber(price) * asNumber(orderSize);

const blockers = [];
if (!position || absSize <= 0) {
  blockers.push(`No open ${coin} perp position found for ${masterWallet}.`);
}
if (!mid) {
  blockers.push(`No testnet mid price found for ${coin}.`);
}
if (includeBuilder && asNumber(maxBuilderFee) < builderFeeTenthsBps) {
  blockers.push(
    `Builder fee is enabled, but maxBuilderFee is ${maxBuilderFee}; required ${builderFeeTenthsBps}.`
  );
}

const order = {
  orders: [
    {
      a: assetId,
      b: isClosingShort,
      p: price,
      s: orderSize,
      r: true,
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

const summary = {
  mode: execute ? "execute" : "dry-run",
  endpoint: api,
  masterWallet,
  apiWallet: compactAccount(wallet.address),
  coin,
  currentPosition: position
    ? {
        size: position.szi,
        entryPx: position.entryPx,
        positionValue: position.positionValue,
        unrealizedPnl: position.unrealizedPnl
      }
    : null,
  closeNotionalUsd: notionalUsd.toFixed(4),
  order,
  includeBuilder,
  maxBuilderFee,
  builderFeeTenthsBps: includeBuilder ? builderFeeTenthsBps : 0,
  blockers,
  nextCommand: `npm run testnet:position:close:execute -- --coin=${coin}`
};

if (!execute) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(blockers.length ? 2 : 0);
}

if (blockers.length) {
  console.error(JSON.stringify(summary, null, 2));
  console.error("Refusing to execute close. Resolve blockers first.");
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
