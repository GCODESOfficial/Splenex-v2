import { type NextRequest, NextResponse } from "next/server"
import { covalentGoldRushService } from "@/lib/covalent-goldrush-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const chainId = searchParams.get("chainId") || "1"

    console.log(`[TokenMetadata] API request for token ${address} on chain ${chainId}`)

    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return NextResponse.json({ error: "Invalid token address" }, { status: 400 })
    }

    const covalentApiKey = process.env.COVALENT_API_KEY

    if (!covalentApiKey) {
      console.log("[TokenMetadata] ❌ Covalent API key not configured")
      return NextResponse.json({ error: "API key not configured" }, { status: 500 })
    }

    // Map chainId to Covalent chain name
    const chainMap: { [key: string]: string } = {
      "1": "eth",
      "56": "bsc", 
      "137": "polygon",
      "42161": "arbitrum",
      "10": "optimism",
      "8453": "base",
      "43114": "avalanche",
      "250": "fantom"
    }

    const covalentChain = chainMap[chainId] || "eth"

    try {
      // Use Covalent GoldRush service to get token metadata
      // We'll fetch a small balance to get the token metadata
      const tokens = await covalentGoldRushService.getTokenBalances(
        "0x0000000000000000000000000000000000000000", // Dummy address
        covalentChain,
        'USD',
        true
      )

      // Find the specific token in the results
      const token = tokens.find(t => t.address.toLowerCase() === address.toLowerCase())
      
      if (token) {
        const metadata = {
          address: token.address,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logo: token.logoUrl,
          price: token.price,
          usdValue: token.usdValue
        }

        console.log(`[TokenMetadata] Covalent API success:`, metadata)
        return NextResponse.json({ result: metadata })
      } else {
        return NextResponse.json({ error: "Token not found" }, { status: 404 })
      }
    } catch (covalentError) {
      console.log("[TokenMetadata] Covalent API error:", covalentError)
      return NextResponse.json({ error: "Failed to fetch token metadata" }, { status: 500 })
    }
  } catch (error) {
    console.error("[TokenMetadata] API route error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
