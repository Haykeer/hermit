import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const host = process.env.HERMIT_SIGNER_HOST || "127.0.0.1";
const port = Number(process.env.HERMIT_SIGNER_PORT || 8787);
const allowExecute = process.env.HERMIT_SIGNER_ALLOW_EXECUTE === "true";
const executeToken = process.env.HERMIT_SIGNER_EXECUTE_TOKEN || "";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json",
    "access-control-allow-origin": "http://127.0.0.1:5173",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,x-hermit-execute-token"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function runNodeScript(script, args = []) {
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
      const payload = parseJson(stdout.trim());
      if (code === 0) {
        resolve(payload || { stdout: stdout.trim() });
        return;
      }

      const error = new Error(stderr.trim() || stdout.trim() || `${script} exited with ${code}`);
      error.statusCode = code === 2 ? 409 : 500;
      error.payload = payload || {
        error: error.message,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
      reject(error);
    });
  });
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch {
    const error = new Error("Request body must be valid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function executeAllowed(request) {
  return allowExecute && executeToken && request.headers["x-hermit-execute-token"] === executeToken;
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "OPTIONS") {
      sendJson(response, 204, {});
      return;
    }

    const url = new URL(request.url || "/", `http://${host}:${port}`);

    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, {
        status: "ok",
        service: "hermit-signer",
        executeEnabled: allowExecute
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/testnet/status") {
      const payload = await runNodeScript("scripts/check-hyperliquid-testnet.mjs");
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/testnet/order/dry-run") {
      const body = await readBody(request);
      const args = body.includeBuilder ? ["--with-builder"] : ["--without-builder"];
      const payload = await runNodeScript("scripts/testnet-order-route.mjs", args);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/testnet/position/close/dry-run") {
      const body = await readBody(request);
      const args = [];
      if (body.coin) args.push(`--coin=${String(body.coin).toUpperCase()}`);
      args.push(body.includeBuilder ? "--with-builder" : "--without-builder");
      const payload = await runNodeScript("scripts/testnet-position-close.mjs", args);
      sendJson(response, 200, payload);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/testnet/order/execute") {
      if (!executeAllowed(request)) {
        sendJson(response, 403, {
          error: "Execution is disabled. Use npm run testnet:order:execute or set HERMIT_SIGNER_ALLOW_EXECUTE with an execute token."
        });
        return;
      }
      const body = await readBody(request);
      const args = ["--execute", body.includeBuilder ? "--with-builder" : "--without-builder"];
      const payload = await runNodeScript("scripts/testnet-order-route.mjs", args);
      sendJson(response, 200, payload);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, error.statusCode || 500, error.payload || { error: error.message });
  }
});

server.listen(port, host, () => {
  console.log(`Hermit signer service listening on http://${host}:${port}`);
});
