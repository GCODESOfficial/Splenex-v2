import { type NextRequest, NextResponse } from "next/server"

/**
 * Test endpoint to check CoinGecko price lookup for PROVE token
 */
export async function GET(request: NextRequest) {
  const proveAddress = "0x7ddf164cecfddd0f992299d033b5a11279a15929"
  
  try {
    // Test CoinGecko lookup by address
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/token_price/binance-smart-chain?contract_addresses=${proveAddress}&vs_currencies=usd`,
      {
        headers: { 'Accept': 'application/json' },
      }
    )
    
    const data = await response.json()
    
    return NextResponse.json({
      success: response.ok,
      status: response.status,
      address: proveAddress,
      coinGeckoResponse: data,
      price: data[proveAddress.toLowerCase()]?.usd || 0,
      message: response.ok ? 'Price lookup successful' : 'Price lookup failed'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

