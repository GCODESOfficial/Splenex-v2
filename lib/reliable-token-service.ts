/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Reliable Multi-Source Token Service
 * Replaces CoinGecko with multiple reliable sources:
 * 1. Token Lists (TokenLists.org, Uniswap, 1inch)
 * 2. Aggregator APIs (1inch, 0x, LiFi, ParaSwap)
 * 3. DexScreener API (comprehensive token coverage from all DEXes)
 * 4. Chain-specific APIs (Alchemy, Moralis, Covalent)
 */

import { getDEXScreenerChainPairs, searchDEXScreenerTokens } from './dexscreener';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  chainName: string;
  logoURI?: string;
  tags?: string[];
  marketCapRank?: number;
}

// Token Lists URLs (most reliable, community-maintained)
const TOKEN_LISTS = {
  // Uniswap official lists
  uniswap: {
    ethereum: "https://tokens.uniswap.org/",
    arbitrum: "https://token-list.s3.amazonaws.com/arbitrum.json",
    optimism: "https://static.optimism.io/optimism.tokenlist.json",
    polygon: "https://unpkg.com/quickswap-default-token-list@latest/build/quickswap-default.tokenlist.json",
    base: "https://static.optimism.io/ethereum-optimism.tokenlist.json",
  },
  // 1inch lists
  "1inch": {
    ethereum: "https://tokens.1inch.io/v1.0/1/",
    bsc: "https://tokens.1inch.io/v1.0/56/",
    polygon: "https://tokens.1inch.io/v1.0/137/",
    arbitrum: "https://tokens.1inch.io/v1.0/42161/",
    optimism: "https://tokens.1inch.io/v1.0/10/",
    avalanche: "https://tokens.1inch.io/v1.0/43114/",
    base: "https://tokens.1inch.io/v1.0/8453/",
    fantom: "https://tokens.1inch.io/v1.0/250/",
  },
  // Paraswap lists
  paraswap: "https://token-list.s3.amazonaws.com/paraswap.json",
  // CoinGecko lists (as fallback)
  coingecko: "https://tokens.coingecko.com/uniswap/all.json",
};

// Chain ID to 1inch chain name mapping
const CHAIN_TO_1INCH: { [chainId: number]: string } = {
  1: "1",
  56: "56",
  137: "137",
  42161: "42161",
  10: "10",
  43114: "43114",
  8453: "8453",
  250: "250",
  100: "100",
  324: "324",
  59144: "59144",
  534352: "534352",
  42170: "42170",
  1101: "1101",
};

// Chain ID to DexScreener chain name mapping
const CHAIN_TO_DEXSCREENER: { [chainId: number]: string } = {
  1: "ethereum",
  56: "bsc",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  43114: "avalanche",
  250: "fantom",
  100: "gnosis",
  324: "zksync",
  59144: "linea",
  534352: "scroll",
  42170: "arbitrum-nova",
  1101: "polygon-zkevm",
  // Additional chains for token fetching
  19: "songbird",
  108: "thundercore",
  7777777: "zora",
  128: "heco",
  199: "bittorrent",
  1666600000: "harmony",
  106: "velas",
  57: "syscoin",
  361: "theta",
  40: "telos",
  888: "wanchain",
  88: "tomochain",
  20: "elastos",
  4689: "iotex",
  9001: "evmos",
  2222: "kava",
  82: "meter",
};

// Reverse mapping: DexScreener chain name -> numeric chainId
const DEXSCREENER_TO_CHAIN: { [chainName: string]: number } = {
  "ethereum": 1,
  "bsc": 56,
  "polygon": 137,
  "arbitrum": 42161,
  "optimism": 10,
  "base": 8453,
  "avalanche": 43114,
  "fantom": 250,
  "gnosis": 100,
  "zksync": 324,
  "linea": 59144,
  "scroll": 534352,
  "arbitrum-nova": 42170,
  "polygon-zkevm": 1101,
  // Additional chains
  "songbird": 19,
  "thundercore": 108,
  "zora": 7777777,
  "heco": 128,
  "bittorrent": 199,
  "harmony": 1666600000,
  "velas": 106,
  "syscoin": 57,
  "theta": 361,
  "telos": 40,
  "wanchain": 888,
  "tomochain": 88,
  "elastos": 20,
  "iotex": 4689,
  "evmos": 9001,
  "kava": 2222,
  "meter": 82,
};

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
let tokenCache: Map<number, TokenInfo[]> = new Map();
let cacheTimestamp: Map<number, number> = new Map();

