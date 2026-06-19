import fs from "node:fs";
import path from "node:path";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function parseEnv(content) {
  const lines = content.split(/\r?\n/);
  const values = new Map();
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values.set(match[1], match[2]);
  }
  return { lines, values };
}

function upsert(lines, key, value) {
  const nextLine = `${key}=${value}`;
  const index = lines.findIndex((line) => line.startsWith(`${key}=`));
  if (index === -1) {
    lines.push(nextLine);
  } else {
    lines[index] = nextLine;
  }
}

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, ".env.example"), envPath);
}

const content = fs.readFileSync(envPath, "utf8");
const { lines, values } = parseEnv(content);

if (values.get("HERMIT_HL_API_WALLET_PRIVATE_KEY")) {
  const account = privateKeyToAccount(values.get("HERMIT_HL_API_WALLET_PRIVATE_KEY"));
  console.log(`API wallet already configured: ${account.address}`);
  process.exit(0);
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

upsert(lines, "HERMIT_HL_API_WALLET_ADDRESS", account.address);
upsert(lines, "HERMIT_HL_API_WALLET_PRIVATE_KEY", privateKey);

fs.writeFileSync(envPath, `${lines.join("\n").replace(/\n+$/g, "")}\n`);

console.log(`Generated fresh Hyperliquid API wallet: ${account.address}`);
console.log("Private key saved only to .env.local.");
