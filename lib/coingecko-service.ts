/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * CoinGecko API Integration Service
 * Fetches comprehensive token data including logos for all supported chains
 */

export interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  platforms: {
    [key: string]: string; // chain name -> contract address
  };
  image: string; // logo URL
  market_cap_rank?: number;
  current_price?: number;
}

export interface FormattedToken {
  id: string;
  symbol: string;
  name: string;
  address: string;
  chainId: number;
  chainName: string;
  logoURI: string;
  decimals: number;
  marketCapRank?: number;
  price?: number;
}

// Map CoinGecko platform names to chain IDs
const PLATFORM_TO_CHAIN_ID: { [key: string]: { chainId: number; chainName: string } } = {
  "ethereum": { chainId: 1, chainName: "Ethereum" },
  "binance-smart-chain": { chainId: 56, chainName: "BSC" },
  "polygon-pos": { chainId: 137, chainName: "Polygon" },
  "arbitrum-one": { chainId: 42161, chainName: "Arbitrum" },
  "optimistic-ethereum": { chainId: 10, chainName: "Optimism" },
  "avalanche": { chainId: 43114, chainName: "Avalanche" },
  "base": { chainId: 8453, chainName: "Base" },
  "fantom": { chainId: 250, chainName: "Fantom" },
  "harmony-shard-0": { chainId: 1666600000, chainName: "Harmony" },
  "moonriver": { chainId: 1285, chainName: "Moonriver" },
  "moonbeam": { chainId: 1284, chainName: "Moonbeam" },
  "cronos": { chainId: 25, chainName: "Cronos" },
  "celo": { chainId: 42220, chainName: "Celo" },
  "aurora": { chainId: 1313161554, chainName: "Aurora" },
  "metis-andromeda": { chainId: 1088, chainName: "Metis" },
  "kucoin-community-chain": { chainId: 321, chainName: "KCC" },
  "okex-chain": { chainId: 66, chainName: "OKExChain" },
  "huobi-token": { chainId: 128, chainName: "HECO" },
  "fuse": { chainId: 122, chainName: "Fuse" },
  "bittorrent": { chainId: 199, chainName: "BitTorrent" },
  "polygon-zkevm": { chainId: 1101, chainName: "Polygon zkEVM" },
  "zksync": { chainId: 324, chainName: "zkSync Era" },
  "linea": { chainId: 59144, chainName: "Linea" },
  "solana": { chainId: 99998, chainName: "Solana" },
  "cosmos": { chainId: 99999, chainName: "Cosmos" },
  // Additional EVM chains
  "xdai": { chainId: 100, chainName: "Gnosis" },
  "energi": { chainId: 39797, chainName: "Energi" },
  "velas": { chainId: 106, chainName: "Velas" },
  "syscoin": { chainId: 57, chainName: "Syscoin" },
  "theta": { chainId: 361, chainName: "Theta" },
  "telos": { chainId: 40, chainName: "Telos" },
  "tomochain": { chainId: 88, chainName: "TomoChain" },
  "wanchain": { chainId: 888, chainName: "Wanchain" },
  "elastos": { chainId: 20, chainName: "Elastos" },
  "iotex": { chainId: 4689, chainName: "IoTeX" },
  "evmos": { chainId: 9001, chainName: "Evmos" },
  "kava": { chainId: 2222, chainName: "Kava" },
  "klaytn": { chainId: 8217, chainName: "Klaytn" },
  "meter": { chainId: 82, chainName: "Meter" },
  "oasis": { chainId: 42262, chainName: "Oasis Emerald" },
  "okex": { chainId: 66, chainName: "OKExChain" },
  "ronin": { chainId: 2020, chainName: "Ronin" },
  "smartbch": { chainId: 10000, chainName: "SmartBCH" },
  "songbird": { chainId: 19, chainName: "Songbird" },
  "thundercore": { chainId: 108, chainName: "ThunderCore" },
  "arbitrum-nova": { chainId: 42170, chainName: "Arbitrum Nova" },
  "scroll": { chainId: 534352, chainName: "Scroll" },
  "mantle": { chainId: 5000, chainName: "Mantle" },
  "manta-pacific": { chainId: 169, chainName: "Manta Pacific" },
  "blast": { chainId: 81457, chainName: "Blast" },
  "mode": { chainId: 34443, chainName: "Mode" },
  "opbnb": { chainId: 204, chainName: "opBNB" },
  "zora": { chainId: 7777777, chainName: "Zora" },
};

