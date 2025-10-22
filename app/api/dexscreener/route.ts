import { NextRequest, NextResponse } from "next/server";
import { getDEXScreenerToken, searchDEXScreenerTokens } from "@/lib/dexscreener";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tokenAddress = searchParams.get("token");
    const query = searchParams.get("q");

    if (tokenAddress) {
      // Get token pairs
      const pairs = await getDEXScreenerToken(tokenAddress);
      return NextResponse.json({ success: true, pairs });
    } else if (query) {
      // Search tokens
      const results = await searchDEXScreenerTokens(query);
      return NextResponse.json({ success: true, results });
    } else {
      return NextResponse.json(
        { success: false, error: "Missing token address or query" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "DEXScreener request failed" 
      },
      { status: 500 }
    );
  }
}


