import { NextRequest, NextResponse } from "next/server";

/**
 * Real-time token search using CoinGecko Search API
 * This endpoint searches ALL CoinGecko tokens instantly
 * No pre-caching required - works immediately!
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: "Search query must be at least 2 characters",
      }, { status: 400 });
    }

    console.log(`[Search API] 🔍 Searching for: "${query}"`);

    // Use CoinGecko's search endpoint with caching to reduce rate limits
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 600 }, // Cache for 10 minutes
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko search API error: ${response.status}`);
    }

    const data = await response.json();
    const coins = data.coins || [];

    console.log(`[Search API] ✅ Found ${coins.length} tokens for "${query}"`);

    // For each coin, fetch platform data with delays to avoid rate limits
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tokensWithPlatforms: any[] = [];
    
    // Process more tokens for better coverage
    for (let i = 0; i < Math.min(coins.length, 30); i++) {
      const coin = coins[i];
      try {
        // Add small delay between requests to avoid rate limits (50ms - faster)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        const detailResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
          {
            headers: { 'Accept': 'application/json' },
            next: { revalidate: 300 }, // Cache for 5 minutes
          }
        );

        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          tokensWithPlatforms.push({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            logoURI: detail.image?.small || detail.image?.thumb || coin.large || coin.thumb,
            platforms: detail.platforms || {},
            marketCapRank: coin.market_cap_rank,
            // Add additional metadata
            description: detail.description?.en?.substring(0, 100) || '',
            categories: detail.categories || [],
            homepage: detail.links?.homepage?.[0] || '',
          });
        } else {
          // If detail fetch fails, still include basic info
          console.warn(`[Search API] Detail fetch failed for ${coin.id}, using basic data`);
          tokensWithPlatforms.push({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            logoURI: coin.large || coin.thumb,
            platforms: {},
            marketCapRank: coin.market_cap_rank,
          });
        }
      } catch (error) {
        console.warn(`[Search API] Failed to fetch details for ${coin.id}:`, error);
        // Include token even if detail fetch fails
        tokensWithPlatforms.push({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          logoURI: coin.large || coin.thumb,
          platforms: {},
          marketCapRank: coin.market_cap_rank,
        });
      }
    }

    const validTokens = tokensWithPlatforms;

    // Format tokens for all available chains
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedTokens: any[] = [];
    const PLATFORM_TO_CHAIN: { [key: string]: { chainId: number; chainName: string } } = {
      // Major EVM Chains
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
      "boba-network": { chainId: 288, chainName: "Boba" },
      "gnosis": { chainId: 100, chainName: "Gnosis" },
      "polygon-zkevm": { chainId: 1101, chainName: "Polygon zkEVM" },
      "zksync-era": { chainId: 324, chainName: "zkSync Era" },
      "linea": { chainId: 59144, chainName: "Linea" },
      "scroll": { chainId: 534352, chainName: "Scroll" },
      "mantle": { chainId: 5000, chainName: "Mantle" },
      "blast": { chainId: 81457, chainName: "Blast" },
      
      // Additional EVM Chains
      "heco": { chainId: 128, chainName: "HECO" },
      "fuse": { chainId: 122, chainName: "Fuse" },
      "bittorrent": { chainId: 199, chainName: "BitTorrent" },
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
      "thundercore": { chainId: 108, chainName: "ThunderCore" },
      "arbitrum-nova": { chainId: 42170, chainName: "Arbitrum Nova" },
      
      // Non-EVM Chains
      "solana": { chainId: 101, chainName: "Solana" }, // Use standard Solana chain ID
      "near-protocol": { chainId: 99999, chainName: "NEAR" },
      "cosmos": { chainId: 99999, chainName: "Cosmos" },
      "osmosis": { chainId: 99999, chainName: "Osmosis" },
      "juno": { chainId: 99999, chainName: "Juno" },
      "akash": { chainId: 99999, chainName: "Akash" },
      "secret": { chainId: 99999, chainName: "Secret" },
      "persistence": { chainId: 99999, chainName: "Persistence" },
      "stargaze": { chainId: 99999, chainName: "Stargaze" },
      "axelar": { chainId: 99999, chainName: "Axelar" },
      "band-protocol": { chainId: 99999, chainName: "Band Protocol" },
      "thorchain": { chainId: 99999, chainName: "THORChain" },
      
      // Bitcoin and Major Cryptocurrencies
      "bitcoin": { chainId: 0, chainName: "Bitcoin" },
      "litecoin": { chainId: 0, chainName: "Litecoin" },
      "dogecoin": { chainId: 0, chainName: "Dogecoin" },
      "bitcoin-cash": { chainId: 0, chainName: "Bitcoin Cash" },
      "ripple": { chainId: 0, chainName: "Ripple" },
      "stellar": { chainId: 0, chainName: "Stellar" },
      "monero": { chainId: 0, chainName: "Monero" },
      "zcash": { chainId: 0, chainName: "Zcash" },
      "dash": { chainId: 0, chainName: "Dash" },
      "ethereum-classic": { chainId: 61, chainName: "Ethereum Classic" },
    };

    for (const token of validTokens) {
      if (!token) continue;

      const platformEntries = Object.entries(token.platforms);
      
      if (platformEntries.length > 0) {
        // Token has platform data - add entry for each platform
        for (const [platform, address] of platformEntries) {
          const chainInfo = PLATFORM_TO_CHAIN[platform];
          
          if (chainInfo && address && typeof address === 'string') {
            formattedTokens.push({
              id: token.id,
              symbol: token.symbol,
              name: token.name,
              address: address,
              chainId: chainInfo.chainId,
              chainName: chainInfo.chainName,
              logoURI: token.logoURI,
              decimals: getTokenDecimals(token.symbol, chainInfo.chainId),
              marketCapRank: token.marketCapRank,
            });
          }
        }
      } else {
        // NO PLATFORM DATA - Try to determine the most likely chain based on token characteristics
        let defaultChain = { chainId: 56, chainName: "BSC" }; // Default to BSC
        
        // Smart chain selection based on token characteristics
        if (token.marketCapRank && token.marketCapRank <= 100) {
          // Top 100 tokens are likely on Ethereum
          defaultChain = { chainId: 1, chainName: "Ethereum" };
        } else if (token.symbol.includes('DOGE') || token.symbol.includes('SHIB') || token.symbol.includes('PEPE')) {
          // Meme tokens are often on BSC or Ethereum
          defaultChain = { chainId: 56, chainName: "BSC" };
        } else if (token.categories && token.categories.includes('solana-ecosystem')) {
          // Solana ecosystem tokens
          defaultChain = { chainId: 99998, chainName: "Solana" };
        } else if (token.categories && token.categories.includes('cosmos-ecosystem')) {
          // Cosmos ecosystem tokens
          defaultChain = { chainId: 99999, chainName: "Cosmos" };
        }
        
        console.log(`[Search API] ⚠️ ${token.symbol} has no platform data, defaulting to ${defaultChain.chainName}`);
        formattedTokens.push({
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          address: "0x0000000000000000000000000000000000000000", // Placeholder - user needs to find actual address
          chainId: defaultChain.chainId,
          chainName: defaultChain.chainName,
          logoURI: token.logoURI,
          decimals: 18,
          marketCapRank: token.marketCapRank,
          isPlaceholder: true, // Mark as placeholder so UI can show a note
          description: token.description,
          categories: token.categories,
          homepage: token.homepage,
        });
      }
    }

    console.log(`[Search API] 📦 Returning ${formattedTokens.length} token results`);

    return NextResponse.json({
      success: true,
      data: formattedTokens,
      count: formattedTokens.length,
    });
  } catch (error) {
    console.error("[Search API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 }
    );
  }
}

function getTokenDecimals(symbol: string, chainId: number): number {
  if (symbol === "USDT") {
    return [1, 42161, 137].includes(chainId) ? 6 : 18;
  }
  if (symbol === "USDC") return 6;
  if (symbol === "WBTC") return 8;
  return 18;
}

