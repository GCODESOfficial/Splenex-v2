import { NextRequest, NextResponse } from "next/server";
import { searchTokens } from "@/lib/reliable-token-service";
import { fastTokenSearch, isContractAddress, getTokenMetadataByAddress } from "@/lib/fast-token-metadata";

/**
 * Optimized token search API
 * - Contract addresses: Direct DexScreener lookup (fastest)
 * - Symbol/name queries: Multi-source search with DexScreener priority
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const chainId = searchParams.get("chainId");

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: false,
        error: "Search query must be at least 2 characters",
      }, { status: 400 });
    }

    console.log(`[Search API] 🔍 Searching for: "${query}"${chainId ? ` on chain ${chainId}` : ""}`);

    // OPTIMIZATION: If it's a contract address, use fast direct lookup (no debounce needed)
    if (isContractAddress(query.trim())) {
      console.log(`[Search API] ⚡ Contract address detected, using fast DexScreener lookup`);
      
      const searchChainId = chainId ? parseInt(chainId) : undefined;
      const fastResults = await fastTokenSearch(query, searchChainId);
      
      if (fastResults.length > 0) {
        const formattedTokens = fastResults.map(token => ({
          id: token.address.toLowerCase(),
          symbol: token.symbol,
          name: token.name,
          address: token.address,
          chainId: token.chainId,
          chainName: token.chainName,
          logoURI: token.logoURI,
          decimals: token.decimals,
          price: token.price,
          liquidity: token.liquidity,
          volume24h: token.volume24h,
        }));

        console.log(`[Search API] ✅ Fast search found ${formattedTokens.length} tokens`);
        return NextResponse.json({
          success: true,
          data: formattedTokens,
          count: formattedTokens.length,
          source: 'dexscreener-direct',
        });
      }
      
      // If fast search fails, fall through to regular search
    }

    // Regular search (includes DexScreener search internally)
    const tokens = await searchTokens(
      query,
      chainId ? parseInt(chainId) : undefined
    );

    console.log(`[Search API] ✅ Found ${tokens.length} tokens for "${query}"`);

    // Format tokens for response
    const formattedTokens = tokens.map(token => ({
      id: token.address.toLowerCase(),
      symbol: token.symbol,
      name: token.name,
      address: token.address,
      chainId: token.chainId,
      chainName: token.chainName,
      logoURI: token.logoURI,
      decimals: token.decimals,
      marketCapRank: token.marketCapRank,
    }));

    // Log how many tokens have logos
    const tokensWithLogos = formattedTokens.filter(t => t.logoURI);
    console.log(`[Search API] 🖼️ Tokens with logos: ${tokensWithLogos.length}/${formattedTokens.length}`);

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


