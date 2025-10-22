/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

interface LiFiQuoteRequest {
  fromChain: number
  toChain: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  toAddress?: string
  slippage?: number
  order?: "FASTEST" | "CHEAPEST"
  allowBridges?: string[]
  denyBridges?: string[]
  preferBridges?: string[]
  allowExchanges?: string[]
  denyExchanges?: string[]
  preferExchanges?: string[]
}

const LIFI_API_BASE = "https://li.quest/v1"
const LIFI_API_KEY = process.env.LIFI_API_KEY // Server-side only environment variable

export async function getLiFiQuote(request: LiFiQuoteRequest) {
  try {
    console.log("[v0] Server: LiFi quote request:", request)

    if (!LIFI_API_KEY) {
      throw new Error("LiFi API key not configured on server")
    }

    const fromAmountNum = Number.parseFloat(request.fromAmount)
    if (fromAmountNum <= 0) {
      throw new Error("Invalid amount: must be greater than 0")
    }

    // Log for debugging
    console.log("[v0] Server: Slippage before conversion:", request.slippage);
    const slippageDecimal = request.slippage ? (request.slippage / 100).toString() : "0.005";
    console.log("[v0] Server: Slippage sent to LiFi:", slippageDecimal);

    // Build params - ENABLE ALL EXCHANGES AND BRIDGES for maximum routing options!
    const params = new URLSearchParams({
      fromChain: request.fromChain.toString(),
      toChain: request.toChain.toString(),
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      ...(request.toAddress && { toAddress: request.toAddress }),
      slippage: slippageDecimal,
      ...(request.order && { order: request.order }),
      // Don't restrict bridges/exchanges unless explicitly requested
      ...(request.allowBridges && { allowBridges: request.allowBridges.join(",") }),
      ...(request.denyBridges && { denyBridges: request.denyBridges.join(",") }),
      ...(request.preferBridges && { preferBridges: request.preferBridges.join(",") }),
      ...(request.allowExchanges && { allowExchanges: request.allowExchanges.join(",") }),
      ...(request.denyExchanges && { denyExchanges: request.denyExchanges.join(",") }),
      ...(request.preferExchanges && { preferExchanges: request.preferExchanges.join(",") }),
      // IMPORTANT: Enable all route types for maximum compatibility
      integrator: "splenex-dex",
      allowSwitchChain: "true",
      maxPriceImpact: "0.5", // Allow up to 50% price impact for illiquid pairs
    })
    
    console.log("[v0] Server: ⚡ Using ALL available AMMs and bridges for routing")
    
    console.log("[v0] Server: Full LiFi API URL:", `${LIFI_API_BASE}/quote?${params.toString()}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // Faster timeout: 8s

    const response = await fetch(`${LIFI_API_BASE}/quote?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 400) {
        throw new Error("Invalid request parameters - check token addresses and amounts")
      } else if (response.status === 404) {
        throw new Error("No routes available for this swap - try a different amount or token pair")
      } else {
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
    }

    const quoteData = await response.json()
    console.log("[v0] Server: LiFi quote received successfully")
    console.log("[v0] Server: Quote estimate toAmountMin:", quoteData.estimate?.toAmountMin)
    console.log("[v0] Server: Quote tool:", quoteData.tool)
    console.log("[v0] Server: Quote type:", quoteData.type)
    return { success: true, data: quoteData }
  } catch (err) {
    let errorMessage = "Failed to get quote"

    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = "Request timeout - please try again"
      } else {
        errorMessage = err.message
      }
    }

    console.error("[v0] Server: LiFi quote error:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function getLiFiSupportedChains() {
  try {
    if (!LIFI_API_KEY) {
      throw new Error("LiFi API key not configured on server")
    }

    const response = await fetch(`${LIFI_API_BASE}/chains`, {
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const chains = await response.json()
    console.log("[v0] Server: LiFi supported chains fetched")
    return { success: true, data: chains }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Failed to fetch supported chains"
    console.error("[v0] Server: LiFi chains error:", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function getLiFiSupportedTokens(chainId: number) {
  try {
    if (!LIFI_API_KEY) {
      throw new Error("LiFi API key not configured on server")
    }

    const response = await fetch(`${LIFI_API_BASE}/tokens?chains=${chainId}`, {
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const tokens = data.tokens?.[chainId] || []
    const validTokens = tokens.filter(
      (token: any) => token.address && token.symbol && token.name && typeof token.decimals === "number",
    )

    console.log(`[v0] Server: LiFi tokens for chain ${chainId} fetched`)
    return { success: true, data: validTokens }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Failed to fetch supported tokens for chain ${chainId}`
    console.error(`[v0] Server: LiFi tokens error:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}
