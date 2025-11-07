import { type NextRequest, NextResponse } from "next/server"
import { ComprehensiveTokenDetector } from "@/lib/comprehensive-token-detector"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")
    const chain = searchParams.get("chain")

    console.log(`[ComprehensiveAPI] Comprehensive token detection for ${chain}, address: ${address}`)

    if (!address || !chain) {
      return NextResponse.json({ error: "Missing address or chain parameter" }, { status: 400 })
    }

    try {
      const detector = new ComprehensiveTokenDetector()
      const result = await detector.detectAllTokens(address, chain)

      console.log(`[ComprehensiveAPI] ✅ Detection complete: ${result.tokens.length} tokens, $${result.totalUsdValue.toFixed(2)} total value`)
      
      return NextResponse.json({
        success: true,
        tokens: result.tokens,
        totalUsdValue: result.totalUsdValue,
        detectionMethods: result.detectionMethods,
        errors: result.errors,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error("[ComprehensiveAPI] Detection failed:", error)
      return NextResponse.json({ 
        success: false,
        error: "Token detection failed",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }
  } catch (error) {
    console.error("[ComprehensiveAPI] API route error:", error)
    return NextResponse.json({ 
      success: false,
      error: "API route error",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}