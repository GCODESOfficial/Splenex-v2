import { NextRequest, NextResponse } from "next/server";
import { getMultiAggregatorQuote } from "@/lib/aggregator-quotes";

/**
 * Intelligent Routing API
 * Implements multi-hop routing strategies when direct swaps fail
 * Uses intermediate tokens to find routes for difficult pairs
 */

interface MultiHopRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  maxHops?: number;
}

// Common intermediate tokens for routing
const INTERMEDIATE_TOKENS: { [chainId: number]: string[] } = {
  1: [ // Ethereum
    "0xA0b86a33E6441b8C4C8C0E4A8e4A8e4A8e4A8e4A", // WETH
    "0xA0b86a33E6441b8C4C8C0E4A8e4A8e4A8e4A8e4A", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  ],
  56: [ // BSC
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", // BTCB
  ],
  137: [ // Polygon
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
    "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", // WBTC
  ],
  42161: [ // Arbitrum
    "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
  ],
  10: [ // Optimism
    "0x4200000000000000000000000000000000000006", // WETH
    "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC
    "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT
  ],
  43114: [ // Avalanche
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // USDC
    "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // USDT
  ],
  8453: [ // Base
    "0x4200000000000000000000000000000000000006", // WETH
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  ],
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage = 0.5,
      maxHops = 3,
    } = body;

    // Validation
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }

    console.log("[Intelligent Routing] 🧠 Starting intelligent routing...");
    console.log(`[Intelligent Routing] ${fromToken} (${fromChain}) → ${toToken} (${toChain})`);

    const result = await findOptimalRoute({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage,
      maxHops,
    });

    if (!result) {
      console.log("[Intelligent Routing] ❌ No routes found even with multi-hop");
      return NextResponse.json({
        success: false,
        error: "No routes available even with multi-hop routing. Token pair may have insufficient liquidity.",
        attemptedStrategies: ["direct", "2-hop", "3-hop", "stablecoin", "native"],
      }, { status: 404 });
    }

    console.log(`[Intelligent Routing] ✅ Route found: ${result.strategy}`);
    return NextResponse.json({
      success: true,
      data: result,
      strategy: result.strategy,
    });
  } catch (error) {
    console.error("[Intelligent Routing] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to find route",
      },
      { status: 500 });
  }
}

async function findOptimalRoute(request: MultiHopRequest): Promise<any> {
  const maxHops = request.maxHops || 3;
  
  // Strategy 1: Try direct swap first
  console.log("[Multi-Hop Routing] 🎯 Attempting direct swap...");
  const directRoute = await attemptDirectSwap(request);
  if (directRoute) {
    return directRoute;
  }
  
  // Strategy 2: Try 2-hop routes through major tokens
  console.log("[Multi-Hop Routing] 🔄 Attempting 2-hop routes...");
  const twoHopRoute = await attemptTwoHopRoute(request);
  if (twoHopRoute) {
    return twoHopRoute;
  }
  
  // Strategy 3: Try 3-hop routes for complex pairs
  if (maxHops >= 3) {
    console.log("[Multi-Hop Routing] 🔀 Attempting 3-hop routes...");
    const threeHopRoute = await attemptThreeHopRoute(request);
    if (threeHopRoute) {
      return threeHopRoute;
    }
  }
  
  // Strategy 4: Try routes through stablecoins
  console.log("[Multi-Hop Routing] 💰 Attempting stablecoin routes...");
  const stablecoinRoute = await attemptStablecoinRoute(request);
  if (stablecoinRoute) {
    return stablecoinRoute;
  }
  
  // Strategy 5: Try routes through native tokens
  console.log("[Multi-Hop Routing] 🌟 Attempting native token routes...");
  const nativeRoute = await attemptNativeTokenRoute(request);
  if (nativeRoute) {
    return nativeRoute;
  }
  
  return null;
}

async function attemptDirectSwap(request: MultiHopRequest): Promise<any> {
  try {
    const result = await getMultiAggregatorQuote({
      fromChain: request.fromChain,
      toChain: request.toChain,
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      fromAddress: request.fromAddress,
      toAddress: request.toAddress,
      slippage: request.slippage,
    });

    if (result.success && result.data) {
      console.log(`[Multi-Hop Routing] ✅ Direct route found via ${result.data.provider}`);
      return {
        ...result.data,
        strategy: "direct",
        hops: 1,
        path: [request.fromToken, request.toToken],
      };
    }
  } catch (error) {
    console.log("[Multi-Hop Routing] Direct swap failed:", error);
  }
  
  return null;
}

