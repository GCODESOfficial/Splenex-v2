import { type NextRequest, NextResponse } from "next/server"

/**
 * Sui Balance API
 * Fetches token balances from Sui blockchain
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Missing address parameter" }, { status: 400 })
    }

    console.log(`[Sui API] Fetching balances for ${address}`)

    // TODO: Implement Sui balance fetching
    // Will be implemented with Sui RPC API
    
    const tokens = []

    return NextResponse.json({
      tokens,
      chain: "Sui",
      address,
    })
  } catch (error) {
    console.error("[Sui API] Error:", error)
    return NextResponse.json({ tokens: [] }, { status: 200 })
  }
}

