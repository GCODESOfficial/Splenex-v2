import { type NextRequest, NextResponse } from "next/server"

// In-memory cache for blazing fast repeat requests
const priceCache = new Map<string, { price: number; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// Stablecoins always $1.00 (instant, no API call!)
const STABLECOINS = ["USDC", "USDT", "DAI", "BUSD", "USDD", "TUSD", "USDP", "GUSD", "LUSD", "FRAX"];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get("symbols")

    if (!symbols) {
      return NextResponse.json({ error: "Missing symbols parameter" }, { status: 400 })
    }

    const coinIdMap: { [symbol: string]: string } = {
      ETH: "ethereum",
      BNB: "binancecoin",
      USDT: "tether",
      USDC: "usd-coin",
      DAI: "dai",
      WBTC: "wrapped-bitcoin",
      BTCB: "bitcoin-bep2",
      WETH: "weth",
      UNI: "uniswap",
      AAVE: "aave",
      LINK: "chainlink",
      MATIC: "matic-network",
      AVAX: "avalanche-2",
      FTM: "fantom",
      ARB: "arbitrum",
      OP: "optimism",
      SOL: "solana",
      CAKE: "pancakeswap-token",
      SUSHI: "sushi",
      CRV: "curve-dao-token",
      PEPE: "pepe",
      SHIB: "shiba-inu",
      DOGE: "dogecoin",
    }

    const symbolArray = symbols.split(",")
    const prices: { [symbol: string]: number } = {}
    const uncachedSymbols: string[] = []
    const uncachedCoinIds: string[] = []
    const now = Date.now()

    // Check cache and stablecoins first (instant!)
    for (const symbol of symbolArray) {
      const upperSymbol = symbol.toUpperCase()
      
      // Stablecoins are always $1.00 (instant!)
      if (STABLECOINS.includes(upperSymbol)) {
        prices[upperSymbol] = 1.0
        continue
      }
      
      // Check cache
      const cacheKey = upperSymbol
      const cached = priceCache.get(cacheKey)
      
      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log(`[Prices API] ⚡ Cache hit for ${upperSymbol}`)
        prices[upperSymbol] = cached.price
      } else {
        uncachedSymbols.push(upperSymbol)
        const coinId = coinIdMap[upperSymbol] || symbol.toLowerCase()
        uncachedCoinIds.push(coinId)
      }
    }

    // Fetch uncached prices in one batch call (faster!)
    if (uncachedCoinIds.length > 0) {
      const coinIds = uncachedCoinIds.join(",")
      console.log(`[Prices API] 🚀 Fetching ${uncachedSymbols.length} prices from CoinGecko...`)

      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=usd`,
        {
          next: { revalidate: 30 }, // Next.js cache for 30s
        }
      )

      if (!response.ok) {
        console.log(`[Prices API] ⚠️ CoinGecko API failed with status: ${response.status}`)
        // Return cached prices even if API fails
        return NextResponse.json(prices, { status: 200 })
      }

      const data = await response.json()
      
      // Map results back to symbols and cache them
      uncachedSymbols.forEach((symbol, index) => {
        const coinId = uncachedCoinIds[index]
        if (data[coinId]) {
          const price = data[coinId].usd
          prices[symbol] = price
          
          // Cache it for 30s
          priceCache.set(symbol, { price, timestamp: now })
          console.log(`[Prices API] ✅ ${symbol}: $${price}`)
        }
      })
    }

    console.log(`[Prices API] ✅ Returning ${Object.keys(prices).length} prices (${uncachedSymbols.length} fetched, ${symbolArray.length - uncachedSymbols.length} cached)`)

    return NextResponse.json(prices)
  } catch (error) {
    console.error("[Prices API] ❌ Error:", error)
    return NextResponse.json({}, { status: 200 })
  }
}
