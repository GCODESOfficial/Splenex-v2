/* eslint-disable @typescript-eslint/no-explicit-any */

import { getCachedQuote, setCachedQuote } from "./quote-cache";
import { getDEXScreenerToken } from "./dexscreener";
import { getDirectDexQuote } from "./direct-dex-quote";
import { getTokenDecimals } from "./token-decimals";
import { fetchUniswapV2AmountsOut } from "./uniswap-v2";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LIFI_NATIVE_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const PROOF_TOKEN_ADDRESS = "0x9b4a69de6ca0defdd02c0c4ce6cb84de5202944e";

const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const PROOF_LOG_PREFIX = "[PROOF Uniswap]";

const isNativeTokenAddress = (address: string): boolean => {
  return !address || address.toLowerCase() === ZERO_ADDRESS;
};

const normalizeTokenAddress = (address: string): string => {
  if (!address) return ZERO_ADDRESS;
  return address.toLowerCase();
};

const isProofTokenAddress = (address: string): boolean => {
  return normalizeTokenAddress(address) === PROOF_TOKEN_ADDRESS;
};

const isProofEthPair = (request: QuoteRequest): boolean => {
  const fromAddr = normalizeTokenAddress(request.fromToken);
  const toAddr = normalizeTokenAddress(request.toToken);

  const involvesProof = isProofTokenAddress(fromAddr) || isProofTokenAddress(toAddr);
  const involvesEth = isNativeTokenAddress(fromAddr) || isNativeTokenAddress(toAddr) || fromAddr === WETH_ADDRESS.toLowerCase() || toAddr === WETH_ADDRESS.toLowerCase();

  return involvesProof && involvesEth && request.fromChain === 1 && request.toChain === 1;
};

const normalizeForDirectDex = (address: string): string => {
  return isNativeTokenAddress(address) ? LIFI_NATIVE_TOKEN : address;
};

function parseDecimalToBigInt(value: string, scale = 18): bigint {
  if (!value) return 0n;
  const [intPart, fracPart = ""] = value.split(".");
  const frac = fracPart.slice(0, scale);
  const paddedFrac = frac.padEnd(scale, "0");
  const digits = `${intPart}${paddedFrac}`.replace(/^[-+]?0+(?=\d)/, (m) => (m.includes("-") ? "-" : "") + "");
  return BigInt(digits || "0");
}

async function fetchDexscreenerAmount(
  path: string[],
  fromAmountWei: bigint
): Promise<{
  amount: bigint;
  pairUrl?: string;
  tokenInDecimals: number;
  tokenOutDecimals: number;
} | null> {
  try {
    const pairs = await getDEXScreenerToken(PROOF_TOKEN_ADDRESS);
    if (!pairs.length) return null;

    const wethAddress = WETH_ADDRESS.toLowerCase();
    const proofAddress = PROOF_TOKEN_ADDRESS;
    const targetPair = pairs.find((pair: any) => {
      const base = pair.baseToken?.address?.toLowerCase();
      const quote = pair.quoteToken?.address?.toLowerCase();
      return (
        (base === proofAddress && quote === wethAddress) ||
        (base === wethAddress && quote === proofAddress)
      );
    });

    if (!targetPair || !targetPair.priceNative) {
      console.warn(`${PROOF_LOG_PREFIX} ⚠️ Dexscreener pair not found for PROOF/WETH`);
      return null;
    }

    const priceScale = 18n;
    const priceScaled = parseDecimalToBigInt(targetPair.priceNative, Number(priceScale));
    if (priceScaled <= 0n) {
      console.warn(`${PROOF_LOG_PREFIX} ⚠️ Dexscreener price invalid`);
      return null;
    }

    const pathLower = path.map((addr) => addr.toLowerCase());
    const isEthToProof = pathLower[0] === wethAddress && pathLower[pathLower.length - 1] === proofAddress;
    const isProofToEth = pathLower[0] === proofAddress && pathLower[pathLower.length - 1] === wethAddress;

    if (!isEthToProof && !isProofToEth) {
      return null;
    }

    const tokenInAddress = pathLower[0];
    const tokenOutAddress = pathLower[pathLower.length - 1];
    const tokenInDecimals = await getTokenDecimals(tokenInAddress);
    const tokenOutDecimals = await getTokenDecimals(tokenOutAddress);
    const tokenInScale = 10n ** BigInt(tokenInDecimals);
    const tokenOutScale = 10n ** BigInt(tokenOutDecimals);
    const priceScaleFactor = 10n ** priceScale;

    let amountOut: bigint;
    if (isEthToProof) {
      // Convert WETH (18 decimals) to PROOF with tokenOutDecimals
      const numerator = fromAmountWei * tokenOutScale * priceScaleFactor;
      const denominator = priceScaled * tokenInScale;
      amountOut = denominator === 0n ? 0n : numerator / denominator;
    } else {
      // PROOF → ETH
      const numerator = fromAmountWei * priceScaled * tokenOutScale;
      const denominator = tokenInScale * priceScaleFactor;
      amountOut = denominator === 0n ? 0n : numerator / denominator;
    }

    return {
      amount: amountOut,
      pairUrl: targetPair.url,
      tokenInDecimals,
      tokenOutDecimals,
    };
  } catch (error) {
    console.error(`${PROOF_LOG_PREFIX} ❌ Dexscreener fallback error`, error);
    return null;
  }
}

