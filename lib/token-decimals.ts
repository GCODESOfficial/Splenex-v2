const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const FALLBACK_DECIMALS = 18;

const endpointSet = new Set<string>(
  (
    process.env.ETH_RPC_URL ? [process.env.ETH_RPC_URL] : []
  ).concat([
    "https://eth.llamarpc.com",
    "https://ethereum.blockpi.network/v1/rpc/public",
    "https://rpc.flashbots.net",
    "https://rpc.builder0x69.io",
    "https://eth.rpc.blxrbdn.com",
    "https://rpc.mewapi.io",
    "https://nodes.mewapi.io/rpc/eth",
    "https://1rpc.io/eth",
    "https://cloudflare-eth.com",
    "https://ethereum.publicnode.com",
    "https://rpc.mevblocker.io",
    "https://eth.drpc.org",
  ])
);

export const ETH_RPC_ENDPOINTS = Array.from(endpointSet);

const decimalsCache = new Map<string, number>();

const KNOWN_DECIMALS: Record<string, number> = {
  // Native / wrapped native tokens
  [ZERO_ADDRESS]: FALLBACK_DECIMALS,
  ["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"]: FALLBACK_DECIMALS,
  ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase()]: 18,
};

const DECIMALS_SELECTOR = "0x313ce567";

export async function getTokenDecimals(address?: string | null): Promise<number> {
  if (!address) {
    return FALLBACK_DECIMALS;
  }

  const normalized = address.toLowerCase();

  if (KNOWN_DECIMALS[normalized] !== undefined) {
    return KNOWN_DECIMALS[normalized];
  }

  if (decimalsCache.has(normalized)) {
    return decimalsCache.get(normalized)!;
  }

  for (const endpoint of ETH_RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_call",
          params: [
            {
              to: address,
              data: DECIMALS_SELECTOR,
            },
            "latest",
          ],
        }),
      });

      const body = await response.json();

      if (body?.result && typeof body.result === "string" && body.result !== "0x") {
        const decimals = Number.parseInt(body.result, 16);
        if (Number.isFinite(decimals)) {
          decimalsCache.set(normalized, decimals);
          return decimals;
        }
      }

      if (body?.error) {
        console.warn(`[Token Decimals] ⚠️ Failed via ${endpoint}`, body.error);
      }
    } catch (error) {
      console.warn(`[Token Decimals] ⚠️ RPC error via ${endpoint}`, error);
    }
  }

  decimalsCache.set(normalized, FALLBACK_DECIMALS);
  return FALLBACK_DECIMALS;
}


