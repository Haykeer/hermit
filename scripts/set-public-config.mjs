import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function usage() {
  console.log("Usage:");
  console.log("  npm run set:public-config -- --walletconnect=<project-id> --master=0x...");
}

function parseArgs(args) {
  return Object.fromEntries(
    args
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [key, ...rest] = arg.slice(2).split("=");
        return [key, rest.join("=")];
      })
  );
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
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

const args = parseArgs(process.argv.slice(2));

if (!args.walletconnect || !args.master) {
  usage();
  process.exit(1);
}

if (!isAddress(args.master)) {
  console.error(`Invalid master wallet address: ${args.master}`);
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, ".env.example"), envPath);
}

const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
upsert(lines, "VITE_WALLETCONNECT_PROJECT_ID", args.walletconnect);
upsert(lines, "VITE_HERMIT_MASTER_ADDRESS", args.master);
upsert(lines, "HERMIT_HL_MASTER_ADDRESS", args.master);

fs.writeFileSync(envPath, `${lines.join("\n").replace(/\n+$/g, "")}\n`);

console.log("Updated .env.local public config.");
console.log(`Master wallet: ${args.master}`);
console.log("WalletConnect/Reown project ID: set");
