import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { pair, type, orderType, amount, limitPrice } = await request.json()

    // Validate input
    if (!pair || !type || !orderType || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Simulate order execution with realistic slippage
    const basePrice = getForexPrice(pair)
    const slippage = Math.random() * 0.0005 // 0-0.5 pip slippage
    const executionPrice =
      orderType === "market" ? basePrice + (type === "long" ? slippage : -slippage) : limitPrice || basePrice

    // Calculate fees (typical forex spread)
    const spread = 0.0002 // 2 pips
    const fee = amount * spread

    // Simulate execution delay
    await new Promise((resolve) => setTimeout(resolve, 100 + Math.random() * 200))

    return NextResponse.json({
      success: true,
      orderId: `forex_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      executionPrice,
      fee,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Forex order error:", error)
    return NextResponse.json({ error: "Order execution failed" }, { status: 500 })
  }
}

function getForexPrice(pair: string): number {
  const prices: Record<string, number> = {
    "EUR/USD": 1.085,
    "GBP/USD": 1.265,
    "USD/JPY": 149.5,
    "AUD/USD": 0.658,
    "USD/CAD": 1.372,
    "USD/CHF": 0.895,
    "NZD/USD": 0.612,
    "EUR/GBP": 0.858,
    "EUR/JPY": 162.25,
    "GBP/JPY": 189.15,
  }

  const basePrice = prices[pair] || 1.0
  // Add small random variation to simulate live prices
  return basePrice + (Math.random() - 0.5) * 0.01
}
