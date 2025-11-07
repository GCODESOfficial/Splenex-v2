import { type NextRequest, NextResponse } from "next/server"
import { moralisService } from "@/lib/moralis-service"

/**
 * Test endpoint for Moralis balance fetching
 * Usage: GET /api/test-moralis?address=0x...&chain=eth
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address") || "0xb827487001633584f38a076fb758deecdfdcfafe"
    const chain = searchParams.get("chain") || "eth"

    console.log("\n" + "=".repeat(80))
    console.log("🧪 Testing Moralis Balance Fetching")
    console.log("=".repeat(80))
    console.log(`📍 Wallet: ${address}`)
    console.log(`🔗 Chain: ${chain}`)
    console.log("=".repeat(80))

    // Check API key
    const moralisApiKey = process.env.MORALIS_API_KEY
    if (!moralisApiKey) {
      console.error("[Test] ❌ MORALIS_API_KEY not configured")
      return NextResponse.json({ 
        error: "MORALIS_API_KEY not configured",
        address,
        chain
      }, { status: 500 })
    }

    console.log(`[Test] ✅ Moralis API key configured`)

    try {
      const startTime = Date.now()
      const tokens = await moralisService.getTokenBalances(address, chain)
      const duration = Date.now() - startTime

      console.log(`\n[Test] ⏱️  Fetch completed in ${duration}ms`)
      console.log(`[Test] 📊 Found ${tokens.length} tokens\n`)

      // Detailed token information
      if (tokens.length > 0) {
        console.log("[Test] 📋 Token Details:")
        console.log("-".repeat(80))
        tokens.forEach((token, index) => {
          console.log(`${index + 1}. ${token.symbol.padEnd(15)} ${token.name}`)
          console.log(`   Balance: ${parseFloat(token.balance).toFixed(6)}`)
          console.log(`   Address: ${token.address}`)
          console.log(`   Decimals: ${token.decimals}`)
          console.log(`   Chain: ${token.chain}`)
          console.log(`   Logo: ${token.logoUrl || 'N/A'}`)
          console.log()
        })
        console.log("-".repeat(80))
      } else {
        console.log("[Test] ⚠️  No tokens found")
      }

      const response = {
        success: true,
        wallet: address,
        chain: chain,
        tokenCount: tokens.length,
        tokens: tokens,
        rawTokens: tokens.map(token => ({
          symbol: token.symbol,
          name: token.name,
          balance: token.balance,
          address: token.address,
          decimals: token.decimals,
          chain: token.chain,
          chainId: token.chainId,
          logoUrl: token.logoUrl,
          usdValue: token.usdValue,
          price: token.price
        })),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }

      console.log(`[Test] ✅ Test completed successfully\n`)
      return NextResponse.json(response, { status: 200 })

    } catch (moralisError) {
      const errorMessage = moralisError instanceof Error ? moralisError.message : String(moralisError)
      console.error(`[Test] ❌ Moralis error:`, errorMessage)
      console.error(`[Test] Error details:`, moralisError)
      
      return NextResponse.json({ 
        success: false,
        error: "Moralis API error",
        message: errorMessage,
        wallet: address,
        chain: chain,
        timestamp: new Date().toISOString()
      }, { status: 500 })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("[Test] ❌ API route error:", errorMessage)
    
    return NextResponse.json({ 
      success: false,
      error: "API route error",
      message: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

