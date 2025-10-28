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
      console.error("[v0] Server: LiFi API key not configured on server");
      console.error("[v0] Server: Please set LIFI_API_KEY environment variable");
      throw new Error("LiFi API key not configured on server")
    }
    
    console.log(`[v0] Server: LiFi API key configured (length: ${LIFI_API_KEY.length})`);

    // Enhanced parameter validation and debugging
    console.log("[v0] Server: Parameter validation:");
    console.log(`[v0] Server: fromChain: ${request.fromChain} (type: ${typeof request.fromChain})`);
    console.log(`[v0] Server: toChain: ${request.toChain} (type: ${typeof request.toChain})`);
    console.log(`[v0] Server: fromToken: ${request.fromToken} (length: ${request.fromToken?.length})`);
    console.log(`[v0] Server: toToken: ${request.toToken} (length: ${request.toToken?.length})`);
    console.log(`[v0] Server: fromAmount: ${request.fromAmount} (type: ${typeof request.fromAmount})`);
    console.log(`[v0] Server: fromAddress: ${request.fromAddress} (length: ${request.fromAddress?.length})`);

    // Validate required parameters
    if (!request.fromChain || !request.toChain || !request.fromToken || !request.toToken || !request.fromAmount || !request.fromAddress) {
      console.error("[v0] Server: Missing required parameters:", {
        fromChain: !!request.fromChain,
        toChain: !!request.toChain,
        fromToken: !!request.fromToken,
        toToken: !!request.toToken,
        fromAmount: !!request.fromAmount,
        fromAddress: !!request.fromAddress
      });
      throw new Error("Missing required parameters: fromChain, toChain, fromToken, toToken, fromAmount, fromAddress")
    }

    const fromAmountNum = Number.parseFloat(request.fromAmount)
    if (isNaN(fromAmountNum) || fromAmountNum <= 0) {
      console.error(`[v0] Server: Invalid amount: ${request.fromAmount} (parsed: ${fromAmountNum})`);
      throw new Error("Invalid amount: must be a valid number greater than 0")
    }

    // Validate token addresses (should be valid Ethereum addresses)
    const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
    if (!isValidAddress(request.fromToken)) {
      console.error(`[v0] Server: Invalid fromToken address: ${request.fromToken}`);
      throw new Error(`Invalid fromToken address: ${request.fromToken}`)
    }
    if (!isValidAddress(request.toToken)) {
      console.error(`[v0] Server: Invalid toToken address: ${request.toToken}`);
      throw new Error(`Invalid toToken address: ${request.toToken}`)
    }
    if (!isValidAddress(request.fromAddress)) {
      console.error(`[v0] Server: Invalid fromAddress: ${request.fromAddress}`);
      throw new Error(`Invalid fromAddress: ${request.fromAddress}`)
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
      integrator: "SPLENEX",
      fee: "0.02", // 2% fee collection for Splenex
      allowSwitchChain: "true",
      maxPriceImpact: "0.5", // Allow up to 50% price impact for illiquid pairs
    })
    
    console.log("[v0] Server: Final LiFi API parameters:");
    console.log(`[v0] Server: fromChain: ${request.fromChain}`);
    console.log(`[v0] Server: toChain: ${request.toChain}`);
    console.log(`[v0] Server: fromToken: ${request.fromToken}`);
    console.log(`[v0] Server: toToken: ${request.toToken}`);
    console.log(`[v0] Server: fromAmount: ${request.fromAmount}`);
    console.log(`[v0] Server: fromAddress: ${request.fromAddress}`);
    console.log(`[v0] Server: toAddress: ${request.toAddress || 'not provided'}`);
    console.log(`[v0] Server: slippage: ${slippageDecimal}`);
    console.log(`[v0] Server: order: ${request.order || 'not provided'}`);
    console.log(`[v0] Server: integrator: SPLENEX`);
    console.log(`[v0] Server: fee: 2% (0.02) - monetization enabled`);
    
    console.log("[v0] Server: ⚡ Using ALL available AMMs and bridges for routing")
    
    console.log("[v0] Server: Full LiFi API URL:", `${LIFI_API_BASE}/quote?${params.toString()}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // Faster timeout: 8s

    console.log("[v0] Server: Making request to LiFi API...");
    const response = await fetch(`${LIFI_API_BASE}/quote?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
      signal: controller.signal,
    })
    
    console.log(`[v0] Server: LiFi API response status: ${response.status}`);

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`[v0] Server: LiFi API error (${response.status}):`, errorData);
      console.error(`[v0] Server: Request URL was: ${LIFI_API_BASE}/quote?${params.toString()}`);
      
      if (response.status === 400) {
        const errorMsg = errorData.message || errorData.error || "Invalid request parameters";
        console.error(`[v0] Server: LiFi 400 error details:`, errorData);
        throw new Error(`Invalid request parameters - check token addresses and amounts. LiFi error: ${errorMsg}`)
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