// CoinGecko API endpoints (free tier)
const COINGECKO_API_BASE = "https://api.coingecko.com/api/v3";

// Cache for tokens (in-memory, could be replaced with Redis)
let tokenCache: FormattedToken[] = [];
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Fetch tokens from CoinGecko with REAL logos - OPTIMIZED VERSION
 * Pre-builds comprehensive token list with actual CoinGecko image URLs
 * This runs SERVER-SIDE on first call, then cached for 1 hour
 */
export async function fetchCoinGeckoTokens(): Promise<FormattedToken[]> {
  // Check cache - return immediately if available
  if (tokenCache.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log("[CoinGecko] ⚡ Returning cached tokens:", tokenCache.length);
    return tokenCache;
  }

  try {
    console.log("[CoinGecko] 🔄 Building token database with real logos from CoinGecko...");
    console.log("[CoinGecko] This will take ~30 seconds initially, then cached for 1 hour");
    
    const formattedTokens: FormattedToken[] = [];
    
    // Fetch first 5 pages only for speed (500 top tokens by market cap)
    // These are the tokens people actually use
    const pages = 5;
    
    for (let page = 1; page <= pages; page++) {
      try {
        // Fetch markets data (includes images!)
        const marketsResponse = await fetch(
          `${COINGECKO_API_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=${page}&sparkline=false`,
          {
            headers: { 'Accept': 'application/json' },
          }
        );

        if (!marketsResponse.ok) {
          console.warn(`[CoinGecko] Page ${page} markets failed: ${marketsResponse.status}`);
          break;
        }

        const marketTokens = await marketsResponse.json();
        console.log(`[CoinGecko] 📄 Page ${page}/$ {pages}: Got ${marketTokens.length} tokens with images`);
        
        // For each token, we need to fetch platform data to get contract addresses
        // Batch process to avoid overwhelming the API
        const batchSize = 10;
        for (let i = 0; i < marketTokens.length; i += batchSize) {
          const batch = marketTokens.slice(i, i + batchSize);
          
          await Promise.all(batch.map(async (token: any) => {
            try {
              // Fetch platform data
              const detailResponse = await fetch(
                `${COINGECKO_API_BASE}/coins/${token.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
                {
                  headers: { 'Accept': 'application/json' },
                }
              );

              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                const platforms = detailData.platforms || {};
                const realImage = detailData.image?.small || detailData.image?.thumb || token.image;

                // Create entry for each platform
                for (const [platform, contractAddress] of Object.entries(platforms)) {
                  const chainInfo = PLATFORM_TO_CHAIN_ID[platform];
                  
                  if (chainInfo && contractAddress && typeof contractAddress === 'string') {
                    formattedTokens.push({
                      id: token.id,
                      symbol: token.symbol.toUpperCase(),
                      name: token.name,
                      address: contractAddress,
                      chainId: chainInfo.chainId,
                      chainName: chainInfo.chainName,
                      logoURI: realImage, // REAL CoinGecko logo URL!
                      decimals: getTokenDecimals(token.symbol.toUpperCase(), chainInfo.chainId),
                      marketCapRank: token.market_cap_rank,
                      price: token.current_price,
                    });
                  }
                }
              }
            } catch (tokenError) {
              // Skip this token if it fails
              console.warn(`[CoinGecko] Skipped ${token.id}:`, tokenError);
            }
          }));
          
          // Small delay between batches to respect rate limits
          if (i + batchSize < marketTokens.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        console.log(`[CoinGecko] ✅ Page ${page} complete: ${formattedTokens.length} total tokens so far`);
        
        // Delay between pages to respect rate limits
        if (page < pages) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (pageError) {
        console.error(`[CoinGecko] Error on page ${page}:`, pageError);
        break;
      }
    }

    console.log(`[CoinGecko] 🎉 COMPLETE! Built database with ${formattedTokens.length} tokens with real CoinGecko logos`);
    console.log(`[CoinGecko] 💾 Cached for 1 hour - subsequent loads will be instant!`);
    
    // Update cache
    if (formattedTokens.length > 0) {
      tokenCache = formattedTokens;
      cacheTimestamp = Date.now();
    }

    return formattedTokens;
  } catch (error) {
    console.error("[CoinGecko] Error fetching tokens:", error);
    
    // Return cached data if available
    if (tokenCache.length > 0) {
      console.log("[CoinGecko] Returning stale cache due to error");
      return tokenCache;
    }
    
    return [];
  }
}

/**
 * Search tokens by symbol or name
 */
export async function searchCoinGeckoTokens(
  query: string,
  chainId?: number
): Promise<FormattedToken[]> {
  const allTokens = await fetchCoinGeckoTokens();
  
  const lowerQuery = query.toLowerCase();
  
  return allTokens.filter((token) => {
    const matchesQuery = 
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery) ||
      token.address.toLowerCase().includes(lowerQuery);
    
    const matchesChain = !chainId || token.chainId === chainId;
    
    return matchesQuery && matchesChain;
  });
}

/**
 * Get tokens for a specific chain
 */
export async function getCoinGeckoTokensByChain(
  chainId: number
): Promise<FormattedToken[]> {
  const allTokens = await fetchCoinGeckoTokens();
  
  return allTokens.filter((token) => token.chainId === chainId);
}

/**
 * Get token details by address and chain
 */
export async function getCoinGeckoTokenByAddress(
  address: string,
  chainId: number
): Promise<FormattedToken | null> {
  const allTokens = await fetchCoinGeckoTokens();
  
  return allTokens.find(
    (token) => 
      token.address.toLowerCase() === address.toLowerCase() && 
      token.chainId === chainId
  ) || null;
}

/**
 * Helper to get standard decimals for tokens
 */
function getTokenDecimals(symbol: string, chainId: number): number {
  // USDT decimals vary by chain
  if (symbol === "USDT") {
    return [1, 42161, 137].includes(chainId) ? 6 : 18;
  }
  // USDC always uses 6
  if (symbol === "USDC") return 6;
  // WBTC uses 8
  if (symbol === "WBTC") return 8;
  // Most tokens use 18
  return 18;
}

/**
 * Fetch trending tokens (popular tokens to show first)
 */
export async function getTrendingTokens(): Promise<FormattedToken[]> {
  try {
    const response = await fetch(`${COINGECKO_API_BASE}/search/trending`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const trendingCoins = data.coins || [];

    const allTokens = await fetchCoinGeckoTokens();
    
    // Match trending coins with our token list
    const trendingTokens: FormattedToken[] = [];
    
    for (const trendingCoin of trendingCoins) {
      const matchedTokens = allTokens.filter(
        (token) => token.id === trendingCoin.item.id
      );
      trendingTokens.push(...matchedTokens);
    }

    return trendingTokens;
  } catch (error) {
    console.error("[CoinGecko] Error fetching trending tokens:", error);
    return [];
  }
}

/**
 * Clear token cache (useful for testing or forcing refresh)
 */
export function clearTokenCache(): void {
  tokenCache = [];
  cacheTimestamp = 0;
  console.log("[CoinGecko] Token cache cleared");
}

