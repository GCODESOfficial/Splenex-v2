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

    if (!LIFI_API_KEY) {
      console.error("[v0] Server: LiFi API key not configured on server");
      console.error("[v0] Server: Please set LIFI_API_KEY environment variable");
      throw new Error("Swap aggregator API key not configured on server")
    }

    // Enhanced parameter validation and debugging

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

    // ✅ CRITICAL FIX: Ensure fromAmount is a valid BigNumberish (integer string)
    // LiFi requires fromAmount to pass "isBigNumberish" validation - must be a proper integer string
    let normalizedFromAmount = request.fromAmount.trim();
    
    // Remove any scientific notation or decimal points
    if (normalizedFromAmount.includes('e') || normalizedFromAmount.includes('E')) {
      // Convert scientific notation to integer
      const numAmount = Number.parseFloat(normalizedFromAmount);
      if (!isNaN(numAmount)) {
        normalizedFromAmount = BigInt(Math.floor(numAmount)).toString();
      }
    } else if (normalizedFromAmount.includes('.')) {
      // Remove decimal point and convert to integer
      normalizedFromAmount = normalizedFromAmount.split('.')[0];
    }
    
    // Validate it's a valid integer string (BigNumberish format)
    const isBigNumberish = /^[0-9]+$/.test(normalizedFromAmount);
    if (!isBigNumberish || normalizedFromAmount === '0') {
      console.error(`[v0] Server: Invalid amount format: ${request.fromAmount} (normalized: ${normalizedFromAmount})`);
      throw new Error(`Invalid amount format - must be a valid integer string (BigNumberish). Got: ${request.fromAmount}`)
    }
    
    // Validate amount is greater than 0
    if (BigInt(normalizedFromAmount) <= 0n) {
      console.error(`[v0] Server: Invalid amount: ${normalizedFromAmount} must be greater than 0`);
      throw new Error("Invalid amount: must be greater than 0")
    }

    // Validate token addresses (should be valid Ethereum addresses or native token placeholder)
    const isValidAddress = (addr: string) => {
      // Allow native token placeholders
      if (addr === "0x0000000000000000000000000000000000000000" || 
          addr === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
        return true;
      }
      return /^0x[a-fA-F0-9]{40}$/.test(addr);
    };
    
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
    const slippageDecimal = request.slippage ? (request.slippage / 100).toString() : "0.005";

    // ✅ Normalize native token addresses for LiFi (LiFi uses 0xeeee... for native tokens)
    const normalizeTokenAddress = (address: string): string => {
      if (address === "0x0000000000000000000000000000000000000000") {
        return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      }
      return address;
    };

    const normalizedFromToken = normalizeTokenAddress(request.fromToken);
    const normalizedToToken = normalizeTokenAddress(request.toToken);

    // ✅ CONFIGURE LIFI AS ROUTER
    // Removed allowExchanges/preferExchanges to avoid validation errors
    // LiFi will automatically route through best aggregators while still collecting fees

    // Build params - LiFi as ROUTER (automatically routes through best aggregators)
    // ✅ COMPLETELY REMOVED allowExchanges/preferExchanges to avoid validation errors
    // LiFi will automatically route through best aggregators while still collecting fees
    // Only include bridge/exchange parameters if explicitly requested and valid
    let params = new URLSearchParams({
      fromChain: request.fromChain.toString(),
      toChain: request.toChain.toString(),
      fromToken: normalizedFromToken,
      toToken: normalizedToToken,
      fromAmount: normalizedFromAmount, // Use normalized amount (BigNumberish format)
      fromAddress: request.fromAddress,
      ...(request.toAddress && { toAddress: request.toAddress }),
      slippage: slippageDecimal,
      ...(request.order && { order: request.order }),
      // ✅ DO NOT include allowExchanges or preferExchanges - causes validation errors
      // Only include bridge parameters if explicitly requested
      ...(request.allowBridges && Array.isArray(request.allowBridges) && request.allowBridges.length > 0 && { 
        allowBridges: request.allowBridges.join(",") 
      }),
      ...(request.denyBridges && Array.isArray(request.denyBridges) && request.denyBridges.length > 0 && { 
        denyBridges: request.denyBridges.join(",") 
      }),
      ...(request.preferBridges && Array.isArray(request.preferBridges) && request.preferBridges.length > 0 && { 
        preferBridges: request.preferBridges.join(",") 
      }),
      integrator: "SPLENEX",
      fee: "0.005", // 0.5% fee collection for Splenex - collected on all swaps through LiFi
      allowSwitchChain: "true",
    })

    // ✅ SAFEGUARD: Remove allowExchanges/preferExchanges if somehow added (prevents validation errors)
    params.delete("allowExchanges");
    params.delete("preferExchanges");
    
    const finalParamsStr = params.toString();

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // Faster timeout: 8s

    const response = await fetch(`${LIFI_API_BASE}/quote?${params.toString()}`, {
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
      console.error(`[v0] Server: LiFi API error (${response.status}):`, errorData);
      console.error(`[v0] Server: Request URL was: ${LIFI_API_BASE}/quote?${params.toString()}`);
      
      if (response.status === 400) {
        const errorMsg = errorData.message || errorData.error || errorData.errors?.[0]?.message || JSON.stringify(errorData.errors || errorData) || "Invalid request parameters";
        const errorDetails = JSON.stringify(errorData, null, 2);
        console.error(`[v0] Server: LiFi 400 error details:`, errorDetails);
        
        // Check for validation errors (allowExchanges, etc.)
        if (errorMsg.includes("allowExchanges") || errorMsg.includes("preferExchanges") || errorMsg.includes("must be equal") || errorMsg.includes("must match")) {
          // Return false but don't throw - let fallback aggregators handle it
          return { success: false, error: undefined };
        }
        
        // Check for specific error types
        if (errorMsg.includes("/maxPriceImpact")) {
          return { success: false, error: undefined };
        } else if (errorMsg.includes("deny list") || errorMsg.includes("invalid") || errorMsg.includes("not supported")) {
          return { success: false }
        } else if (errorMsg.includes("BigNumberish") || errorMsg.includes("fromAmount")) {
          throw new Error(`Invalid amount format: ${errorMsg}. The amount must be a valid integer string in wei format.`)
        } else {
          // Don't throw for 400 errors - return failure instead to allow fallback
          return { success: false, error: errorMsg };
        }
      } else if (response.status === 404) {
        // Don't throw - return failure to allow fallback (don't show error yet - fallback will try)
        return { success: false, error: null }; // Don't show error message - let fallback try first
      } else if (response.status === 500) {
        // LiFi server error - don't throw, return failure for fallback (don't show error yet)
        console.error("[v0] Server: LiFi API returned 500 - this is a LiFi server issue, fallback will be tried");
        return { success: false, error: null }; // Don't show error message - let fallback try first
      } else {
        // For other errors, return failure instead of throwing
        console.error(`[v0] Server: LiFi API error ${response.status} - returning failure for fallback`);
        return { success: false, error: errorData.message || errorData.error || `HTTP error! status: ${response.status}` };
      }
    }

    const quoteData = await response.json()
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

    // ✅ Don't throw - return failure to allow fallback aggregators
    console.error("[v0] Server: LiFi quote error (will try fallback):", errorMessage)
    return { success: false, error: errorMessage }
  }
}

export async function getLiFiSupportedChains() {
  try {
    if (!LIFI_API_KEY) {
      throw new Error("Swap aggregator API key not configured on server")
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
      throw new Error("Swap aggregator API key not configured on server")
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

    return { success: true, data: validTokens }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : `Failed to fetch supported tokens for chain ${chainId}`
    console.error(`[v0] Server: LiFi tokens error:`, errorMessage)
    return { success: false, error: errorMessage }
  }
}
