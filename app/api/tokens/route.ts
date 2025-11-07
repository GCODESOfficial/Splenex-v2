import { NextRequest, NextResponse } from "next/server";
import { fetchTokensForChain, fetchAllTokens, searchTokens, getTokenByAddress } from "@/lib/reliable-token-service";
import { getTokenMetadataByAddress } from "@/lib/fast-token-metadata";
import { moralisService } from "@/lib/moralis-service";

/**
 * Reliable Token API - Uses Moralis for wallet balances
 * Fetches tokens from multiple reliable sources:
 * - Moralis API (for wallet balances)
 * - 1inch Token Lists
 * - Uniswap Token Lists
 * - ParaSwap Token Lists
 * - LiFi API
 * - DexScreener (optimized for contract addresses)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get("chainId");
    const chain = searchParams.get("chain"); // Moralis chain name (eth, bsc, polygon, etc.)
    const query = searchParams.get("q");
    const address = searchParams.get("address");

    // If address and chain are provided, fetch wallet balances from Moralis
    if (address && chain) {
      console.log(`[Tokens API] 📊 Fetching Moralis balances for ${address} on ${chain}`);
      try {
        const tokens = await moralisService.getTokenBalances(address, chain);
        return NextResponse.json({ 
          success: true, 
          result: tokens.map(t => ({
            token_address: t.address,
            symbol: t.symbol,
            name: t.name,
            balance: t.balance,
            balance_formatted: t.balance,
            usd_price: t.price,
            usd_value: t.usdValue,
            decimals: t.decimals,
            chain: t.chain,
            chainId: t.chainId
          }))
        });
      } catch (moralisError) {
        console.error(`[Tokens API] ❌ Moralis error:`, moralisError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch balances from Moralis" },
          { status: 500 }
        );
      }
    }

    // If address is provided, use fast metadata lookup (prioritizes DexScreener)
    if (address && chainId) {
      console.log(`[Tokens API] ⚡ Fast metadata lookup for ${address} on chain ${chainId}`);
      const metadata = await getTokenMetadataByAddress(address, parseInt(chainId));
      if (metadata) {
        return NextResponse.json({ success: true, data: metadata });
      } else {
        // Fallback to regular token service
        const token = await getTokenByAddress(address, parseInt(chainId));
        if (token) {
          return NextResponse.json({ success: true, data: token });
        } else {
          return NextResponse.json({ success: false, error: "Token not found" }, { status: 404 });
        }
      }
    }

    if (query) {
      // Search tokens
      const tokens = await searchTokens(
        query,
        chainId ? parseInt(chainId) : undefined
      );
      return NextResponse.json({ success: true, data: tokens });
    }

    if (chainId) {
      // Get tokens for specific chain
      const tokens = await fetchTokensForChain(parseInt(chainId));
      console.log(`[Tokens API] ✅ Fetched ${tokens.length} tokens for chain ${chainId}`);
      return NextResponse.json({ success: true, tokens: tokens });
    }

    // Get all tokens
    const tokens = await fetchAllTokens();
    return NextResponse.json({ success: true, data: tokens });
  } catch (error) {
    console.error("[Tokens API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch tokens" },
      { status: 500 }
    );
  }
}
