/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * LiFi Router with PancakeSwap V2 Fallback
 * Following implementation from CDSLabsxyz/LIFI-TEST repository
 * - Primary: LiFi Router (routes through all aggregators automatically)
 * - Fallback: PancakeSwap V2 (for same-chain swaps when LiFi fails)
 */

import { getCachedQuote, setCachedQuote } from "./quote-cache";
import { getTokenDecimals } from "./token-decimals";
import { getPancakeSwapV2Quote, PANCAKESWAP_V2_ROUTER, type PancakeSwapV2Quote } from "./pancakeswapv2";

// Check if PancakeSwap V2 is supported for a chain
function isPancakeSwapV2Supported(chainId: number): boolean {
  return chainId in PANCAKESWAP_V2_ROUTER;
}

const LIFI_API_KEY = process.env.LIFI_API_KEY;
const LIFI_API_BASE = "https://li.quest/v1";

export interface LiFiRouterQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
}

export interface LiFiRouterQuote {
  provider: "lifi" | "pancakeswap-v2";
  toAmount: string;
  toAmountMin: string;
  estimatedGas: string;
  transactionRequest: any;
  route?: any;
  estimate?: any;
  fromAmount?: string;
  tokenInDecimals?: number;
  tokenOutDecimals?: number;
  fromTokenAddress?: string;
  toTokenAddress?: string;
}

/**
 * Resolve token decimals for quote enrichment
 */
async function resolveQuoteDecimals(
  fromToken: string,
  toToken: string,
  fromChain: number,
  toChain: number
) {
  const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
    getTokenDecimals(fromToken, fromChain),
    getTokenDecimals(toToken, toChain),
  ]);

  return { tokenInDecimals, tokenOutDecimals };
}

/**
 * Enrich quote with decimals and token addresses
 */
async function enrichQuote(
  quote: LiFiRouterQuote | null,
  request: LiFiRouterQuoteRequest
): Promise<LiFiRouterQuote | null> {
  if (!quote) return quote;

  const decimals = await resolveQuoteDecimals(
    request.fromToken,
    request.toToken,
    request.fromChain,
    request.toChain
  );

  quote.fromAmount = quote.fromAmount ?? request.fromAmount;
  quote.tokenInDecimals = quote.tokenInDecimals ?? decimals.tokenInDecimals;
  quote.tokenOutDecimals = quote.tokenOutDecimals ?? decimals.tokenOutDecimals;
  quote.fromTokenAddress = quote.fromTokenAddress ?? request.fromToken;
  quote.toTokenAddress = quote.toTokenAddress ?? request.toToken;

  return quote;
}

/**
 * Get quote from LiFi Router
 * LiFi automatically routes through best aggregators while collecting fees
 */