async function getProofUniswapRoute(request: QuoteRequest): Promise<UnifiedQuote | null> {
  if (!isProofEthPair(request)) {
    return null;
  }

  try {
    console.log(`${PROOF_LOG_PREFIX} 🚀 Routing via Uniswap for PROOF ↔ ETH pair`);

    const directRequest = {
      fromChain: request.fromChain,
      toChain: request.toChain,
      fromToken: normalizeForDirectDex(request.fromToken),
      toToken: normalizeForDirectDex(request.toToken),
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      slippage: request.slippage ?? 0.5,
    };

    const directResult = await getDirectDexQuote(directRequest as any);

    if (!directResult.success || !directResult.data) {
      console.warn(`${PROOF_LOG_PREFIX} ⚠️ Uniswap direct quote failed`, directResult.error);
      return null;
    }

    const quote = directResult.data;
    const baseTx: any = quote.transactionRequest || {};
    const txGasLimit = baseTx.gasLimit || "250000";

    const path = quote.path || [];
    let rawOutput: bigint | null = null;
    let fallbackSource: "uniswap" | "dexscreener" | "fallback" = "dexscreener";
    let dexscreenerPairUrl: string | undefined;

    let tokenInDecimals = await getTokenDecimals(path[0] ?? request.fromToken);
    let tokenOutDecimals = await getTokenDecimals(path[path.length - 1] ?? request.toToken);

    const uniswapAmounts = await fetchUniswapV2AmountsOut(request.fromAmount, path, PROOF_LOG_PREFIX);
    if (uniswapAmounts && uniswapAmounts.length) {
      rawOutput = uniswapAmounts[uniswapAmounts.length - 1];
      fallbackSource = "uniswap";
      console.log(
        `${PROOF_LOG_PREFIX} 📈 On-chain amounts:`,
        uniswapAmounts.map((amount, idx) => ({
          index: idx,
          value: amount.toString(),
        }))
      );
      console.log(
        `${PROOF_LOG_PREFIX} 📊 Raw output (wei): ${rawOutput.toString()}`
      );
      console.log(`${PROOF_LOG_PREFIX} 💧 Using on-chain Uniswap getAmountsOut`);
    }

    const dexFallback = await fetchDexscreenerAmount(path, BigInt(request.fromAmount));
    if (dexFallback && dexFallback.amount > 0n) {
      if (!rawOutput) {
        rawOutput = dexFallback.amount;
        fallbackSource = "dexscreener";
        console.log(`${PROOF_LOG_PREFIX} 💹 Using Dexscreener output for PROOF quote`);
      }
      dexscreenerPairUrl = dexFallback.pairUrl;
      tokenInDecimals = dexFallback.tokenInDecimals;
      tokenOutDecimals = dexFallback.tokenOutDecimals;
    }

    if (!rawOutput) {
      rawOutput = BigInt(quote.toAmount || request.fromAmount);
      fallbackSource = "fallback";
      console.warn(`${PROOF_LOG_PREFIX} ⚠️ Dexscreener data unavailable, falling back to cached quote amount`);
    }

    const baseSlippagePercent = request.slippage ?? 0.5;
    const effectiveSlippagePercent =
      fallbackSource === "dexscreener"
        ? Math.max(baseSlippagePercent, 20)
        : fallbackSource === "uniswap"
          ? Math.max(baseSlippagePercent, 20)
          : baseSlippagePercent;
    const slippageBps = BigInt(Math.round(effectiveSlippagePercent * 100));
    const denominator = 10000n;
    const numerator = slippageBps >= denominator ? 0n : denominator - slippageBps;
    const minOut = rawOutput * numerator / denominator;

    const amountsOutForRoute =
      uniswapAmounts && uniswapAmounts.length
        ? uniswapAmounts.map((amount) => amount.toString())
        : [request.fromAmount, rawOutput.toString()];

    console.log(`${PROOF_LOG_PREFIX} ✅ Uniswap route prepared via ${quote.provider}`);

    return {
      provider: "uniswap",
      toAmount: rawOutput.toString(),
      toAmountMin: minOut.toString(),
      estimatedGas: txGasLimit,
      transactionRequest: {
        ...quote.transactionRequest,
        gasLimit: txGasLimit,
      },
      route: {
        protocol: "uniswap-v2",
        path: quote.path,
        proofPair: true,
        amountsOut: amountsOutForRoute,
        fallbackSource,
        slippagePercentApplied: effectiveSlippagePercent,
        dexscreenerPairUrl,
      },
      liquidityScore: 90,
      priceImpact: 3,
      tokenInDecimals,
      tokenOutDecimals,
      fromAmount: request.fromAmount,
      fromTokenAddress: request.fromToken,
      toTokenAddress: request.toToken,
    };
  } catch (error) {
    console.error(`${PROOF_LOG_PREFIX} ❌ Failed to build Uniswap route`, error);
    return null;
  }
}

/**
 * Multi-Aggregator Quote System
 * Tries multiple DEX aggregators to ensure maximum token coverage
 * Order: LiFi first (primary), then fallback to other aggregators (1inch, 0x, Paraswap, etc.)
 * Now with 30-second caching for faster repeated requests!
 */

interface QuoteRequest {
  fromChain: number
  toChain: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  toAddress?: string
  slippage?: number
}

interface UnifiedQuote {
  provider: "lifi" | "1inch" | "0x" | "paraswap" | "pancakeswap" | "uniswap" | "sushiswap" | "kyberswap" | "openocean"
  toAmount: string
  toAmountMin: string
  estimatedGas: string
  transactionRequest: any
  route?: any
  estimate?: any
  liquidityScore?: number // Higher = better liquidity
  priceImpact?: number // Lower = better
  fromAmount?: string
  tokenInDecimals?: number
  tokenOutDecimals?: number
  fromTokenAddress?: string
  toTokenAddress?: string
}

const LIFI_API_KEY = process.env.LIFI_API_KEY
const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY || ""
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || ""

