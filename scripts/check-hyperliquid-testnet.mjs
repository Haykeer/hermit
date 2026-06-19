import fs from "node:fs";
import path from "node:path";

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
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
      })
  );
}

async function postInfo(api, body) {
  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`${api}/info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 3) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 400));
    }
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok) {
    throw new Error(`${body.type} failed: ${response.status} ${text || lastError?.message || ""}`);
  }
  return data;
}

const env = parseEnv(envPath);
const api = env.VITE_HL_TESTNET_API || "https://api.hyperliquid-testnet.xyz";
const user = env.HERMIT_HL_MASTER_ADDRESS;
const builder = env.VITE_HERMIT_BUILDER_WALLET;

if (!/^0x[a-fA-F0-9]{40}$/.test(user || "")) {
  console.error("HERMIT_HL_MASTER_ADDRESS is missing or invalid.");
  process.exit(1);
}

const [clearinghouseState, spotState, userFees, maxBuilderFee] = await Promise.all([
  postInfo(api, { type: "clearinghouseState", user }),
  postInfo(api, { type: "spotClearinghouseState", user }),
  postInfo(api, { type: "userFees", user }).catch((error) => ({ error: error.message })),
  builder
    ? postInfo(api, { type: "maxBuilderFee", user, builder }).catch((error) => ({
        error: error.message
      }))
    : Promise.resolve({ error: "VITE_HERMIT_BUILDER_WALLET missing" })
]);

const positions = clearinghouseState.assetPositions || [];
const spotBalances = spotState.balances || [];
const summary = {
  endpoint: api,
  masterWallet: user,
  accountValue: clearinghouseState.marginSummary?.accountValue || "0",
  withdrawable: clearinghouseState.withdrawable || "0",
  perpPositions: positions.map((item) => ({
    coin: item.position?.coin,
    size: item.position?.szi,
    entryPx: item.position?.entryPx,
    positionValue: item.position?.positionValue,
    unrealizedPnl: item.position?.unrealizedPnl
  })),
  spotBalances: spotBalances
    .filter((item) => Number(item.total || 0) > 0)
    .map((item) => ({ coin: item.coin, total: item.total, hold: item.hold })),
  builderWallet: builder,
  maxBuilderFee,
  userFees
};

console.log(JSON.stringify(summary, null, 2));
