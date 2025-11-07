/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * DEXScreener Integration
 * 
 * Provides price data and quotes for lower-cap tokens
 * not available on major aggregators
 */

export interface DEXScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  info?: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
  };
  txns: {
    m5: { buys: number; sells: number };
    h1: { buys: number; sells: number };
    h6: { buys: number; sells: number };
    h24: { buys: number; sells: number };
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
    m5: number;
  };
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  marketCap: number;
}

const DEXSCREENER_API = "https://api.dexscreener.com/latest/dex";

/**
 * Get token price and pairs from DEXScreener
 */
export async function getDEXScreenerToken(tokenAddress: string): Promise<DEXScreenerPair[]> {
  try {
    const response = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`);
    
    if (!response.ok) {
      throw new Error(`DEXScreener API error: ${response.status}`);
    }

    const data = await response.json();
    return data.pairs || [];
  } catch (error) {
    console.error("[DEXScreener] Error fetching token:", error);
    return [];
  }
}

/**
 * Get best quote for a token swap
 */
export async function getDEXScreenerQuote(
  fromToken: string,
  toToken: string,
  amount: number
): Promise<{ price: number; usdValue: number; pair: DEXScreenerPair | null }> {
  try {
    const pairs = await getDEXScreenerToken(fromToken);
    
    if (pairs.length === 0) {
      return { price: 0, usdValue: 0, pair: null };
    }

    // Find best pair (highest liquidity)
    const bestPair = pairs.sort((a, b) => b.liquidity.usd - a.liquidity.usd)[0];
    
    const price = parseFloat(bestPair.priceUsd);
    const usdValue = amount * price;

    return { price, usdValue, pair: bestPair };
  } catch (error) {
    console.error("[DEXScreener] Error getting quote:", error);
    return { price: 0, usdValue: 0, pair: null };
  }
}

/**
 * Search for tokens on DEXScreener
 */
export async function searchDEXScreenerTokens(query: string): Promise<DEXScreenerPair[]> {
  try {
    const response = await fetch(`${DEXSCREENER_API}/search/?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`DEXScreener search error: ${response.status}`);
    }

    const data = await response.json();
    return data.pairs || [];
  } catch (error) {
    console.error("[DEXScreener] Search error:", error);
    return [];
  }
}

/**
 * Get chain-specific pairs
 */
export async function getDEXScreenerChainPairs(chainId: string, page = 1): Promise<DEXScreenerPair[]> {
  try {
    // Map numeric chainId to DEXScreener chain names (full mapping)
    const chainMap: Record<string, string> = {
      '1': 'ethereum',
      '56': 'bsc',
      '137': 'polygon',
      '42161': 'arbitrum',
      '10': 'optimism',
      '8453': 'base',
      '43114': 'avalanche',
      '250': 'fantom',
      '100': 'gnosis',
      '324': 'zksync',
      '59144': 'linea',
      '534352': 'scroll',
      '42170': 'arbitrum-nova',
      '1101': 'polygon-zkevm',
      // Additional chains
      '19': 'songbird',
      '108': 'thundercore',
      '7777777': 'zora',
      '128': 'heco',
      '199': 'bittorrent',
      '1666600000': 'harmony',
      '106': 'velas',
      '57': 'syscoin',
      '361': 'theta',
      '40': 'telos',
      '888': 'wanchain',
      '88': 'tomochain',
      '20': 'elastos',
      '4689': 'iotex',
      '9001': 'evmos',
      '2222': 'kava',
      '82': 'meter',
    };

    const chainName = chainMap[chainId];
    if (!chainName) {
      console.warn(`[DEXScreener] Chain ${chainId} not supported`);
      return [];
    }

    const response = await fetch(`${DEXSCREENER_API}/pairs/${chainName}?page=${page}`);
    
    if (!response.ok) {
      console.warn(`[DEXScreener] Chain pairs error for ${chainName}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    // Handle different response formats
    if (Array.isArray(data.pairs)) {
      return data.pairs;
    }
    
    // Some chains return null pairs
    if (data.pairs === null || data.pairs === undefined) {
      if (page === 1) {
        console.warn(`[DEXScreener] No pairs available for ${chainName} (chain ${chainId}) - chain may not be supported`);
      }
      return [];
    }
    
    // If pairs is an object (not array), it might be a different format
    if (typeof data.pairs === 'object' && !Array.isArray(data.pairs)) {
      if (page === 1) {
        console.warn(`[DEXScreener] Unexpected pairs format for ${chainName}:`, typeof data.pairs);
      }
      return [];
    }
    
    return [];
  } catch (error) {
    console.error("[DEXScreener] Error fetching chain pairs:", error);
    return [];
  }
}


