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
    
    for (let i = 0; i < Math.min(coins.length, 20); i++) {
      const coin = coins[i];
      try {
        // Add small delay between requests to avoid rate limits (100ms)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
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
      "ethereum": { chainId: 1, chainName: "Ethereum" },
      "binance-smart-chain": { chainId: 56, chainName: "BSC" },
      "polygon-pos": { chainId: 137, chainName: "Polygon" },
      "arbitrum-one": { chainId: 42161, chainName: "Arbitrum" },
      "optimistic-ethereum": { chainId: 10, chainName: "Optimism" },
      "avalanche": { chainId: 43114, chainName: "Avalanche" },
      "base": { chainId: 8453, chainName: "Base" },
      "fantom": { chainId: 250, chainName: "Fantom" },
      "solana": { chainId: 1151111081099710, chainName: "Solana" },
      "near-protocol": { chainId: 397, chainName: "NEAR" },
      "cronos": { chainId: 25, chainName: "Cronos" },
      "gnosis": { chainId: 100, chainName: "Gnosis" },
      "celo": { chainId: 42220, chainName: "Celo" },
      "harmony-shard-0": { chainId: 1666600000, chainName: "Harmony" },
      "moonbeam": { chainId: 1284, chainName: "Moonbeam" },
      "moonriver": { chainId: 1285, chainName: "Moonriver" },
      "kava": { chainId: 2222, chainName: "Kava" },
      "aurora": { chainId: 1313161554, chainName: "Aurora" },
      "boba": { chainId: 288, chainName: "Boba" },
      "metis-andromeda": { chainId: 1088, chainName: "Metis" },
      "fuse": { chainId: 122, chainName: "Fuse" },
      "evmos": { chainId: 9001, chainName: "Evmos" },
      "okex-chain": { chainId: 66, chainName: "OKX" },
      "heco": { chainId: 128, chainName: "HECO" },
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
        // NO PLATFORM DATA - Show on BSC by default (most meme coins are on BSC)
        console.log(`[Search API] ⚠️ ${token.symbol} has no platform data, defaulting to BSC`);
        formattedTokens.push({
          id: token.id,
          symbol: token.symbol,
          name: token.name,
          address: "0x0000000000000000000000000000000000000000", // Placeholder - user needs to find actual address
          chainId: 56,
          chainName: "BSC",
          logoURI: token.logoURI,
          decimals: 18,
          marketCapRank: token.marketCapRank,
          isPlaceholder: true, // Mark as placeholder so UI can show a note
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

