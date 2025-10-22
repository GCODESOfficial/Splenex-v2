import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const chain = searchParams.get("chain")

    console.log(`[v0] API request for ${chain} chain, address: ${address}`)

    if (!address || !chain) {
      return NextResponse.json({ error: "Missing address or chain parameter" }, { status: 400 })
    }

    const moralisApiKey = process.env.MORALIS_API_KEY

    if (!moralisApiKey) {
      console.log("[v0] Moralis API key not configured, returning empty result")
      return NextResponse.json({ result: [] }, { status: 200 })
    }

    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}/erc20?chain=${chain}&exclude_spam=true`,
        {
          headers: {
            "X-API-Key": moralisApiKey,
          },
        },
      )

      if (!response.ok) {
        console.log(`[v0] Moralis API failed with status: ${response.status}`)
        return NextResponse.json({ result: [] }, { status: 200 })
      }

      const data = await response.json()
      console.log(`[v0] Moralis API success for ${chain}:`, data)
      return NextResponse.json(data)
    } catch (moralisError) {
      console.log("[v0] Moralis API error:", moralisError)
      return NextResponse.json({ result: [] }, { status: 200 })
    }
  } catch (error) {
    console.error("[v0] API route error:", error)
    return NextResponse.json({ result: [] }, { status: 200 })
  }
}
