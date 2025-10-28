import { type NextRequest, NextResponse } from "next/server"
import { moralisService } from "@/lib/moralis-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const chain = searchParams.get("chain")

    console.log(`[Tokens API] Request for ${chain} chain, address: ${address}`)

    if (!address || !chain) {
      return NextResponse.json({ error: "Missing address or chain parameter" }, { status: 400 })
    }

    const moralisApiKey = process.env.MORALIS_API_KEY

    if (!moralisApiKey) {
      console.log("[Tokens API] ❌ Moralis API key not configured, returning empty result")
      console.log("[Tokens API] Please set MORALIS_API_KEY environment variable")
      return NextResponse.json({ result: [] }, { status: 200 })
    }
    
    console.log(`[Tokens API] ✅ Moralis API key configured, making request to chain: ${chain}`)

    try {
      const tokens = await moralisService.getTokenBalances(address, chain)
      
      console.log(`[Tokens API] Moralis found ${tokens.length} tokens`)
      
      // Transform the response to match the expected format
      const transformedData = {
        result: tokens.map(token => ({
          contract_address: token.address,
          contract_name: token.name,
          contract_ticker_symbol: token.symbol,
          contract_decimals: token.decimals,
          balance: token.balance,
          quote: token.usdValue,
          quote_rate: token.price,
          logo_url: token.logoUrl,
          native_token: token.isNative || false,
          // Additional fields for compatibility
          token_address: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          usdValue: token.usdValue,
          price: token.price
        }))
      }

      console.log(`[Tokens API] Moralis API success for ${chain}:`, transformedData)
      return NextResponse.json(transformedData)
    } catch (moralisError) {
      console.log("[Tokens API] Moralis API error:", moralisError)
      return NextResponse.json({ result: [] }, { status: 200 })
    }
  } catch (error) {
    console.error("[Tokens API] API route error:", error)
    return NextResponse.json({ result: [] }, { status: 200 })
  }
}