/**
 * Fetch tokens from 1inch API (very reliable, fast)
 */
async function fetch1inchTokens(chainId: number): Promise<TokenInfo[]> {
  try {
    const chainName = CHAIN_TO_1INCH[chainId];
    if (!chainName) return [];

    console.log(`[Token Service] 🔄 Fetching tokens from 1inch for chain ${chainId}...`);
    
    const response = await fetch(`https://tokens.1inch.io/v1.0/${chainName}/`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.warn(`[Token Service] ⚠️ 1inch failed for chain ${chainId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const tokens: TokenInfo[] = data.tokens?.map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      chainId,
      chainName: getChainName(chainId),
      logoURI: token.logoURI,
      tags: token.tags,
    })) || [];

    console.log(`[Token Service] ✅ 1inch: ${tokens.length} tokens for chain ${chainId}`);
    return tokens;
  } catch (error) {
    console.error(`[Token Service] ❌ 1inch error for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Fetch tokens from Uniswap Token Lists
 */
async function fetchUniswapTokens(chainId: number): Promise<TokenInfo[]> {
  try {
    const listUrl = TOKEN_LISTS.uniswap[getChainKey(chainId)];
    if (!listUrl) return [];

    console.log(`[Token Service] 🔄 Fetching tokens from Uniswap list for chain ${chainId}...`);
    
    const response = await fetch(listUrl, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const tokens: TokenInfo[] = data.tokens?.filter((t: any) => t.chainId === chainId)
      .map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        chainId,
        chainName: getChainName(chainId),
        logoURI: token.logoURI,
        tags: token.tags,
      })) || [];

    console.log(`[Token Service] ✅ Uniswap: ${tokens.length} tokens for chain ${chainId}`);
    return tokens;
  } catch (error) {
    console.error(`[Token Service] ❌ Uniswap error for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Fetch tokens from ParaSwap token list
 */
async function fetchParaSwapTokens(chainId: number): Promise<TokenInfo[]> {
  try {
    console.log(`[Token Service] 🔄 Fetching tokens from ParaSwap for chain ${chainId}...`);
    
    const response = await fetch(TOKEN_LISTS.paraswap, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const data = await response.json();
    const tokens: TokenInfo[] = data.tokens?.filter((t: any) => t.chainId === chainId)
      .map((token: any) => ({
        address: token.address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        chainId,
        chainName: getChainName(chainId),
        logoURI: token.logoURI,
        tags: token.tags,
      })) || [];

    console.log(`[Token Service] ✅ ParaSwap: ${tokens.length} tokens for chain ${chainId}`);
    return tokens;
  } catch (error) {
    console.error(`[Token Service] ❌ ParaSwap error for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Fetch tokens from LiFi API (you already use this)
 */
async function fetchLiFiTokens(chainId: number): Promise<TokenInfo[]> {
  try {
    const lifiApiKey = process.env.LIFI_API_KEY;
    if (!lifiApiKey) {
      console.log(`[Token Service] ⚠️ LiFi API key not found, skipping LiFi tokens`);
      return [];
    }

    console.log(`[Token Service] 🔄 Fetching tokens from LiFi for chain ${chainId}...`);
    
    const response = await fetch(`https://li.quest/v1/tokens?chains=${chainId}`, {
      headers: {
        'Accept': 'application/json',
        'x-lifi-api-key': lifiApiKey,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn(`[Token Service] ⚠️ LiFi failed for chain ${chainId}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const chainTokens = data.tokens?.[chainId] || {};
    const tokens: TokenInfo[] = Object.values(chainTokens).map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      chainId,
      chainName: getChainName(chainId),
      logoURI: token.logoURI,
    }));

    console.log(`[Token Service] ✅ LiFi: ${tokens.length} tokens for chain ${chainId}`);
    return tokens;
  } catch (error) {
    console.error(`[Token Service] ❌ LiFi error for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Fetch tokens from DexScreener (comprehensive coverage from all DEXes)
 */
async function fetchDexScreenerTokens(chainId: number): Promise<TokenInfo[]> {
  try {
    const chainName = CHAIN_TO_DEXSCREENER[chainId];
    if (!chainName) {
      console.log(`[Token Service] ⚠️ DexScreener doesn't support chain ${chainId}`);
      return [];
    }

    console.log(`[Token Service] 🔄 Fetching tokens from DexScreener for chain ${chainId}...`);
    
    const tokenMap = new Map<string, TokenInfo>();
    
    // Fetch multiple pages to get comprehensive coverage
    // DexScreener has limited pages, so we'll fetch first 5 pages (~100 tokens per page)
    for (let page = 1; page <= 5; page++) {
      try {
        const pairs = await getDEXScreenerChainPairs(chainId.toString(), page);
        
        // Handle null/empty responses
        if (!pairs || pairs.length === 0) {
          if (page === 1) {
            console.log(`[Token Service] ⚠️ DexScreener returned no pairs for chain ${chainId} (${chainName})`);
          }
          break;
        }
        
        pairs.forEach((pair: any) => {
          // Extract base token (the token being traded)
          const baseToken = pair.baseToken;
          if (baseToken && baseToken.address) {
            const key = baseToken.address.toLowerCase();
            if (!tokenMap.has(key)) {
              // Generate DexScreener CDN URL (even if info.imageUrl is missing)
              const dexChain = CHAIN_TO_DEXSCREENER[chainId] || "ethereum";
              
              // Use info.imageUrl if available, otherwise construct DexScreener CDN URL
              const logoURI = pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/${dexChain}/${baseToken.address.toLowerCase()}.png`;
              
              tokenMap.set(key, {
                address: baseToken.address,
                symbol: baseToken.symbol?.toUpperCase() || 'UNKNOWN',
                name: baseToken.name || baseToken.symbol || 'Unknown Token',
                decimals: 18,
                chainId,
                chainName: getChainName(chainId),
                logoURI: logoURI, // DexScreener URL (TrustWallet tried client-side)
              });
            }
          }
          
          // Also extract quote token if it's not a native token
          const quoteToken = pair.quoteToken;
          if (quoteToken && quoteToken.address && 
              quoteToken.address !== '0x0000000000000000000000000000000000000000' &&
              quoteToken.symbol !== 'WETH' && quoteToken.symbol !== 'WBNB' && 
              quoteToken.symbol !== 'WMATIC' && quoteToken.symbol !== 'WAVAX') {
            const key = quoteToken.address.toLowerCase();
            if (!tokenMap.has(key)) {
              // Generate DexScreener CDN URL (even if info.imageUrl is missing)
              const dexChain = CHAIN_TO_DEXSCREENER[chainId] || "ethereum";
              
              // Use info.imageUrl if available, otherwise construct DexScreener CDN URL
              const logoURI = pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/${dexChain}/${quoteToken.address.toLowerCase()}.png`;
              
              tokenMap.set(key, {
                address: quoteToken.address,
                symbol: quoteToken.symbol?.toUpperCase() || 'UNKNOWN',
                name: quoteToken.name || quoteToken.symbol || 'Unknown Token',
                decimals: 18,
                chainId,
                chainName: getChainName(chainId),
                logoURI: logoURI, // DexScreener URL (TrustWallet tried client-side)
              });
            }
          }
        });
        
        // Small delay to avoid rate limiting
        if (page < 5) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (pageError) {
        console.warn(`[Token Service] ⚠️ DexScreener page ${page} failed for chain ${chainId}:`, pageError);
        break;
      }
    }

    const tokens = Array.from(tokenMap.values());
    console.log(`[Token Service] ✅ DexScreener: ${tokens.length} tokens for chain ${chainId}`);
    return tokens;
  } catch (error) {
    console.error(`[Token Service] ❌ DexScreener error for chain ${chainId}:`, error);
    return [];
  }
}

/**
 * Main function to fetch all tokens for a chain
 * Uses multiple sources and merges results
 */
export async function fetchTokensForChain(chainId: number): Promise<TokenInfo[]> {
  // Check cache
  const cached = tokenCache.get(chainId);
  const cachedTime = cacheTimestamp.get(chainId);
  if (cached && cachedTime && Date.now() - cachedTime < CACHE_DURATION) {
    console.log(`[Token Service] ⚡ Returning cached tokens for chain ${chainId}: ${cached.length}`);
    return cached;
  }

  console.log(`[Token Service] 🚀 Fetching tokens for chain ${chainId} from multiple sources...`);

  // Fetch from all sources in parallel
  const [oneinchTokens, uniswapTokens, paraswapTokens, lifiTokens, dexscreenerTokens] = await Promise.all([
    fetch1inchTokens(chainId),
    fetchUniswapTokens(chainId),
    fetchParaSwapTokens(chainId),
    fetchLiFiTokens(chainId),
    fetchDexScreenerTokens(chainId),
  ]);

  // Merge and deduplicate by address
  const tokenMap = new Map<string, TokenInfo>();

  // Priority order: 1inch > LiFi > DexScreener > Uniswap > ParaSwap
  // DexScreener has comprehensive coverage but lower priority for metadata quality
  [oneinchTokens, lifiTokens, dexscreenerTokens, uniswapTokens, paraswapTokens].forEach((tokens) => {
    tokens.forEach((token) => {
      const key = token.address.toLowerCase();
      // Only add if not exists, or if existing token has no logo and new one does
      if (!tokenMap.has(key)) {
        tokenMap.set(key, token);
      } else {
        // Upgrade existing token if new one has better metadata
        const existing = tokenMap.get(key)!;
        if (!existing.logoURI && token.logoURI) {
          tokenMap.set(key, { ...token, decimals: existing.decimals || token.decimals });
        } else if (existing.name === 'Unknown Token' && token.name !== 'Unknown Token') {
          tokenMap.set(key, { ...existing, name: token.name, symbol: token.symbol });
        }
      }
    });
  });

  const allTokens = Array.from(tokenMap.values());

  // Update cache
  tokenCache.set(chainId, allTokens);
  cacheTimestamp.set(chainId, Date.now());

  console.log(`[Token Service] ✅ Total unique tokens for chain ${chainId}: ${allTokens.length}`);
  return allTokens;
}

/**
 * Fetch tokens for all supported chains
 */
export async function fetchAllTokens(): Promise<TokenInfo[]> {
  // Main chains only (removed chains that don't return tokens)
  const supportedChains = [
    // Major chains
    1, 56, 137, 42161, 10, 43114, 8453, 250, 324, 59144, 534352, 1101,
  ];
  
  const allTokens = await Promise.all(
    supportedChains.map(chainId => fetchTokensForChain(chainId))
  );

  return allTokens.flat();
}

/**
 * Search tokens by query (includes DexScreener search for comprehensive results)
 */
export async function searchTokens(query: string, chainId?: number): Promise<TokenInfo[]> {
  const lowerQuery = query.toLowerCase();
  
  // First, search DexScreener for real-time results (includes new tokens)
  const dexscreenerResults: TokenInfo[] = [];
  try {
    const pairs = await searchDEXScreenerTokens(query);
    
    pairs.forEach((pair: any) => {
      const baseToken = pair.baseToken;
      if (baseToken && baseToken.address) {
        // Convert DexScreener chain name (e.g., "ethereum") to numeric chainId
        const pairChainId = DEXSCREENER_TO_CHAIN[pair.chainId?.toLowerCase()] || 1;
        
        // Filter by chainId if specified
        if (!chainId || pairChainId === chainId) {
          // Generate DexScreener CDN URL (even if info.imageUrl is missing)
          // Generate DexScreener CDN URL (even if info.imageUrl is missing)
          const dexChain = CHAIN_TO_DEXSCREENER[pairChainId] || "ethereum";
          
          // Use info.imageUrl if available, otherwise construct DexScreener CDN URL
          const logoURI = pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/${dexChain}/${baseToken.address.toLowerCase()}.png`;
          
          dexscreenerResults.push({
            address: baseToken.address,
            symbol: baseToken.symbol?.toUpperCase() || 'UNKNOWN',
            name: baseToken.name || baseToken.symbol || 'Unknown Token',
            decimals: 18,
            chainId: pairChainId,
            chainName: getChainName(pairChainId),
            logoURI: logoURI, // DexScreener URL (TrustWallet tried client-side)
          });
        }
      }
    });
    
    console.log(`[Token Service] ✅ DexScreener search: ${dexscreenerResults.length} tokens for "${query}"`);
  } catch (error) {
    console.warn(`[Token Service] ⚠️ DexScreener search failed:`, error);
  }
  
  // Then, search cached tokens from other sources
  const allTokens = chainId 
    ? await fetchTokensForChain(chainId)
    : await fetchAllTokens();

  const cachedResults = allTokens.filter((token) => {
    return (
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery)
    );
  });
  
  // Merge results, prioritizing DexScreener (more up-to-date) but deduplicating by address
  const tokenMap = new Map<string, TokenInfo>();
  
  // Add DexScreener results first (priority)
  dexscreenerResults.forEach(token => {
    const key = `${token.address.toLowerCase()}-${token.chainId}`;
    tokenMap.set(key, token);
  });
  
  // Add cached results (if not already present)
  cachedResults.forEach(token => {
    const key = `${token.address.toLowerCase()}-${token.chainId}`;
    if (!tokenMap.has(key)) {
      tokenMap.set(key, token);
    } else {
      // Upgrade with better metadata if available
      const existing = tokenMap.get(key)!;
      if (!existing.logoURI && token.logoURI) {
        tokenMap.set(key, { ...token, decimals: existing.decimals || token.decimals });
      }
    }
  });
  
  return Array.from(tokenMap.values());
}

/**
 * Get token by address and chain
 */
export async function getTokenByAddress(address: string, chainId: number): Promise<TokenInfo | null> {
  const tokens = await fetchTokensForChain(chainId);
  return tokens.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  ) || null;
}

// Helper functions
function getChainName(chainId: number): string {
  const names: { [key: number]: string } = {
    1: "Ethereum",
    56: "BSC",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    43114: "Avalanche",
    8453: "Base",
    250: "Fantom",
    100: "Gnosis",
    324: "zkSync Era",
    59144: "Linea",
    534352: "Scroll",
    42170: "Arbitrum Nova",
    1101: "Polygon zkEVM",
    // Additional chains
    19: "Songbird",
    108: "ThunderCore",
    7777777: "Zora",
    128: "HECO",
    199: "BitTorrent",
    1666600000: "Harmony",
    106: "Velas",
    57: "Syscoin",
    361: "Theta",
    40: "Telos",
    888: "Wanchain",
    88: "TomoChain",
    20: "Elastos",
    4689: "IoTeX",
    9001: "Evmos",
    2222: "Kava",
    82: "Meter",
  };
  return names[chainId] || `Chain ${chainId}`;
}

function getChainKey(chainId: number): keyof typeof TOKEN_LISTS.uniswap {
  const keys: { [key: number]: keyof typeof TOKEN_LISTS.uniswap } = {
    1: "ethereum",
    42161: "arbitrum",
    10: "optimism",
    137: "polygon",
    8453: "base",
  };
  return keys[chainId] || "ethereum";
}

/**
 * Clear token cache (useful for testing or forcing refresh)
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  cacheTimestamp.clear();
  console.log("[Token Service] Token cache cleared");
}

