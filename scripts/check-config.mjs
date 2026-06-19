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

const env = parseEnv(envPath);
const checks = [];
const warnings = [];

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

check("Env file exists", Boolean(envPath), envPath ? path.basename(envPath) : "Create .env.local first");
check(
  "Builder wallet is valid",
  isAddress(env.VITE_HERMIT_BUILDER_WALLET),
  env.VITE_HERMIT_BUILDER_WALLET || "missing"
);
check(
  "Hyperliquid testnet API configured",
  env.VITE_HL_TESTNET_API === "https://api.hyperliquid-testnet.xyz",
  env.VITE_HL_TESTNET_API || "missing"
);
check(
  "Hyperliquid testnet WS configured",
  env.VITE_HL_TESTNET_WS === "wss://api.hyperliquid-testnet.xyz/ws",
  env.VITE_HL_TESTNET_WS || "missing"
);
check(
  "WalletConnect/Reown project ID present",
  Boolean(env.VITE_WALLETCONNECT_PROJECT_ID),
  env.VITE_WALLETCONNECT_PROJECT_ID ? "set" : "missing"
);
check("Master wallet address valid", isAddress(env.HERMIT_HL_MASTER_ADDRESS), env.HERMIT_HL_MASTER_ADDRESS || "missing");
check(
  "Browser master wallet address valid",
  isAddress(env.VITE_HERMIT_MASTER_ADDRESS),
  env.VITE_HERMIT_MASTER_ADDRESS || "missing"
);
check(
  "API wallet address valid",
  isAddress(env.HERMIT_HL_API_WALLET_ADDRESS),
  env.HERMIT_HL_API_WALLET_ADDRESS || "missing"
);
check(
  "API wallet private key format valid",
  isPrivateKey(env.HERMIT_HL_API_WALLET_PRIVATE_KEY),
  env.HERMIT_HL_API_WALLET_PRIVATE_KEY ? "set" : "missing"
);
check("Agent name present", Boolean(env.HERMIT_HL_AGENT_NAME), env.HERMIT_HL_AGENT_NAME || "missing");

if (env.HERMIT_HL_VAULT_ADDRESS) {
  check("Optional vault/subaccount address valid", isAddress(env.HERMIT_HL_VAULT_ADDRESS), env.HERMIT_HL_VAULT_ADDRESS);
}

for (const key of Object.keys(env)) {
  if (/^VITE_.*(PRIVATE|SECRET|KEY)$/i.test(key) && key !== "VITE_WALLETCONNECT_PROJECT_ID") {
    warnings.push(`${key} looks secret-like and is exposed to the browser. Rename it without VITE_.`);
  }
}

const failed = checks.filter((item) => !item.pass);
for (const item of checks) {
  const marker = item.pass ? "OK " : "MISS";
  console.log(`${marker} ${item.name}: ${item.detail}`);
}
for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (failed.length) {
  console.error(`\n${failed.length} configuration item(s) need attention.`);
  process.exit(1);
}

console.log("\nConfiguration looks ready for signer-service wiring.");
