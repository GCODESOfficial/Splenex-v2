/* eslint-disable @typescript-eslint/no-unused-vars */
import { type NextRequest, NextResponse } from "next/server"

const FOREX_PAIRS = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", basePrice: 1.085 },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", basePrice: 1.265 },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", basePrice: 149.5 },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", basePrice: 0.658 },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", basePrice: 1.372 },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", basePrice: 0.895 },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", basePrice: 0.612 },
  { symbol: "EUR/GBP", name: "Euro / British Pound", basePrice: 0.858 },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", basePrice: 162.25 },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", basePrice: 189.15 },
]

export async function GET(request: NextRequest) {
  try {
    // Simulate real-time forex data with price variations
    const forexData = FOREX_PAIRS.map((pair) => {
      const variation = (Math.random() - 0.5) * 0.02 // ±1% variation
      const price = pair.basePrice * (1 + variation)
      const change = (Math.random() - 0.5) * 0.01
      const changePercent = (change / pair.basePrice) * 100

      return {
        symbol: pair.symbol,
        name: pair.name,
        price: Number.parseFloat(price.toFixed(4)),
        change: Number.parseFloat(change.toFixed(4)),
        changePercent: Number.parseFloat(changePercent.toFixed(2)),
        timestamp: Date.now(),
      }
    })

    return NextResponse.json({
      success: true,
      data: forexData,
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error("Forex data error:", error)
    return NextResponse.json({ error: "Failed to fetch forex data" }, { status: 500 })
  }
}
