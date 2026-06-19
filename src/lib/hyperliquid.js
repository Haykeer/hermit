import { createWalletClient, custom } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { builderWallet } from "../data/agents.js";

const hyperliquidTestnetSignatureChainId = "0x66eee";

export const hyperliquidConfig = {
  testnetApi: import.meta.env.VITE_HL_TESTNET_API || "https://api.hyperliquid-testnet.xyz",
  testnetApp: import.meta.env.VITE_HL_TESTNET_APP || "https://app.hyperliquid-testnet.xyz",
  masterAddress: import.meta.env.VITE_HERMIT_MASTER_ADDRESS || "",
  liveEnabled: import.meta.env.VITE_ENABLE_LIVE_TESTNET === "true",
  builderFeeEnabled: import.meta.env.VITE_ENABLE_BUILDER_FEE === "true"
};

export async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask provider was not found in this browser.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return {
    type: "metamask",
    address: accounts[0],
    status: "connected"
  };
}

export function connectMockWallet(type) {
  const mockAddresses = {
    walletconnect: "0x00000000000000000000000000000000000000c1",
    hyperliquid: "0x00000000000000000000000000000000000000a1"
  };
  return {
    type,
    address: mockAddresses[type] || "0x0000000000000000000000000000000000000001",
    status: "simulated"
  };
}

export function buildApproveBuilderFeeAction({ maxFeeTenthsBps }) {
  return {
    type: "approveBuilderFee",
    builder: builderWallet,
    maxFeeRate: `${maxFeeTenthsBps / 10}bp`,
    note:
      "This must be signed by the user's main wallet. API wallets can execute later order flow after approval."
  };
}

export async function approveBuilderFeeWithMetaMask({
  expectedAddress,
  builder = builderWallet,
  maxFeeRate = "0.01%"
}) {
  if (!window.ethereum) {
    throw new Error("MetaMask provider was not found in this browser.");
  }

  const [address] = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!address) {
    throw new Error("No wallet account returned by MetaMask.");
  }

  if (expectedAddress && address.toLowerCase() !== expectedAddress.toLowerCase()) {
    throw new Error(`Connected wallet ${address} does not match master wallet ${expectedAddress}.`);
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hyperliquidTestnetSignatureChainId }]
    });
  } catch (error) {
    if (error?.code !== 4902) {
      throw new Error("Could not switch MetaMask to Arbitrum Sepolia for Hyperliquid testnet signing.", {
        cause: error
      });
    }
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: hyperliquidTestnetSignatureChainId,
          chainName: "Arbitrum Sepolia",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
          blockExplorerUrls: ["https://sepolia.arbiscan.io/"]
        }
      ]
    });
  }

  const wallet = createWalletClient({
    account: address,
    chain: arbitrumSepolia,
    transport: custom(window.ethereum)
  });
  const { ExchangeClient, HttpTransport } = await import("@nktkas/hyperliquid");
  const client = new ExchangeClient({
    transport: new HttpTransport({ isTestnet: true }),
    wallet,
    signatureChainId: hyperliquidTestnetSignatureChainId
  });

  return await client.approveBuilderFee({ builder, maxFeeRate });
}

export function buildOrderAction({
  assetId,
  isBuy,
  price,
  size,
  builderFeeTenthsBps,
  includeBuilder = hyperliquidConfig.builderFeeEnabled
}) {
  const action = {
    type: "order",
    orders: [
      {
        a: assetId,
        b: isBuy,
        p: String(price),
        s: String(size),
        r: false,
        t: { limit: { tif: "Ioc" } }
      }
    ],
    grouping: "na"
  };

  if (includeBuilder) {
    action.builder = {
      b: builderWallet,
      f: builderFeeTenthsBps
    };
  }

  return {
    action,
    builderFeeEnabled: includeBuilder,
    nonce: Date.now(),
    endpoint: `${hyperliquidConfig.testnetApi}/exchange`
  };
}
