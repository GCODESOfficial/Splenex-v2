import { type NextRequest, NextResponse } from "next/server"

/**
 * Aptos Balance API
 * Fetches token balances from Aptos blockchain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Missing address parameter" }, { status: 400 })
    }

    console.log(`[Aptos API] Fetching balances for ${address}`)

    // TODO: Implement Aptos balance fetching
    // Will be implemented with Aptos REST API
    
    const tokens = []

    return NextResponse.json({
      tokens,
      chain: "Aptos",
      address,
    })
  } catch (error) {
    console.error("[Aptos API] Error:", error)
    return NextResponse.json({ tokens: [] }, { status: 200 })
  }
}
