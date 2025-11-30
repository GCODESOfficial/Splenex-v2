const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const FALLBACK_DECIMALS = 18;

const gatherEndpoints = (
  ...sources: Array<string | undefined | null>
) =>
  sources
    .map((endpoint) => endpoint?.trim())
    .filter((endpoint): endpoint is string => Boolean(endpoint));

const ETH_DEFAULT_ENDPOINTS = [
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
];

export const ETH_RPC_ENDPOINTS = Array.from(
  new Set<string>([
    ...gatherEndpoints(
      process.env.ETH_RPC_URL,
      process.env.ETH_RPC_URL_FALLBACK,
      process.env.ETHEREUM_RPC_URL,
      process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL
    ),
    ...ETH_DEFAULT_ENDPOINTS,
  ])
);

const BSC_DEFAULT_ENDPOINTS = [
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.defibit.io",
  "https://bsc-dataseed1.ninicoin.io",
  "https://bscrpc.com",
  "https://1rpc.io/bnb",
  "https://bsc-mainnet.public.blastapi.io",
];

export const BSC_RPC_ENDPOINTS = Array.from(
  new Set<string>([
    ...gatherEndpoints(
      process.env.BSC_RPC_URL,
      process.env.BSC_RPC_URL_FALLBACK,
      process.env.BINANCE_RPC_URL,
      process.env.NEXT_PUBLIC_BSC_RPC_URL
    ),
    ...BSC_DEFAULT_ENDPOINTS,
  ])
);

const decimalsCache = new Map<string, number>();
const MAX_RPC_ATTEMPTS = 4;
const RPC_TIMEOUT_MS = 1200;

const KNOWN_DECIMALS: Record<string, number> = {
  // Native / wrapped native tokens
  [ZERO_ADDRESS]: FALLBACK_DECIMALS,
  ["0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"]: FALLBACK_DECIMALS,
  ["0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2".toLowerCase()]: 18,
  // Common BSC tokens
  ["0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"]: 18, // WBNB
  ["0x55d398326f99059ff775485246999027b3197955"]: 18, // USDT (BSC)
  ["0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"]: 18, // USDC (BSC)
  ["0xe9e7cea3dedca5984780bafc599bd69add087d56"]: 18, // BUSD
};

const DECIMALS_SELECTOR = "0x313ce567";

export async function getTokenDecimals(address?: string | null, chainId?: number): Promise<number> {
  if (!address) {
    return FALLBACK_DECIMALS;
  }

  const normalized = address.toLowerCase();

  if (KNOWN_DECIMALS[normalized] !== undefined) {
    return KNOWN_DECIMALS[normalized];
  }

  const cacheKey = `${chainId ?? 1}:${normalized}`;

  if (decimalsCache.has(cacheKey)) {
    return decimalsCache.get(cacheKey)!;
  }

  const rpcPool = chainId === 56 ? BSC_RPC_ENDPOINTS : ETH_RPC_ENDPOINTS;
  const endpointsToTry = rpcPool.slice(0, MAX_RPC_ATTEMPTS);

  for (const endpoint of endpointsToTry) {
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
        signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
      });

      const body = await response.json();

      if (body?.result && typeof body.result === "string" && body.result !== "0x") {
        const decimals = Number.parseInt(body.result, 16);
        if (Number.isFinite(decimals)) {
          decimalsCache.set(cacheKey, decimals);
          return decimals;
        }
      }

      if (body?.error) {
      }
    } catch (error) {
    }
  }

  decimalsCache.set(cacheKey, FALLBACK_DECIMALS);
  return FALLBACK_DECIMALS;
}

