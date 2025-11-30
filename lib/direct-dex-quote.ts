/* eslint-disable @typescript-eslint/no-explicit-any */

import { fetchUniswapV2AmountsOut } from "./uniswap-v2";
import { getDEXScreenerToken } from "./dexscreener";
import { getTokenDecimals, ETH_RPC_ENDPOINTS, BSC_RPC_ENDPOINTS } from "./token-decimals";
import { toBigIntSafe } from "./bigint-utils";

/**
 * Direct DEX Integration (Fallback for Low-Cap Tokens)
 * When aggregators fail, try direct DEX routers
 * This allows swapping ANY token with liquidity, even low-cap meme tokens!
 */

interface DirectDexQuoteRequest {
  fromChain: number
  toChain: number
  fromToken: string
  toToken: string
  fromAmount: string
  fromAddress: string
  slippage?: number
}

interface DirectDexQuote {
  provider: "pancakeswap-v2" | "uniswap-v2" | "sushiswap"
  toAmount: string
  toAmountMin: string
  path: string[]
  dexscreenerPairUrl?: string
  slippagePercentApplied?: number
  fromAmount: string
  tokenInDecimals?: number
  tokenOutDecimals?: number
  fromTokenAddress?: string
  toTokenAddress?: string
  transactionRequest: {
    to: string
    data: string
    value: string
    from: string
  }
}

// Router addresses for different chains/DEXs
const ROUTERS: { [key: number]: { [key: string]: string } } = {
  56: { // BSC
    "pancakeswap-v2": "0x10ED43C718714eb63d5aA57B78B54704E256024E",
  },
  1: { // Ethereum
    "uniswap-v2": "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    "sushiswap": "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  },
  137: { // Polygon
    "quickswap": "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    "sushiswap": "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
  },
};

// Wrapped native token addresses
const WRAPPED_NATIVE: { [key: number]: string } = {
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",   // WETH
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
};

const resolveRpcEndpoints = (chainId: number): string[] => {
  switch (chainId) {
    case 56:
      return BSC_RPC_ENDPOINTS;
    default:
      return ETH_RPC_ENDPOINTS;
  }
};

/**
 * Encode function call for swapExactETHForTokens
 */
function encodeSwapExactETHForTokens(
  amountOutMin: bigint,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactETHForTokens(uint256,address[],address,uint256)
  const functionSignature = "0x7ff36ab5";
  
  // Encode parameters
  const params = [
    amountOutMin.toString(16).padStart(64, '0'),
    "0000000000000000000000000000000000000000000000000000000000000080", // offset to path array
    to.slice(2).padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    path.length.toString(16).padStart(64, '0'),
    ...path.map(addr => addr.slice(2).padStart(64, '0'))
  ];
  
  return functionSignature + params.join('');
}

/**
 * Encode function call for swapExactTokensForETH
 */
function encodeSwapExactTokensForETH(
  amountIn: bigint,
  amountOutMin: bigint,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactTokensForETH(uint256,uint256,address[],address,uint256)
  const functionSignature = "0x18cbafe5";
  
  const params = [
    amountIn.toString(16).padStart(64, '0'),
    amountOutMin.toString(16).padStart(64, '0'),
    "00000000000000000000000000000000000000000000000000000000000000a0", // offset to path array
    to.slice(2).padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    path.length.toString(16).padStart(64, '0'),
    ...path.map(addr => addr.slice(2).padStart(64, '0'))
  ];
  
  return functionSignature + params.join('');
}

/**
 * Encode function call for swapExactTokensForTokens
 */
function encodeSwapExactTokensForTokens(
  amountIn: bigint,
  amountOutMin: bigint,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
  const functionSignature = "0x38ed1739";
  
  const params = [
    amountIn.toString(16).padStart(64, '0'),
    amountOutMin.toString(16).padStart(64, '0'),
    "00000000000000000000000000000000000000000000000000000000000000a0", // offset to path array
    to.slice(2).padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    path.length.toString(16).padStart(64, '0'),
    ...path.map(addr => addr.slice(2).padStart(64, '0'))
  ];
  
  return functionSignature + params.join('');
}