// Enhanced chain ID mapping for different aggregators
const CHAIN_ID_MAP: { [key: number]: string } = {
  // Major EVM chains
  1: "ethereum",
  56: "bsc",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  43114: "avalanche",
  8453: "base",
  250: "fantom",
  100: "gnosis",
  25: "cronos",
  42220: "celo",
  1313161554: "aurora",
  1284: "moonbeam",
  1285: "moonriver",
  1088: "metis",
  321: "kcc",
  66: "okexchain",
  288: "boba",
  1101: "polygon-zkevm",
  324: "zksync-era",
  59144: "linea",
  534352: "scroll",
  5000: "mantle",
  81457: "blast",
  
  // Additional EVM chains
  128: "heco",
  122: "fuse",
  199: "bittorrent",
  106: "velas",
  57: "syscoin",
  361: "theta",
  40: "telos",
  88: "tomochain",
  888: "wanchain",
  20: "elastos",
  4689: "iotex",
  9001: "evmos",
  2222: "kava",
  8217: "klaytn",
  82: "meter",
  108: "thundercore",
  
  // Non-EVM chains (for future support)
  101: "solana", // Correct Solana chain ID
  195: "tron",
  99999: "cosmos",
  4160: "algorand",
  2001: "cardano",
  1329: "sei",
  61: "ethereum-classic",
}

/**
 * Try LiFi first (best for cross-chain)
 */