async function attemptTwoHopRoute(request: MultiHopRequest): Promise<any> {
  const intermediateTokens = INTERMEDIATE_TOKENS[request.fromChain] || [];
  
  for (const intermediateToken of intermediateTokens.slice(0, 5)) { // Limit to top 5 tokens
    try {
      console.log(`[Multi-Hop Routing] Trying 2-hop via ${intermediateToken}...`);
      
      // First hop: fromToken → intermediateToken
      const firstHop = await getMultiAggregatorQuote({
        fromChain: request.fromChain,
        toChain: request.fromChain,
        fromToken: request.fromToken,
        toToken: intermediateToken,
        fromAmount: request.fromAmount,
        fromAddress: request.fromAddress,
        slippage: request.slippage,
      });

      if (!firstHop.success || !firstHop.data) {
        continue;
      }

      // Second hop: intermediateToken → toToken
      const secondHop = await getMultiAggregatorQuote({
        fromChain: request.fromChain,
        toChain: request.toChain,
        fromToken: intermediateToken,
        toToken: request.toToken,
        fromAmount: firstHop.data.toAmount,
        fromAddress: request.fromAddress,
        toAddress: request.toAddress,
        slippage: request.slippage,
      });

      if (secondHop.success && secondHop.data) {
        console.log(`[Multi-Hop Routing] ✅ 2-hop route found via ${intermediateToken}`);
        return {
          ...secondHop.data,
          strategy: "2-hop",
          hops: 2,
          path: [request.fromToken, intermediateToken, request.toToken],
          intermediateToken,
          firstHop: firstHop.data,
          secondHop: secondHop.data,
        };
      }
    } catch (error) {
      console.log(`[Multi-Hop Routing] 2-hop via ${intermediateToken} failed:`, error);
      continue;
    }
  }
  
  return null;
}

async function attemptThreeHopRoute(request: MultiHopRequest): Promise<any> {
  const intermediateTokens = INTERMEDIATE_TOKENS[request.fromChain] || [];
  
  // Try a few combinations of major tokens
  const majorTokens = intermediateTokens.slice(0, 3);
  
  for (const token1 of majorTokens) {
    for (const token2 of majorTokens) {
      if (token1 === token2) continue;
      
      try {
        console.log(`[Multi-Hop Routing] Trying 3-hop via ${token1} → ${token2}...`);
        
        // First hop: fromToken → token1
        const firstHop = await getMultiAggregatorQuote({
          fromChain: request.fromChain,
          toChain: request.fromChain,
          fromToken: request.fromToken,
          toToken: token1,
          fromAmount: request.fromAmount,
          fromAddress: request.fromAddress,
          slippage: request.slippage,
        });

        if (!firstHop.success || !firstHop.data) continue;

        // Second hop: token1 → token2
        const secondHop = await getMultiAggregatorQuote({
          fromChain: request.fromChain,
          toChain: request.fromChain,
          fromToken: token1,
          toToken: token2,
          fromAmount: firstHop.data.toAmount,
          fromAddress: request.fromAddress,
          slippage: request.slippage,
        });

        if (!secondHop.success || !secondHop.data) continue;

        // Third hop: token2 → toToken
        const thirdHop = await getMultiAggregatorQuote({
          fromChain: request.fromChain,
          toChain: request.toChain,
          fromToken: token2,
          toToken: request.toToken,
          fromAmount: secondHop.data.toAmount,
          fromAddress: request.fromAddress,
          toAddress: request.toAddress,
          slippage: request.slippage,
        });

        if (thirdHop.success && thirdHop.data) {
          console.log(`[Multi-Hop Routing] ✅ 3-hop route found via ${token1} → ${token2}`);
          return {
            ...thirdHop.data,
            strategy: "3-hop",
            hops: 3,
            path: [request.fromToken, token1, token2, request.toToken],
            intermediateTokens: [token1, token2],
            hops: [firstHop.data, secondHop.data, thirdHop.data],
          };
        }
      } catch (error) {
        console.log(`[Multi-Hop Routing] 3-hop via ${token1} → ${token2} failed:`, error);
        continue;
      }
    }
  }
  
  return null;
}

async function attemptStablecoinRoute(request: MultiHopRequest): Promise<any> {
  // Try routing through stablecoins (USDC, USDT, DAI)
  const stablecoins = [
    "0xA0b86a33E6441b8C4C8C0E4A8e4A8e4A8e4A8e4A", // USDC (placeholder)
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
  ];

  for (const stablecoin of stablecoins) {
    try {
      console.log(`[Multi-Hop Routing] Trying stablecoin route via ${stablecoin}...`);
      
      const result = await attemptTwoHopRoute({
        ...request,
        intermediateToken: stablecoin,
      });
      
      if (result) {
        return {
          ...result,
          strategy: "stablecoin",
        };
      }
    } catch (error) {
      console.log(`[Multi-Hop Routing] Stablecoin route failed:`, error);
      continue;
    }
  }
  
  return null;
}

async function attemptNativeTokenRoute(request: MultiHopRequest): Promise<any> {
  // Try routing through native tokens (ETH, BNB, MATIC, etc.)
  const nativeTokens: { [chainId: number]: string } = {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
    56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
    137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
    10: "0x4200000000000000000000000000000000000006", // WETH
    43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", // WAVAX
    8453: "0x4200000000000000000000000000000000000006", // WETH
  };

  const nativeToken = nativeTokens[request.fromChain];
  if (!nativeToken) return null;

  try {
    console.log(`[Multi-Hop Routing] Trying native token route via ${nativeToken}...`);
    
    const result = await attemptTwoHopRoute({
      ...request,
      intermediateToken: nativeToken,
    });
    
    if (result) {
      return {
        ...result,
        strategy: "native",
      };
    }
  } catch (error) {
    console.log(`[Multi-Hop Routing] Native token route failed:`, error);
  }
  
  return null;
}