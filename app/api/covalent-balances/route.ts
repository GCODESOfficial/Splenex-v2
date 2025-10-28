import { type NextRequest, NextResponse } from "next/server"
import { covalentGoldRushService } from "@/lib/covalent-goldrush-service"

/**
 * Covalent Balance API
 * Fetches token balances using Covalent's GoldRush API
 * Documentation: https://goldrush.dev/docs/api-reference/foundational-api/balances/get-token-balances-for-address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const chain = searchParams.get("chain")
    const quoteCurrency = searchParams.get("quote-currency") || "USD"
    const noSpam = searchParams.get("no-spam") === "true"

    console.log(`[Covalent API] Request for ${chain} chain, address: ${address}`)

    if (!address || !chain) {
      return NextResponse.json({ error: "Missing address or chain parameter" }, { status: 400 })
    }

    try {
      console.log(`[Covalent API] ✅ Using GoldRush SDK for chain: ${chain}`)

      const tokens = await covalentGoldRushService.getTokenBalances(address, chain, quoteCurrency, noSpam)
      
      console.log(`[Covalent API] GoldRush SDK found ${tokens.length} tokens`)
      
      // Transform the response to match the expected format
      const transformedData = {
        data: {
          address: address,
          chain_name: chain,
          quote_currency: quoteCurrency,
          items: tokens.map(token => ({
            contract_address: token.address,
            contract_name: token.name,
            contract_ticker_symbol: token.symbol,
            contract_decimals: token.decimals,
            balance: token.balance,
            quote: token.usdValue,
            quote_rate: token.price,
            logo_url: token.logoUrl,
            native_token: token.isNative,
            type: token.type,
            is_spam: token.isSpam,
            pretty_quote: token.prettyQuote,
            pretty_quote_24h: token.prettyQuote24h,
            // Additional fields for compatibility
            token_address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            usdValue: token.usdValue,
            price: token.price
          }))
        }
      }

      return NextResponse.json(transformedData)

    } catch (error) {
      console.error(`[Covalent API] GoldRush SDK error:`, error)
      return NextResponse.json({ data: { items: [] } }, { status: 200 })
    }

  } catch (error) {
    console.error("[Covalent API] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}