async function getLiFiQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    if (!LIFI_API_KEY) {
      console.log("[Aggregator] LiFi API key not configured");
      return null;
    }

    console.log("[Aggregator] 🔵 Trying LiFi...");
    
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

    console.log(`[Aggregator] Token normalization: ${request.fromToken} → ${normalizedFromToken}`);
    console.log(`[Aggregator] Token normalization: ${request.toToken} → ${normalizedToToken}`);
    
    // ✅ CRITICAL FIX: Ensure fromAmount is a valid BigNumberish (integer string)
    let normalizedFromAmount = request.fromAmount.trim();
    
    // Remove any scientific notation or decimal points
    if (normalizedFromAmount.includes('e') || normalizedFromAmount.includes('E')) {
      const numAmount = Number.parseFloat(normalizedFromAmount);
      if (!isNaN(numAmount)) {
        normalizedFromAmount = BigInt(Math.floor(numAmount)).toString();
      }
    } else if (normalizedFromAmount.includes('.')) {
      normalizedFromAmount = normalizedFromAmount.split('.')[0];
    }
    
    // Validate it's a valid integer string (BigNumberish format)
    if (!/^[0-9]+$/.test(normalizedFromAmount) || normalizedFromAmount === '0') {
      console.error(`[Aggregator] Invalid amount format: ${request.fromAmount}`);
      return null;
    }
    
    console.log(`[Aggregator] Amount normalization: ${request.fromAmount} → ${normalizedFromAmount}`);
    
    const slippageDecimal = request.slippage ? (request.slippage / 100).toString() : "0.005";
    
    const params = new URLSearchParams({
      fromChain: request.fromChain.toString(),
      toChain: request.toChain.toString(),
      fromToken: normalizedFromToken,
      toToken: normalizedToToken,
      fromAmount: normalizedFromAmount, // Use normalized amount
      fromAddress: request.fromAddress,
      ...(request.toAddress && { toAddress: request.toAddress }),
      slippage: slippageDecimal,
      integrator: "SPLENEX",
      fee: "0.005", // 0.5% fee
      allowSwitchChain: "true",
      maxPriceImpact: "0.5",
    });

    const response = await fetch(`https://li.quest/v1/quote?${params}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-lifi-api-key": LIFI_API_KEY,
      },
      signal: AbortSignal.timeout(6000), // Reduced to 6s for faster failures
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.message || errorData.error || errorData.errors?.[0]?.message || `Status ${response.status}`;
      
      // Log specific errors for debugging
      if (response.status === 400) {
        console.log(`[Aggregator] LiFi 400 error: ${errorMsg}`);
        if (errorMsg.includes("deny list") || errorMsg.includes("invalid") || errorMsg.includes("not supported")) {
          console.log(`[Aggregator] ⚠️ Token not supported by LiFi - will try other aggregators`);
        }
      } else {
        console.log(`[Aggregator] LiFi failed: ${response.status} - ${errorMsg}`);
      }
      return null;
    }

    const data = await response.json();
    console.log("[Aggregator] ✅ LiFi quote received!");
    
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
    console.log("[Aggregator] LiFi error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try 1inch (excellent for single-chain swaps)
 */
async function get1inchQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // 1inch only supports same-chain swaps
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] 1inch skipped (cross-chain not supported)");
      return null;
    }

    console.log("[Aggregator] 🟢 Trying 1inch...");
    
    const slippagePercent = request.slippage || 0.5;
    
    const params = new URLSearchParams({
      src: request.fromToken,
      dst: request.toToken,
      amount: request.fromAmount,
      from: request.fromAddress,
      slippage: slippagePercent.toString(),
      disableEstimate: "false",
      allowPartialFill: "false",
    });

    const headers: any = {
      "Accept": "application/json",
    };
    
    if (ONEINCH_API_KEY) {
      headers["Authorization"] = `Bearer ${ONEINCH_API_KEY}`;
    }

    const response = await fetch(
      `https://api.1inch.dev/swap/v6.0/${request.fromChain}/swap?${params}`,
      {
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Aggregator] 1inch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("[Aggregator] ✅ 1inch quote received!");
    
    return {
      provider: "1inch",
      toAmount: data.dstAmount || data.toAmount,
      toAmountMin: data.dstAmount || data.toAmount, // 1inch already factors slippage
      estimatedGas: data.gas || "0",
      transactionRequest: {
        to: data.tx.to,
        data: data.tx.data,
        value: data.tx.value,
        from: data.tx.from,
        gasLimit: data.tx.gas,
      },
      route: data,
    };
  } catch (error) {
    console.log("[Aggregator] 1inch error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try 0x API (powers Matcha, excellent coverage)
 */
async function get0xQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // 0x only supports same-chain swaps
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] 0x skipped (cross-chain not supported)");
      return null;
    }

    // 0x supports limited chains
    const supportedChains = [1, 56, 137, 42161, 10, 43114, 8453];
    if (!supportedChains.includes(request.fromChain)) {
      console.log("[Aggregator] 0x skipped (chain not supported)");
      return null;
    }

    console.log("[Aggregator] 🟣 Trying 0x...");
    
    const slippageDecimal = (request.slippage || 0.5) / 100;
    
    const params = new URLSearchParams({
      sellToken: request.fromToken,
      buyToken: request.toToken,
      sellAmount: request.fromAmount,
      takerAddress: request.fromAddress,
      slippagePercentage: slippageDecimal.toString(),
    });

    const headers: any = {
      "0x-api-key": ZEROX_API_KEY || "demo-api-key",
      "0x-version": "v2",
    };

    const response = await fetch(
      `https://api.0x.org/swap/v1/quote?${params}`,
      {
        headers,
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Aggregator] 0x failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("[Aggregator] ✅ 0x quote received!");
    
    return {
      provider: "0x",
      toAmount: data.buyAmount,
      toAmountMin: data.guaranteedPrice ? 
        (BigInt(data.buyAmount) * BigInt(Math.floor((1 - slippageDecimal) * 10000)) / BigInt(10000)).toString() :
        data.buyAmount,
      estimatedGas: data.estimatedGas || data.gas || "0",
      transactionRequest: {
        to: data.to,
        data: data.data,
        value: data.value,
        from: request.fromAddress,
        gasLimit: data.gas,
      },
      route: data,
    };
  } catch (error) {
    console.log("[Aggregator] 0x error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try Paraswap (great backup option)
 */
async function getParaswapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // Paraswap only supports same-chain swaps
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] Paraswap skipped (cross-chain not supported)");
      return null;
    }

    console.log("[Aggregator] 🟡 Trying Paraswap...");
    
    const slippagePercent = (request.slippage || 0.5) * 100; // Paraswap expects basis points
    
    const params = new URLSearchParams({
      srcToken: request.fromToken,
      destToken: request.toToken,
      srcDecimals: "18", // We'll need to get this dynamically
      destDecimals: "18",
      amount: request.fromAmount,
      side: "SELL",
      network: request.fromChain.toString(),
      userAddress: request.fromAddress,
    });

    const priceResponse = await fetch(
      `https://apiv5.paraswap.io/prices?${params}`,
      {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!priceResponse.ok) {
      console.log(`[Aggregator] Paraswap failed: ${priceResponse.status}`);
      return null;
    }

    const priceData = await priceResponse.json();
    
    // Build transaction
    const txResponse = await fetch(
      `https://apiv5.paraswap.io/transactions/${request.fromChain}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          srcToken: request.fromToken,
          destToken: request.toToken,
          srcAmount: request.fromAmount,
          destAmount: priceData.priceRoute.destAmount,
          priceRoute: priceData.priceRoute,
          userAddress: request.fromAddress,
          partner: "splenex",
          slippage: slippagePercent,
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!txResponse.ok) {
      console.log(`[Aggregator] Paraswap tx build failed: ${txResponse.status}`);
      return null;
    }

    const txData = await txResponse.json();
    console.log("[Aggregator] ✅ Paraswap quote received!");
    
    return {
      provider: "paraswap",
      toAmount: priceData.priceRoute.destAmount,
      toAmountMin: priceData.priceRoute.destAmount, // Already includes slippage
      estimatedGas: priceData.priceRoute.gasCost || "0",
      transactionRequest: {
        to: txData.to,
        data: txData.data,
        value: txData.value,
        from: request.fromAddress,
        gasLimit: priceData.priceRoute.gasCost,
      },
      route: priceData.priceRoute,
    };
  } catch (error) {
    console.log("[Aggregator] Paraswap error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try Uniswap V3 (excellent for Ethereum and major tokens)
 */
async function getUniswapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // Uniswap only supports Ethereum mainnet
    if (request.fromChain !== 1 || request.toChain !== 1) {
      console.log("[Aggregator] Uniswap skipped (only supports Ethereum)");
      return null;
    }

    console.log("[Aggregator] 🦄 Trying Uniswap V3...");
    
    const slippagePercent = (request.slippage || 0.5) * 100;
    
    // Use Uniswap V3 Subgraph API
    const query = `
      query GetQuote($tokenIn: String!, $tokenOut: String!, $amountIn: String!, $fee: Int!) {
        quote(input: {
          tokenIn: $tokenIn,
          tokenOut: $tokenOut,
          amountIn: $amountIn,
          fee: $fee
        }) {
          amountOut
          priceImpact
          route {
            tokenIn {
              symbol
              decimals
            }
            tokenOut {
              symbol
              decimals
            }
            pools {
              fee
              liquidity
            }
          }
        }
      }
    `;

    const variables = {
      tokenIn: request.fromToken,
      tokenOut: request.toToken,
      amountIn: request.fromAmount,
      fee: 3000, // 0.3% fee tier
    };

    const response = await fetch("https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.log(`[Aggregator] Uniswap failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.data?.quote) {
      console.log("[Aggregator] Uniswap: No valid quote data");
      return null;
    }

    const quote = data.data.quote;
    console.log("[Aggregator] ✅ Uniswap V3 quote received!");
    
    // Calculate minimum output with slippage
    const slippageMultiplier = 1 - (slippagePercent / 10000);
    const toAmountMin = (BigInt(quote.amountOut) * BigInt(Math.floor(slippageMultiplier * 10000)) / BigInt(10000)).toString();
    
    return {
      provider: "uniswap",
      toAmount: quote.amountOut,
      toAmountMin: toAmountMin,
      estimatedGas: "200000", // Default gas estimate
      transactionRequest: {
        to: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Uniswap V3 Router
        data: "0x", // Would need to build actual swap calldata
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
        from: request.fromAddress,
        gasLimit: "200000",
      },
      route: quote.route,
      liquidityScore: calculateLiquidityScore(quote.route?.pools),
      priceImpact: parseFloat(quote.priceImpact) * 100,
    };
  } catch (error) {
    console.log("[Aggregator] Uniswap error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try SushiSwap (good coverage across chains)
 */
async function getSushiSwapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // SushiSwap supports multiple chains
    const supportedChains = [1, 56, 137, 42161, 10, 43114, 8453, 250, 100, 25];
    
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] SushiSwap skipped (cross-chain not supported)");
      return null;
    }
    
    if (!supportedChains.includes(request.fromChain)) {
      console.log("[Aggregator] SushiSwap skipped (chain not supported)");
      return null;
    }

    console.log("[Aggregator] 🍣 Trying SushiSwap...");
    
    const slippagePercent = (request.slippage || 0.5) * 100;
    
    // SushiSwap API endpoint
    const params = new URLSearchParams({
      chainId: request.fromChain.toString(),
      tokenIn: request.fromToken,
      tokenOut: request.toToken,
      amount: request.fromAmount,
      recipient: request.fromAddress,
      slippagePercent: slippagePercent.toString(),
    });

    const response = await fetch(
      `https://api.sushi.com/v1/swap?${params}`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Aggregator] SushiSwap failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.route) {
      console.log("[Aggregator] SushiSwap: No valid quote data");
      return null;
    }

    console.log("[Aggregator] ✅ SushiSwap quote received!");
    
    return {
      provider: "sushiswap",
      toAmount: data.route.amountOut,
      toAmountMin: data.route.amountOutMin,
      estimatedGas: data.route.gasUsed || "250000",
      transactionRequest: {
        to: data.route.to,
        data: data.route.data,
        value: data.route.value || "0",
        from: request.fromAddress,
        gasLimit: data.route.gasUsed || "250000",
      },
      route: data.route,
      liquidityScore: calculateLiquidityScore(data.route.steps),
      priceImpact: data.route.priceImpact ? parseFloat(data.route.priceImpact) * 100 : 0,
    };
  } catch (error) {
    console.log("[Aggregator] SushiSwap error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try KyberSwap (excellent for low-cap tokens)
 */
async function getKyberSwapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // KyberSwap supports multiple chains
    const supportedChains = [1, 56, 137, 42161, 10, 43114, 8453, 250, 100, 25, 42220];
    
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] KyberSwap skipped (cross-chain not supported)");
      return null;
    }
    
    if (!supportedChains.includes(request.fromChain)) {
      console.log("[Aggregator] KyberSwap skipped (chain not supported)");
      return null;
    }

    console.log("[Aggregator] ⚡ Trying KyberSwap...");
    
    const slippagePercent = (request.slippage || 0.5) * 100;
    
    const params = new URLSearchParams({
      chainId: request.fromChain.toString(),
      tokenIn: request.fromToken,
      tokenOut: request.toToken,
      amountIn: request.fromAmount,
      recipient: request.fromAddress,
      slippageTolerance: slippagePercent.toString(),
    });

    const response = await fetch(
      `https://aggregator-api.kyberswap.com/v1/route?${params}`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Aggregator] KyberSwap failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.routeSummary) {
      console.log("[Aggregator] KyberSwap: No valid quote data");
      return null;
    }

    console.log("[Aggregator] ✅ KyberSwap quote received!");
    
    return {
      provider: "kyberswap",
      toAmount: data.routeSummary.amountOut,
      toAmountMin: data.routeSummary.amountOutMin,
      estimatedGas: data.routeSummary.gas || "300000",
      transactionRequest: {
        to: data.routeSummary.to,
        data: data.routeSummary.data,
        value: data.routeSummary.value || "0",
        from: request.fromAddress,
        gasLimit: data.routeSummary.gas || "300000",
      },
      route: data.routeSummary,
      liquidityScore: calculateLiquidityScore(data.routeSummary.swaps),
      priceImpact: data.routeSummary.priceImpact ? parseFloat(data.routeSummary.priceImpact) * 100 : 0,
    };
  } catch (error) {
    console.log("[Aggregator] KyberSwap error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Try OpenOcean (good for cross-chain and low-cap tokens)
 */
async function getOpenOceanQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    console.log("[Aggregator] 🌊 Trying OpenOcean...");
    
    const slippagePercent = (request.slippage || 0.5) * 100;
    
    const params = new URLSearchParams({
      chainId: request.fromChain.toString(),
      inTokenAddress: request.fromToken,
      outTokenAddress: request.toToken,
      amount: request.fromAmount,
      slippage: slippagePercent.toString(),
      gasPrice: "5", // Default gas price
    });

    const response = await fetch(
      `https://open-api.openocean.finance/v3/1/swap_quote?${params}`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      console.log(`[Aggregator] OpenOcean failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data || !data.data) {
      console.log("[Aggregator] OpenOcean: No valid quote data");
      return null;
    }

    console.log("[Aggregator] ✅ OpenOcean quote received!");
    
    return {
      provider: "openocean",
      toAmount: data.data.outAmount,
      toAmountMin: data.data.minOutAmount,
      estimatedGas: data.data.gas || "300000",
      transactionRequest: {
        to: data.data.to,
        data: data.data.data,
        value: data.data.value || "0",
        from: request.fromAddress,
        gasLimit: data.data.gas || "300000",
      },
      route: data.data,
      liquidityScore: calculateLiquidityScore(data.data.path),
      priceImpact: data.data.priceImpact ? parseFloat(data.data.priceImpact) * 100 : 0,
    };
  } catch (error) {
    console.log("[Aggregator] OpenOcean error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

/**
 * Calculate liquidity score based on route data
 */
function calculateLiquidityScore(routeData: any): number {
  if (!routeData) return 50; // Default score
  
  // Simple scoring based on route complexity and pool sizes
  let score = 100;
  
  if (Array.isArray(routeData)) {
    // More hops = lower score
    score -= routeData.length * 10;
    
    // Check for large pools (if liquidity data available)
    routeData.forEach((step: any) => {
      if (step.liquidity) {
        const liquidity = parseFloat(step.liquidity);
        if (liquidity > 1000000) score += 10; // Large pool bonus
        else if (liquidity < 100000) score -= 20; // Small pool penalty
      }
    });
  }
  
  return Math.max(0, Math.min(100, score));
}

async function resolveQuoteDecimals(fromToken: string, toToken: string) {
  const [tokenInDecimals, tokenOutDecimals] = await Promise.all([
    getTokenDecimals(fromToken),
    getTokenDecimals(toToken),
  ]);

  return { tokenInDecimals, tokenOutDecimals };
}

/**
 * Try PancakeSwap (excellent for BSC and multi-chain)
 */
async function getPancakeSwapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    // PancakeSwap supports BSC, Ethereum, and other chains
    const supportedChains = [1, 56, 137, 42161, 10, 43114, 8453, 25]; // ETH, BSC, Polygon, Arbitrum, Optimism, Avalanche, Base, Cronos
    
    // Only same-chain swaps
    if (request.fromChain !== request.toChain) {
      console.log("[Aggregator] PancakeSwap skipped (cross-chain not supported)");
      return null;
    }
    
    if (!supportedChains.includes(request.fromChain)) {
      console.log("[Aggregator] PancakeSwap skipped (chain not supported)");
      return null;
    }

    console.log("[Aggregator] 🥞 Trying PancakeSwap...");
    
    const slippagePercent = (request.slippage || 0.5) * 100; // Convert to basis points
    
    // PancakeSwap Smart Router API v3
    const quoteParams = new URLSearchParams({
      chainId: request.fromChain.toString(),
      inputCurrency: request.fromToken,
      outputCurrency: request.toToken,
      amount: request.fromAmount,
      trader: request.fromAddress,
      slippageTolerance: slippagePercent.toString(),
    });

    // Try PancakeSwap's Smart Router API
    const quoteResponse = await fetch(
      `https://api.pancakeswap.com/v3/quote?${quoteParams}`,
      {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!quoteResponse.ok) {
      console.log(`[Aggregator] PancakeSwap failed: ${quoteResponse.status}`);
      return null;
    }

    const quoteData = await quoteResponse.json();
    
    if (!quoteData || !quoteData.outputAmount) {
      console.log("[Aggregator] PancakeSwap: No valid quote data");
      return null;
    }

    console.log("[Aggregator] ✅ PancakeSwap quote received!");
    
    // Calculate minimum output with slippage
    const slippageMultiplier = 1 - (slippagePercent / 10000);
    const toAmountMin = (BigInt(quoteData.outputAmount) * BigInt(Math.floor(slippageMultiplier * 10000)) / BigInt(10000)).toString();
    
    return {
      provider: "pancakeswap",
      toAmount: quoteData.outputAmount,
      toAmountMin: toAmountMin,
      estimatedGas: quoteData.estimatedGas || "300000", // Default gas estimate
      transactionRequest: {
        to: quoteData.to || quoteData.routerAddress,
        data: quoteData.data || quoteData.calldata,
        value: quoteData.value || "0",
        from: request.fromAddress,
        gasLimit: quoteData.estimatedGas || "300000",
      },
      route: quoteData,
    };
  } catch (error) {
    console.log("[Aggregator] PancakeSwap error:", error instanceof Error ? error.message : "Unknown");
    return null;
  }
}

export async function getParallelRoutes(request: QuoteRequest) {
  console.log("[Parallel Routes] 🚀 Starting PARALLEL route search...");
  console.log(`[Parallel Routes] From: ${request.fromToken} (chain ${request.fromChain})`);
  console.log(`[Parallel Routes] To: ${request.toToken} (chain ${request.toChain})`);
  console.log(`[Parallel Routes] Amount: ${request.fromAmount}`);

  let cachedDecimals: { tokenInDecimals: number; tokenOutDecimals: number } | null = null;
  const getDecimals = async () => {
    if (!cachedDecimals) {
      cachedDecimals = await resolveQuoteDecimals(request.fromToken, request.toToken);
    }
    return cachedDecimals;
  };

  const enrichQuote = async (quote: UnifiedQuote | null) => {
    if (!quote) return quote;
    const decimals = await getDecimals();
    quote.fromAmount = quote.fromAmount ?? request.fromAmount;
    quote.tokenInDecimals = quote.tokenInDecimals ?? decimals.tokenInDecimals;
    quote.tokenOutDecimals = quote.tokenOutDecimals ?? decimals.tokenOutDecimals;
    quote.fromTokenAddress = quote.fromTokenAddress ?? request.fromToken;
    quote.toTokenAddress = quote.toTokenAddress ?? request.toToken;
    return quote;
  };

  const cachedQuote = getCachedQuote(request);
  if (cachedQuote) {
    console.log("[Parallel Routes] ⚡ Returning cached quote (cache hit)");
    await enrichQuote(cachedQuote);
    return {
      success: true,
      data: cachedQuote,
      bestRoute: cachedQuote,
      allQuotes: [cachedQuote],
      provider: cachedQuote.provider,
      totalProviders: 1,
      failedProviders: [],
    };
  }

  if (isProofEthPair(request)) {
    const proofRoute = await getProofUniswapRoute(request);
    if (proofRoute) {
      await enrichQuote(proofRoute);
      setCachedQuote(request, proofRoute);
      return {
        success: true,
        data: proofRoute,
        bestRoute: proofRoute,
        allQuotes: [proofRoute],
        provider: proofRoute.provider,
        totalProviders: 1,
        failedProviders: [],
      };
    }
  }

  const aggregatorEntries = [
    { name: "lifi", fn: getLiFiQuote },
    { name: "1inch", fn: get1inchQuote },
    { name: "0x", fn: get0xQuote },
    { name: "paraswap", fn: getParaswapQuote },
    { name: "pancakeswap", fn: getPancakeSwapQuote },
    { name: "uniswap", fn: getUniswapQuote },
    { name: "sushiswap", fn: getSushiSwapQuote },
    { name: "kyberswap", fn: getKyberSwapQuote },
    { name: "openocean", fn: getOpenOceanQuote },
  ];

  const quotePromises = aggregatorEntries.map(async ({ fn }) => {
    try {
      return await fn(request);
    } catch (error) {
      console.warn("[Parallel Routes] Aggregator failed", error);
      return null;
    }
  });

  const settled = await Promise.allSettled(quotePromises);

  const successfulQuotes: Array<UnifiedQuote & { providerName?: string }> = [];
  const failedProviders: string[] = [];

  settled.forEach((result, index) => {
    const providerName = aggregatorEntries[index].name;
    if (result.status === "fulfilled" && result.value) {
      successfulQuotes.push({ ...result.value, providerName });
    } else {
      failedProviders.push(providerName);
    }
  });

  if (!successfulQuotes.length) {
    console.log("[Parallel Routes] ❌ No successful routes");
    return {
      success: false,
      error: "No routes available",
      attemptedProviders: aggregatorEntries.map(({ name }) => name),
      failedProviders,
    };
  }

  await Promise.all(successfulQuotes.map((quote) => enrichQuote(quote)));

  successfulQuotes.sort((a, b) => {
    const amountA = BigInt(a.toAmount || "0");
    const amountB = BigInt(b.toAmount || "0");
    if (amountA !== amountB) {
      return amountA > amountB ? -1 : 1;
    }

    const liquidityA = a.liquidityScore ?? 0;
    const liquidityB = b.liquidityScore ?? 0;
    if (liquidityA !== liquidityB) {
      return liquidityB - liquidityA;
    }

    const impactA = a.priceImpact ?? 0;
    const impactB = b.priceImpact ?? 0;
    return impactA - impactB;
  });

  const bestQuote = successfulQuotes[0];
  await enrichQuote(bestQuote);
  setCachedQuote(request, bestQuote);

  console.log(`[Parallel Routes] ✅ Best route from ${bestQuote.provider.toUpperCase()}`);

  return {
    success: true,
    data: bestQuote,
    bestRoute: bestQuote,
    allQuotes: successfulQuotes,
    provider: bestQuote.provider,
    totalProviders: successfulQuotes.length,
    failedProviders,
  };
}

/**
 * Main function: Try all aggregators and return the best quote
 */
export async function getMultiAggregatorQuote(request: QuoteRequest) {
  console.log("[Aggregator] 🚀 Starting multi-aggregator quote search...");
  console.log(`[Aggregator] From: ${request.fromToken} (chain ${request.fromChain})`);
  console.log(`[Aggregator] To: ${request.toToken} (chain ${request.toChain})`);
  console.log(`[Aggregator] Amount: ${request.fromAmount}`);
  
  let cachedDecimals: { tokenInDecimals: number; tokenOutDecimals: number } | null = null;
  const getDecimals = async () => {
    if (!cachedDecimals) {
      cachedDecimals = await resolveQuoteDecimals(request.fromToken, request.toToken);
    }
    return cachedDecimals;
  };

  const enrichQuote = async (quote: UnifiedQuote | null) => {
    if (!quote) return quote;
    const decimals = await getDecimals();
    quote.fromAmount = quote.fromAmount ?? request.fromAmount;
    quote.tokenInDecimals = quote.tokenInDecimals ?? decimals.tokenInDecimals;
    quote.tokenOutDecimals = quote.tokenOutDecimals ?? decimals.tokenOutDecimals;
    quote.fromTokenAddress = quote.fromTokenAddress ?? request.fromToken;
    quote.toTokenAddress = quote.toTokenAddress ?? request.toToken;
    return quote;
  };
  
  // Check cache first for instant response
  const cachedQuote = getCachedQuote(request);
  if (cachedQuote) {
    console.log("[Aggregator] ⚡ Returning cached quote (instant!)");
    await enrichQuote(cachedQuote);
    return {
      success: true,
      data: cachedQuote,
      provider: cachedQuote.provider,
    };
  }
  
  // Dedicated routing for PROOF ↔ ETH swaps using Uniswap
  if (isProofEthPair(request)) {
    const proofRoute = await getProofUniswapRoute(request);
    if (proofRoute) {
      await enrichQuote(proofRoute);
      setCachedQuote(request, proofRoute);
      return {
        success: true,
        data: proofRoute,
        provider: proofRoute.provider,
      };
    }
  }

  const isCrossChain = request.fromChain !== request.toChain;
  
  // Enhanced routing strategy: Try LiFi first, then other aggregators as fallback
  const aggregators = isCrossChain 
    ? [
        getLiFiQuote,           // Best for cross-chain - TRY FIRST
        getOpenOceanQuote,       // Good cross-chain alternative
        get1inchQuote,          // Fallback for same-chain portions
        get0xQuote,             // High liquidity
        getKyberSwapQuote,       // Good for low-cap tokens
        getSushiSwapQuote,       // Multi-chain support
        getParaswapQuote,        // Reliable backup
        getPancakeSwapQuote,     // BSC specialist
        getUniswapQuote,         // Ethereum specialist
      ]
    : [
        getLiFiQuote,           // TRY FIRST - primary aggregator
        get1inchQuote,          // Fastest for same-chain
        get0xQuote,             // High liquidity
        getKyberSwapQuote,       // Excellent for low-cap tokens
        getSushiSwapQuote,       // Good multi-chain coverage
        getUniswapQuote,         // Ethereum specialist
        getPancakeSwapQuote,     // BSC specialist
        getParaswapQuote,        // Reliable backup
        getOpenOceanQuote,       // Good fallback
      ];
  
  // ✅ Try LiFi first (primary aggregator) before trying others
  console.log("[Aggregator] 🔵 Trying LiFi first...");
  
  try {
    const lifiQuote = await Promise.race([
      getLiFiQuote(request),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 6000)) // 6s timeout for LiFi
    ]);
    
    if (lifiQuote) {
      console.log(`[Aggregator] ✅ LiFi quote received!`);
      await enrichQuote(lifiQuote);
      setCachedQuote(request, lifiQuote);
      return {
        success: true,
        data: lifiQuote,
        provider: lifiQuote.provider,
        totalProviders: 1,
      };
    }
  } catch (error) {
    console.log(`[Aggregator] ⚠️ LiFi failed or timed out, trying other aggregators...`);
  }

  // Fallback: Try all aggregators in parallel
  console.log("[Aggregator] 🔄 Trying all aggregators in parallel (fast fallback)...");
  const quotes = await Promise.allSettled([
    getLiFiQuote(request),
    get1inchQuote(request),
    get0xQuote(request),
    getParaswapQuote(request),
    getPancakeSwapQuote(request),
    getUniswapQuote(request),
    getSushiSwapQuote(request),
    getKyberSwapQuote(request),
    getOpenOceanQuote(request),
  ]);

  // Extract successful quotes
  const successfulQuotes = quotes
    .map((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        return result.value;
      }
      return null;
    })
    .filter((q): q is UnifiedQuote => q !== null);

  await Promise.all(successfulQuotes.map((quote) => enrichQuote(quote)));

  if (successfulQuotes.length === 0) {
    console.log("[Aggregator] ❌ No aggregator could provide a quote");
    return {
      success: false,
      error: "No routes available from any aggregator. Token pair might have insufficient liquidity or restrictions.",
      attemptedProviders: ["lifi", "1inch", "0x", "paraswap", "pancakeswap", "uniswap", "sushiswap", "kyberswap", "openocean"],
    };
  }

  // Enhanced sorting: Consider output amount, liquidity score, and price impact
  successfulQuotes.sort((a, b) => {
    // Primary: Output amount (higher is better)
    const amountA = BigInt(a.toAmount);
    const amountB = BigInt(b.toAmount);
    if (amountA !== amountB) {
      return amountA > amountB ? -1 : 1;
    }
    
    // Secondary: Liquidity score (higher is better)
    const liquidityA = a.liquidityScore || 50;
    const liquidityB = b.liquidityScore || 50;
    if (liquidityA !== liquidityB) {
      return liquidityB - liquidityA;
    }
    
    // Tertiary: Price impact (lower is better)
    const impactA = a.priceImpact || 0;
    const impactB = b.priceImpact || 0;
    return impactA - impactB;
  });

  const bestQuote = successfulQuotes[0];
  
  // Cache the best quote for faster future requests
  await enrichQuote(bestQuote);
  setCachedQuote(request, bestQuote);
  
  console.log(`[Aggregator] ✅ Best quote from: ${bestQuote.provider.toUpperCase()}`);
  console.log(`[Aggregator] Output amount: ${bestQuote.toAmount}`);
  console.log(`[Aggregator] Total providers checked: ${successfulQuotes.length}`);
  
  // Log all quotes for comparison
  if (successfulQuotes.length > 1) {
    console.log("[Aggregator] 📊 All quotes received:");
    successfulQuotes.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.provider}: ${q.toAmount}`);
    });
  }

  return {
    success: true,
    data: bestQuote,
    allQuotes: successfulQuotes,
    totalProviders: successfulQuotes.length,
  };
}

/**
 * Get quote from specific provider (for testing)
 */
export async function getQuoteFromProvider(
  request: QuoteRequest,
  provider: "lifi" | "1inch" | "0x" | "paraswap" | "pancakeswap" | "uniswap" | "sushiswap" | "kyberswap" | "openocean"
) {
  console.log(`[Aggregator] Getting quote from ${provider.toUpperCase()} only...`);
  
  let quote: UnifiedQuote | null = null;
  
  switch (provider) {
    case "lifi":
      quote = await getLiFiQuote(request);
      break;
    case "1inch":
      quote = await get1inchQuote(request);
      break;
    case "0x":
      quote = await get0xQuote(request);
      break;
    case "paraswap":
      quote = await getParaswapQuote(request);
      break;
    case "pancakeswap":
      quote = await getPancakeSwapQuote(request);
      break;
    case "uniswap":
      quote = await getUniswapQuote(request);
      break;
    case "sushiswap":
      quote = await getSushiSwapQuote(request);
      break;
    case "kyberswap":
      quote = await getKyberSwapQuote(request);
      break;
    case "openocean":
      quote = await getOpenOceanQuote(request);
      break;
  }
  
  if (!quote) {
    return {
      success: false,
      error: `${provider} could not provide a quote`,
    };
  }
  
  return {
    success: true,
    data: quote,
  };
}