const PROOF_TOKEN_ADDRESS = "0x9b4a69de6ca0defdd02c0c4ce6cb84de5202944e".toLowerCase();
const WETH_ADDRESS = WRAPPED_NATIVE[1].toLowerCase();

async function fetchDexscreenerProofAmount(
  path: string[],
  amountIn: bigint,
  isFromNative: boolean,
  isToNative: boolean,
  chainId?: number
): Promise<{ amount: bigint; pairUrl?: string } | null> {
  const lowerPath = path.map((addr) => addr.toLowerCase());
  const involvesProof = lowerPath.includes(PROOF_TOKEN_ADDRESS) && lowerPath.includes(WETH_ADDRESS);

  if (!involvesProof) {
    return null;
  }

  try {
    const pairs = await getDEXScreenerToken(PROOF_TOKEN_ADDRESS);
    if (!pairs.length) {
      return null;
    }

    const targetPair = pairs.find((pair: any) => {
      const base = pair.baseToken?.address?.toLowerCase();
      const quote = pair.quoteToken?.address?.toLowerCase();
      return (
        (base === PROOF_TOKEN_ADDRESS && quote === WETH_ADDRESS) ||
        (base === WETH_ADDRESS && quote === PROOF_TOKEN_ADDRESS)
      );
    });

    if (!targetPair || !targetPair.priceNative) {
      return null;
    }

    const priceScale = 18n;
    const priceScaled = toBigIntSafe(targetPair.priceNative);
    if (priceScaled <= 0n) {
      return null;
    }

    const tokenInDecimals = await getTokenDecimals(lowerPath[0], chainId);
    const tokenOutDecimals = await getTokenDecimals(lowerPath[lowerPath.length - 1], chainId);
    const tokenInScale = 10n ** BigInt(tokenInDecimals);
    const tokenOutScale = 10n ** BigInt(tokenOutDecimals);
    const priceScaleFactor = 10n ** priceScale;
    let amountOut: bigint | null = null;

    if (isFromNative && lowerPath[0] === WETH_ADDRESS && lowerPath[lowerPath.length - 1] === PROOF_TOKEN_ADDRESS) {
      // ETH → PROOF
      const numerator = amountIn * tokenOutScale * priceScaleFactor;
      const denominator = priceScaled * tokenInScale;
      amountOut = denominator === 0n ? null : numerator / denominator;
    } else if (isToNative && lowerPath[0] === PROOF_TOKEN_ADDRESS && lowerPath[lowerPath.length - 1] === WETH_ADDRESS) {
      // PROOF → ETH
      const numerator = amountIn * priceScaled * tokenOutScale;
      const denominator = tokenInScale * priceScaleFactor;
      amountOut = denominator === 0n ? null : numerator / denominator;
    }

    if (amountOut && amountOut > 0n) {
      return {
        amount: amountOut,
        pairUrl: targetPair.url,
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get quote directly from PancakeSwap V2 (or other DEX)
 * This works for ANY token pair with liquidity, even low-cap meme tokens!
 */
export async function getDirectDexQuote(request: DirectDexQuoteRequest): Promise<{ success: boolean; data?: DirectDexQuote; error?: string }> {
  try {
    
    // Only same-chain swaps
    if (request.fromChain !== request.toChain) {
      return { success: false, error: "Direct DEX only supports same-chain swaps" };
    }
    
    // Get router for this chain
    const chainRouters = ROUTERS[request.fromChain];
    if (!chainRouters) {
      return { success: false, error: `No direct DEX support for chain ${request.fromChain}` };
    }
    
    // For BSC, use PancakeSwap V2
    const dexName = request.fromChain === 56 ? "pancakeswap-v2" : 
                    request.fromChain === 1 ? "uniswap-v2" : "sushiswap";
    const routerAddress = chainRouters[dexName];
    
    if (!routerAddress) {
      return { success: false, error: `No router found for chain ${request.fromChain}` };
    }
    
    const wrappedNative = WRAPPED_NATIVE[request.fromChain];
    if (!wrappedNative) {
      return { success: false, error: "Wrapped native token not configured" };
    }
    
    // Determine if native token is involved
    const isFromNative = request.fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const isToNative = request.toToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    
    // Build path
    let path: string[];
    if (isFromNative) {
      path = [wrappedNative, request.toToken];
    } else if (isToNative) {
      path = [request.fromToken, wrappedNative];
    } else {
      // Token to token - route through wrapped native
      path = [request.fromToken, wrappedNative, request.toToken];
    }

    let estimatedOut = toBigIntSafe(request.fromAmount);
    let dexscreenerPairUrl: string | undefined;

    const tokenInDecimals = await getTokenDecimals(path[0], request.fromChain);
    const tokenOutDecimals = await getTokenDecimals(path[path.length - 1], request.fromChain);

    const rpcEndpoints = resolveRpcEndpoints(request.fromChain);
    const uniswapAmounts = await fetchUniswapV2AmountsOut(request.fromAmount, path, "[Direct DEX]", rpcEndpoints, routerAddress);
    if (uniswapAmounts && uniswapAmounts.length) {
      estimatedOut = uniswapAmounts[uniswapAmounts.length - 1];
    }

    const proofDexQuote = await fetchDexscreenerProofAmount(path, toBigIntSafe(request.fromAmount), isFromNative, isToNative, request.fromChain);
    const baseSlippagePercent = request.slippage ?? 0.5;
    let effectiveSlippagePercent =
      uniswapAmounts && uniswapAmounts.length ? Math.max(baseSlippagePercent, 20) : baseSlippagePercent;

    if ((!uniswapAmounts || !uniswapAmounts.length) && proofDexQuote && proofDexQuote.amount > 0n) {
      estimatedOut = proofDexQuote.amount;
      dexscreenerPairUrl = proofDexQuote.pairUrl;
      effectiveSlippagePercent = Math.max(baseSlippagePercent, 20);
    } else if (proofDexQuote?.pairUrl) {
      dexscreenerPairUrl = proofDexQuote.pairUrl;
    }

    const slippageBps = BigInt(Math.round(effectiveSlippagePercent * 100));
    const denominator = 10000n;
    const numerator = slippageBps >= denominator ? 0n : denominator - slippageBps;
    const minOut = estimatedOut * numerator / denominator;
 
    // Create transaction based on swap type
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    let data: string;
    let value: string;

    const amountInBigInt = toBigIntSafe(request.fromAmount);
    const toHexString = (amount: bigint): string => `0x${amount.toString(16)}`;

    if (isFromNative) {
      // ETH/BNB → Token
      data = encodeSwapExactETHForTokens(
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = toHexString(amountInBigInt);
    } else if (isToNative) {
      // Token → ETH/BNB
      data = encodeSwapExactTokensForETH(
        amountInBigInt,
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = "0x0";
    } else {
      // Token → Token
      data = encodeSwapExactTokensForTokens(
        amountInBigInt,
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = "0x0";
    }

    return {
      success: true,
      data: {
        provider: dexName as any,
        toAmount: estimatedOut.toString(),
        toAmountMin: minOut.toString(),
        path: path,
        fromAmount: amountInBigInt.toString(),
        tokenInDecimals,
        tokenOutDecimals,
        fromTokenAddress: request.fromToken,
        toTokenAddress: request.toToken,
        transactionRequest: {
          to: routerAddress,
          data: data,
          value: value,
          from: request.fromAddress,
        },
        dexscreenerPairUrl,
        slippagePercentApplied: effectiveSlippagePercent,
      },
    };
  } catch (error) {
    console.error("[Direct DEX] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Direct DEX quote failed",
    };
  }
}

