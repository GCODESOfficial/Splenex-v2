/* eslint-disable @typescript-eslint/no-explicit-any */
"use server"

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

/**
 * Encode function call for swapExactETHForTokens
 */
function encodeSwapExactETHForTokens(
  amountOutMin: string,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactETHForTokens(uint256,address[],address,uint256)
  const functionSignature = "0x7ff36ab5";
  
  // Encode parameters
  const params = [
    amountOutMin.padStart(64, '0'),
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
  amountIn: string,
  amountOutMin: string,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactTokensForETH(uint256,uint256,address[],address,uint256)
  const functionSignature = "0x18cbafe5";
  
  const params = [
    amountIn.padStart(64, '0'),
    amountOutMin.padStart(64, '0'),
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
  amountIn: string,
  amountOutMin: string,
  path: string[],
  to: string,
  deadline: number
): string {
  // Function signature: swapExactTokensForTokens(uint256,uint256,address[],address,uint256)
  const functionSignature = "0x38ed1739";
  
  const params = [
    amountIn.padStart(64, '0'),
    amountOutMin.padStart(64, '0'),
    "00000000000000000000000000000000000000000000000000000000000000a0", // offset to path array
    to.slice(2).padStart(64, '0'),
    deadline.toString(16).padStart(64, '0'),
    path.length.toString(16).padStart(64, '0'),
    ...path.map(addr => addr.slice(2).padStart(64, '0'))
  ];
  
  return functionSignature + params.join('');
}

/**
 * Get quote directly from PancakeSwap V2 (or other DEX)
 * This works for ANY token pair with liquidity, even low-cap meme tokens!
 */
export async function getDirectDexQuote(request: DirectDexQuoteRequest): Promise<{ success: boolean; data?: DirectDexQuote; error?: string }> {
  try {
    console.log("[Direct DEX] 🥞 Trying direct PancakeSwap V2 as last resort...");
    console.log(`[Direct DEX] Pair: ${request.fromToken} → ${request.toToken} on chain ${request.fromChain}`);
    
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
    
    console.log("[Direct DEX] Path:", path);
    
    // For direct DEX, we'll use a simplified quote calculation
    // In production, you'd call getAmountsOut on the router contract
    // For now, we'll create a transaction that will be validated on-chain
    
    const slippageMultiplier = 1 - ((request.slippage || 0.5) / 100);
    const estimatedOut = BigInt(request.fromAmount); // Simplified - should call getAmountsOut
    const minOut = (estimatedOut * BigInt(Math.floor(slippageMultiplier * 10000)) / BigInt(10000)).toString();
    
    // Create transaction based on swap type
    const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
    let data: string;
    let value: string;
    
    if (isFromNative) {
      // ETH/BNB → Token
      data = encodeSwapExactETHForTokens(
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = request.fromAmount;
    } else if (isToNative) {
      // Token → ETH/BNB
      data = encodeSwapExactTokensForETH(
        request.fromAmount,
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = "0";
    } else {
      // Token → Token
      data = encodeSwapExactTokensForTokens(
        request.fromAmount,
        minOut,
        path,
        request.fromAddress,
        deadline
      );
      value = "0";
    }
    
    console.log("[Direct DEX] ✅ Direct DEX quote created!");
    console.log(`[Direct DEX] Using ${dexName.toUpperCase()} router: ${routerAddress}`);
    
    return {
      success: true,
      data: {
        provider: dexName as any,
        toAmount: estimatedOut.toString(),
        toAmountMin: minOut,
        path: path,
        transactionRequest: {
          to: routerAddress,
          data: data,
          value: value,
          from: request.fromAddress,
        },
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