async function getLiFiRouterQuote(
  request: LiFiRouterQuoteRequest
): Promise<LiFiRouterQuote | null> {
  try {
    if (!LIFI_API_KEY) {
      return null;
    }

    // Normalize native token addresses for LiFi
    const normalizeTokenAddress = (address: string): string => {
      // LiFi uses 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee for native tokens
      if (address === "0x0000000000000000000000000000000000000000") {
        return "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
      }
      return address;
    };

    const normalizedFromToken = normalizeTokenAddress(request.fromToken);
    const normalizedToToken = normalizeTokenAddress(request.toToken);

    // Normalize amount to BigNumberish format (integer string)
    let normalizedFromAmount = request.fromAmount.trim();

    // Remove any scientific notation or decimal points
    if (normalizedFromAmount.includes("e") || normalizedFromAmount.includes("E")) {
      const numAmount = Number.parseFloat(normalizedFromAmount);
      if (!isNaN(numAmount)) {
        normalizedFromAmount = BigInt(Math.floor(numAmount)).toString();
      }
    } else if (normalizedFromAmount.includes(".")) {
      normalizedFromAmount = normalizedFromAmount.split(".")[0];
    }

    // Validate it's a valid integer string (BigNumberish format)
    if (!/^[0-9]+$/.test(normalizedFromAmount) || normalizedFromAmount === "0") {
      console.error(`[LiFi Router] Invalid amount format: ${request.fromAmount}`);
      return null;
    }

    const slippageDecimal = request.slippage
      ? (request.slippage / 100).toString()
      : "0.005";

    // Build LiFi Router request
    // LiFi automatically routes through best aggregators while collecting fees
    // No need to specify allowExchanges/preferExchanges - causes validation errors
    const params = new URLSearchParams({
      fromChain: request.fromChain.toString(),
      toChain: request.toChain.toString(),
      fromToken: normalizedFromToken,
      toToken: normalizedToToken,
      fromAmount: normalizedFromAmount,
      fromAddress: request.fromAddress,
      ...(request.toAddress && { toAddress: request.toAddress }),
      slippage: slippageDecimal,
      integrator: "SPLENEX",
      fee: "0.005", // 0.5% fee - collected on all swaps through LiFi
      allowSwitchChain: "true",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const response = await fetch(`${LIFI_API_BASE}/quote?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg =
        errorData.message ||
        errorData.error ||
        errorData.errors?.[0]?.message ||
        `Status ${response.status}`;

      return null;
    }

    const data = await response.json();
      `[LiFi Router] 💰 Fee collection enabled (0.5%) - routing through: ${data.tool || "best aggregator"}`

    return {
      provider: "lifi",
      toAmount: data.estimate.toAmount,
      toAmountMin: data.estimate.toAmountMin,
      estimatedGas: data.estimate.gasCosts?.[0]?.estimate || "0",
      transactionRequest: data.transactionRequest,
      route: data,
      estimate: data.estimate,
    };
  } catch (error) {
      "[LiFi Router] Error:",
      error instanceof Error ? error.message : "Unknown"
    return null;
  }
}

/**
 * Convert PancakeSwap V2 quote to unified format
 */
async function convertPancakeSwapQuoteToLiFiFormat(
  pancakeQuote: PancakeSwapV2Quote,
  request: LiFiRouterQuoteRequest
): Promise<LiFiRouterQuote> {
  // Calculate minimum output with default slippage
  const slippage = request.slippage || 0.5;
  
  // Use safeStringToBigInt helper
  const { safeStringToBigInt, getPancakeSwapV2SwapData } = await import("./pancakeswapv2");
  const outputAmount = safeStringToBigInt(pancakeQuote.amountOut || "0");
  
  const slippageMultiplier = BigInt(Math.floor((100 - slippage) * 100));
  const toAmountMin = (outputAmount * slippageMultiplier / BigInt(10000)).toString();
  
  // Get swap transaction data for the transaction request
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
  const toAddress = request.toAddress || request.fromAddress || "0x0000000000000000000000000000000000000000";
  
  const swapData = getPancakeSwapV2SwapData(
    pancakeQuote,
    request.fromAmount,
    toAmountMin,
    toAddress as `0x${string}`,
    deadline,
    true // Use fee-on-transfer functions
  );
  
  return {
    provider: "pancakeswap-v2",
    toAmount: pancakeQuote.amountOut,
    toAmountMin: toAmountMin,
    estimatedGas: "300000", // Default gas estimate
    transactionRequest: {
      to: swapData.to,
      data: swapData.data,
      value: swapData.value.toString(),
      from: request.fromAddress || toAddress,
      gasLimit: "300000",
    },
    route: {
      provider: "pancakeswap-v2",
      path: pancakeQuote.path,
      routerAddress: pancakeQuote.routerAddress,
      priceImpact: pancakeQuote.priceImpact,
    },
    fromAmount: request.fromAmount,
    fromTokenAddress: pancakeQuote.tokenIn || request.fromToken,
    toTokenAddress: pancakeQuote.tokenOut || request.toToken,
  };
}

/**
 * Main function: Get quote from LiFi Router with PancakeSwap V2 fallback
 * Following pattern from CDSLabsxyz/LIFI-TEST repository:
 * - Primary: LiFi Router (routes through all aggregators automatically)
 * - Fallback: PancakeSwap V2 (for same-chain swaps when LiFi fails)
 */
export async function getLiFiRouterQuoteEnriched(
  request: LiFiRouterQuoteRequest
): Promise<{ success: boolean; data?: LiFiRouterQuote; error?: string }> {
    `[LiFi Router] From: ${request.fromToken} (chain ${request.fromChain})`
    `[LiFi Router] To: ${request.toToken} (chain ${request.toChain})`

  const isSameChain = request.fromChain === request.toChain;

  // Check cache first
  const cachedQuote = getCachedQuote(request);
  if (cachedQuote) {
    const enriched = await enrichQuote(cachedQuote, request);
    return {
      success: true,
      data: enriched || undefined,
    };
  }

  // Step 1: Try LiFi Router first (primary)
  const lifiQuote = await getLiFiRouterQuote(request);

  if (lifiQuote) {
    const enrichedQuote = await enrichQuote(lifiQuote, request);
    if (enrichedQuote) {
      setCachedQuote(request, enrichedQuote);
    }
    return {
      success: true,
      data: enrichedQuote || undefined,
    };
  }

  // Step 2: Fallback to PancakeSwap V2 (only for same-chain swaps)
  if (isSameChain && isPancakeSwapV2Supported(request.fromChain)) {
    
    try {
        tokenIn: request.fromToken,
        tokenOut: request.toToken,
        amountIn: request.fromAmount,
        chainId: request.fromChain
      
      const pancakeQuote = await getPancakeSwapV2Quote(
        request.fromToken as `0x${string}`,
        request.toToken as `0x${string}`,
        request.fromAmount,
        request.fromChain
      );

      if (pancakeQuote) {
          amountOut: pancakeQuote.amountOut,
          path: pancakeQuote.path,
          provider: "pancakeswap-v2"
        
        const convertedQuote = await convertPancakeSwapQuoteToLiFiFormat(pancakeQuote, request);
        const enrichedQuote = await enrichQuote(convertedQuote, request);
        
        if (enrichedQuote) {
          setCachedQuote(request, enrichedQuote);
        }
        
        return {
          success: true,
          data: enrichedQuote || undefined,
        };
      } else {
      }
    } catch (error) {
      console.error(
        "[LiFi Router] ❌ PancakeSwap V2 fallback error:",
        error instanceof Error ? error.message : "Unknown",
        error instanceof Error ? error.stack : ""
      );
      // Don't throw - allow error to be logged and fall through to return failure
    }
  } else if (isSameChain) {
      `[LiFi Router] PancakeSwap V2 not supported on chain ${request.fromChain}`
  } else {
      "[LiFi Router] Cross-chain swap - PancakeSwap V2 fallback not applicable"
  }

  // Both failed
  return {
    success: false,
    error:
      "No route available. LiFi Router and PancakeSwap V2 fallback both failed. Try adjusting the amount, slippage, or token selection.",
  };
}

