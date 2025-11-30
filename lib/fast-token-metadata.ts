/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Fast Token Metadata Service
 * Optimized for contract address lookups with DexScreener priority
 * Fetches metadata from multiple sources in parallel for speed and accuracy
 */

import { getDEXScreenerToken } from './dexscreener';

export interface TokenMetadata {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  chainName: string;
  logoURI?: string;
  price?: number;
  liquidity?: number;
  volume24h?: number;
}

// Cache for metadata (5 minute TTL)
const metadataCache = new Map<string, { data: TokenMetadata; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fast token metadata lookup by contract address
 * Prioritizes DexScreener for speed and accuracy
 */
export async function getTokenMetadataByAddress(
  address: string,
  chainId: number
): Promise<TokenMetadata | null> {
  const cacheKey = `${address.toLowerCase()}-${chainId}`;
  const cached = metadataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Try all sources in parallel for maximum speed
  const sources = await Promise.allSettled([
    // Priority 1: DexScreener (fastest, most comprehensive)
    fetchFromDexScreener(address, chainId),
    // Priority 2: Moralis (reliable metadata)
    fetchFromMoralis(address, chainId),
    // Priority 3: Token Lists (if available)
    fetchFromTokenLists(address, chainId),
  ]);

  // Process results in priority order
  for (const source of sources) {
    if (source.status === 'fulfilled' && source.value) {
      const metadata = source.value;
      // Cache the result
      metadataCache.set(cacheKey, { data: metadata, timestamp: Date.now() });
      return metadata;
    }
  }

  return null;
}

/**
 * Fetch metadata from DexScreener (fastest and most comprehensive)
 */
async function fetchFromDexScreener(
  address: string,
  chainId: number
): Promise<TokenMetadata | null> {
  try {
    const pairs = await getDEXScreenerToken(address);
    
    if (pairs.length === 0) {
      return null;
    }

    // Find the pair on the correct chain
    const chainPair = pairs.find(
      (p: any) => {
        // Convert DexScreener chain name to numeric chainId for comparison
        const dexChainMap: { [key: string]: number } = {
          "ethereum": 1,
          "bsc": 56,
          "polygon": 137,
          "arbitrum": 42161,
          "optimism": 10,
          "base": 8453,
          "avalanche": 43114,
          "fantom": 250,
        };
        const pairChainId = dexChainMap[p.chainId?.toLowerCase()] || 1;
        return pairChainId === chainId || pairs.length === 1;
      }
    ) || pairs[0];

    const token = chainPair.baseToken?.address.toLowerCase() === address.toLowerCase()
      ? chainPair.baseToken
      : chainPair.quoteToken?.address.toLowerCase() === address.toLowerCase()
      ? chainPair.quoteToken
      : chainPair.baseToken; // Default to base token if address doesn't match

    if (!token) {
      return null;
    }

    // Convert DexScreener chain name to numeric chainId
    const dexChainMap: { [key: string]: number } = {
      "ethereum": 1, "bsc": 56, "polygon": 137, "arbitrum": 42161,
      "optimism": 10, "base": 8453, "avalanche": 43114, "fantom": 250,
    };
    const pairChainId = dexChainMap[chainPair.chainId?.toLowerCase()] || chainId;

    // Generate DexScreener CDN URL (even if info.imageUrl is missing)
    const dexChainNameMap: { [key: number]: string } = {
      1: "ethereum", 56: "bsc", 137: "polygon", 42161: "arbitrum",
      10: "optimism", 8453: "base", 43114: "avalanche", 250: "fantom",
    };
    const dexChain = dexChainNameMap[pairChainId] || "ethereum";
    
    // Use info.imageUrl if available, otherwise construct DexScreener CDN URL
    const logoURI = chainPair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/${dexChain}/${address.toLowerCase()}.png`;

    return {
      address: address.toLowerCase(),
      symbol: token.symbol?.toUpperCase() || 'UNKNOWN',
      name: token.name || token.symbol || 'Unknown Token',
      decimals: 18, // DexScreener doesn't provide decimals
      chainId: pairChainId,
      chainName: getChainName(pairChainId),
      logoURI: logoURI, // DIRECT FROM DEXSCREENER!
      price: parseFloat(chainPair.priceUsd || '0'),
      liquidity: chainPair.liquidity?.usd || 0,
      volume24h: chainPair.volume?.h24 || 0,
      source: 'dexscreener',
    } as TokenMetadata & { source: string };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch metadata from Moralis (reliable but slower)
 */
async function fetchFromMoralis(
  address: string,
  chainId: number
): Promise<TokenMetadata | null> {
  try {
    const chainMap: { [key: number]: string } = {
      1: 'eth',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      8453: 'base',
      43114: 'avalanche',
      250: 'fantom',
    };

    const moralisChain = chainMap[chainId] || 'eth';
    const moralisApiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY;

    if (!moralisApiKey) {
      return null;
    }

    const response = await fetch(
      `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${moralisChain}&addresses=${address}`,
      {
        headers: {
          'X-API-Key': moralisApiKey,
          'Accept': 'application/json',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const token = Array.isArray(data) ? data[0] : data;

    if (!token) {
      return null;
    }

    return {
      address: address.toLowerCase(),
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || 'Unknown Token',
      decimals: parseInt(token.decimals) || 18,
      chainId,
      chainName: getChainName(chainId),
      logoURI: token.logo || undefined,
      source: 'moralis',
    } as TokenMetadata & { source: string };
  } catch (error) {
    return null;
  }
}

/**
 * Fetch metadata from token lists (if available)
 */
async function fetchFromTokenLists(
  address: string,
  chainId: number
): Promise<TokenMetadata | null> {
  try {
    // Try 1inch token list first
    const chainName = CHAIN_TO_1INCH[chainId];
    if (chainName) {
      const response = await fetch(`https://tokens.1inch.io/v1.0/${chainName}/`, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 3600 },
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.tokens?.find(
          (t: any) => t.address.toLowerCase() === address.toLowerCase()
        );

        if (token) {
          return {
            address: address.toLowerCase(),
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            chainId,
            chainName: getChainName(chainId),
            logoURI: token.logoURI,
            source: '1inch',
          } as TokenMetadata & { source: string };
        }
      }
    }
  } catch (error) {
    // Silent fail
  }
  return null;
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
  };
  return names[chainId] || `Chain ${chainId}`;
}

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

/**
 * Check if a string is a valid contract address
 */
export function isContractAddress(query: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(query);
}

/**
 * Fast search optimized for contract addresses
 * Detects contract addresses and queries DexScreener directly
 */
export async function fastTokenSearch(
  query: string,
  chainId?: number
): Promise<TokenMetadata[]> {
  const lowerQuery = query.toLowerCase().trim();

  // If it's a contract address, query DexScreener directly
  if (isContractAddress(query)) {
    
    // Try all chains if no chainId specified
    const chainsToSearch = chainId 
      ? [chainId] 
      : [1, 56, 137, 42161, 10, 8453, 43114, 250];

    const results = await Promise.all(
      chainsToSearch.map(async (cid) => {
        const metadata = await getTokenMetadataByAddress(query, cid);
        return metadata;
      })
    );

    const found = results.filter((r): r is TokenMetadata => r !== null);
    
    if (found.length > 0) {
      return found;
    }
  }

  // For non-address queries, use regular search
  // This will be handled by the search-tokens API which includes DexScreener
  return [];
}

