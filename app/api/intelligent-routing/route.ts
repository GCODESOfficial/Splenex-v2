import { NextRequest, NextResponse } from "next/server";
import { getMultiAggregatorQuote } from "@/lib/aggregator-quotes";

/**
 * Intelligent Routing API
 * Provides advanced routing capabilities for complex token pairs
 * Handles cross-chain swaps, low-liquidity tokens, and fallback routing
 */

interface IntelligentRoutingRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  maxHops?: number;
  preferLiquidity?: boolean;
  allowBridges?: string[];
  excludeBridges?: string[];
}

interface RoutingResult {
  success: boolean;
  route?: {
    steps: Array<{
      chainId: number;
      tokenIn: string;
      tokenOut: string;
      amountIn: string;
      amountOut: string;
      provider: string;
      type: "swap" | "bridge";
      gasEstimate: string;
      priceImpact: number;
      liquidityScore: number;
    }>;
    totalOutput: string;
    totalGas: string;
    totalPriceImpact: number;
    estimatedTime: string;
    confidence: number;
  };
  alternatives?: Array<{
    route: any;
    score: number;
    reason: string;
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: IntelligentRoutingRequest = await request.json();
    
    console.log("[Intelligent Routing] 🧠 Processing routing request:", {
      from: `${body.fromToken} (${body.fromChain})`,
      to: `${body.toToken} (${body.toChain})`,
      amount: body.fromAmount,
    });

    // Validate request
    if (!body.fromChain || !body.toChain || !body.fromToken || !body.toToken || !body.fromAmount) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters: fromChain, toChain, fromToken, toToken, fromAmount"
      }, { status: 400 });
    }

    // Strategy 1: Direct swap (same chain)
    if (body.fromChain === body.toChain) {
      console.log("[Intelligent Routing] 🔄 Same-chain swap detected");
      
      // Priority 1: PancakeSwap for BSC tokens (especially low-cap tokens)
      if (body.fromChain === 56) {
        console.log("[Intelligent Routing] 🥞 BSC swap detected, trying PancakeSwap first...");
        
        try {
          const pancakeResponse = await fetch("/api/pancakeswap-direct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromToken: body.fromToken,
              toToken: body.toToken,
              fromAmount: body.fromAmount,
              fromAddress: body.fromAddress,
              slippage: body.slippage || 0.5,
            }),
          });

          if (pancakeResponse.ok) {
            const pancakeData = await pancakeResponse.json();
            if (pancakeData.success) {
              console.log("[Intelligent Routing] ✅ PancakeSwap route found:", pancakeData.route.dex);
              
              return NextResponse.json({
                success: true,
                route: {
                  steps: [{
                    chainId: body.fromChain,
                    tokenIn: body.fromToken,
                    tokenOut: body.toToken,
                    amountIn: body.fromAmount,
                    amountOut: pancakeData.route.expectedOutput,
                    provider: pancakeData.route.dex,
                    type: "swap",
                    gasEstimate: pancakeData.route.gasEstimate,
                    priceImpact: pancakeData.route.priceImpact,
                    liquidityScore: 80, // High score for PancakeSwap
                  }],
                  totalOutput: pancakeData.route.expectedOutput,
                  totalGas: pancakeData.route.gasEstimate,
                  totalPriceImpact: pancakeData.route.priceImpact,
                  estimatedTime: "2-5 minutes",
                  confidence: 95, // High confidence for PancakeSwap
                },
                alternatives: []
              });
            }
          }
        } catch (pancakeError) {
          console.warn("[Intelligent Routing] ⚠️ PancakeSwap failed:", pancakeError);
        }
      }
      
      // Priority 2: Check if this is a low-cap token swap (like TWC)
      const isLowCapToken = isLowCapTokenSwap(body.fromToken, body.toToken);
      
      if (isLowCapToken) {
        console.log("[Intelligent Routing] 🐱 Low-cap token detected, trying specialized routing...");
        
        try {
          const lowCapResponse = await fetch("/api/low-cap-routing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromToken: body.fromToken,
              toToken: body.toToken,
              fromAmount: body.fromAmount,
              fromAddress: body.fromAddress,
              chainId: body.fromChain,
              slippage: body.slippage || 0.5,
            }),
          });

          if (lowCapResponse.ok) {
            const lowCapData = await lowCapResponse.json();
            if (lowCapData.success) {
              console.log("[Intelligent Routing] ✅ Low-cap routing found:", lowCapData.route.dex);
              
              return NextResponse.json({
                success: true,
                route: {
                  steps: [{
                    chainId: body.fromChain,
                    tokenIn: body.fromToken,
                    tokenOut: body.toToken,
                    amountIn: body.fromAmount,
                    amountOut: lowCapData.route.expectedOutput,
                    provider: lowCapData.route.dex,
                    type: "swap",
                    gasEstimate: lowCapData.route.gasEstimate,
                    priceImpact: lowCapData.route.priceImpact,
                    liquidityScore: 30, // Low score for low-cap tokens
                  }],
                  totalOutput: lowCapData.route.expectedOutput,
                  totalGas: lowCapData.route.gasEstimate,
                  totalPriceImpact: lowCapData.route.priceImpact,
                  estimatedTime: "3-8 minutes",
                  confidence: 70, // Lower confidence for low-cap tokens
                },
                alternatives: []
              });
            }
          }
        } catch (lowCapError) {
          console.warn("[Intelligent Routing] ⚠️ Low-cap routing failed:", lowCapError);
        }
      }
      
      // Fallback to standard aggregator routing
      const directQuote = await getMultiAggregatorQuote({
        fromChain: body.fromChain,
        toChain: body.toChain,
        fromToken: body.fromToken,
        toToken: body.toToken,
        fromAmount: body.fromAmount,
        fromAddress: body.fromAddress,
        toAddress: body.toAddress,
        slippage: body.slippage || 0.5,
      });

      if (directQuote.success) {
        return NextResponse.json({
          success: true,
          route: {
            steps: [{
              chainId: body.fromChain,
              tokenIn: body.fromToken,
              tokenOut: body.toToken,
              amountIn: body.fromAmount,
              amountOut: directQuote.data.toAmount,
              provider: directQuote.data.provider,
              type: "swap",
              gasEstimate: directQuote.data.estimatedGas,
              priceImpact: directQuote.data.priceImpact || 0,
              liquidityScore: directQuote.data.liquidityScore || 50,
            }],
            totalOutput: directQuote.data.toAmount,
            totalGas: directQuote.data.estimatedGas,
            totalPriceImpact: directQuote.data.priceImpact || 0,
            estimatedTime: "2-5 minutes",
            confidence: 95,
          },
          alternatives: directQuote.allQuotes?.slice(1, 3).map(quote => ({
            route: quote,
            score: quote.liquidityScore || 50,
            reason: `Alternative via ${quote.provider}`
          })) || []
        });
      }
    }

    // Strategy 2: Cross-chain swap
    console.log("[Intelligent Routing] 🌉 Cross-chain swap detected");
    
    const crossChainQuote = await getMultiAggregatorQuote({
      fromChain: body.fromChain,
      toChain: body.toChain,
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      fromAddress: body.fromAddress,
      toAddress: body.toAddress,
      slippage: body.slippage || 0.5,
    });

    if (crossChainQuote.success) {
      // Parse cross-chain route
      const route = crossChainQuote.data.route;
      const steps = [];
      
      // Extract steps from LiFi route
      if (route?.action?.type === "cross") {
        steps.push({
          chainId: body.fromChain,
          tokenIn: body.fromToken,
          tokenOut: route.action.toToken.address,
          amountIn: body.fromAmount,
          amountOut: route.action.toAmount,
          provider: crossChainQuote.data.provider,
          type: "bridge",
          gasEstimate: route.estimate?.gasCosts?.[0]?.estimate || "300000",
          priceImpact: route.estimate?.priceImpact || 0,
          liquidityScore: 80, // Cross-chain typically has good liquidity
        });
      }

      return NextResponse.json({
        success: true,
        route: {
          steps,
          totalOutput: crossChainQuote.data.toAmount,
          totalGas: crossChainQuote.data.estimatedGas,
          totalPriceImpact: crossChainQuote.data.priceImpact || 0,
          estimatedTime: "5-15 minutes",
          confidence: 85,
        },
        alternatives: []
      });
    }

    // Strategy 3: Universal multi-hop routing (if direct fails)
    console.log("[Intelligent Routing] 🌐 Attempting universal multi-hop routing...");
    
    try {
      const universalResponse = await fetch("/api/universal-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromToken: body.fromToken,
          toToken: body.toToken,
          fromAmount: body.fromAmount,
          fromAddress: body.fromAddress,
          chainId: body.fromChain,
          slippage: body.slippage || 0.5,
          maxHops: 3,
        }),
      });

      if (universalResponse.ok) {
        const universalData = await universalResponse.json();
        if (universalData.success) {
          console.log("[Intelligent Routing] ✅ Universal routing found:", universalData.route.totalHops, "hops, confidence:", universalData.route.confidence + "%");
          
          return NextResponse.json({
            success: true,
            route: {
              steps: universalData.route.steps.map((step: any) => ({
                chainId: body.fromChain,
                tokenIn: step.fromToken,
                tokenOut: step.toToken,
                amountIn: step.amountIn,
                amountOut: step.amountOut,
                provider: step.dex,
                type: "swap",
                gasEstimate: step.gasEstimate,
                priceImpact: step.priceImpact,
                liquidityScore: 50,
              })),
              totalOutput: universalData.route.totalOutput,
              totalGas: universalData.route.totalGas,
              totalPriceImpact: universalData.route.totalPriceImpact,
              estimatedTime: "5-15 minutes",
              confidence: universalData.route.confidence,
            },
            alternatives: []
          });
        }
      }
    } catch (universalError) {
      console.warn("[Intelligent Routing] ⚠️ Universal routing failed:", universalError);
    }
    
    // Fallback: Try common intermediate tokens (including low-cap token specific routes)
    const intermediateTokens = [
      { symbol: "USDC", chains: [1, 56, 137, 42161, 10, 8453, 43114, 250] },
      { symbol: "USDT", chains: [1, 56, 137, 42161, 10, 43114, 250] },
      { symbol: "WETH", chains: [1, 42161, 10, 8453] },
      { symbol: "WBTC", chains: [1, 137, 42161] },
      // For BSC low-cap tokens like TWC, try BNB as intermediate
      { symbol: "BNB", chains: [56] },
      { symbol: "WBNB", chains: [56] },
    ];

    for (const intermediate of intermediateTokens) {
      if (intermediate.chains.includes(body.fromChain) && intermediate.chains.includes(body.toChain)) {
        console.log(`[Intelligent Routing] 🔄 Trying ${intermediate.symbol} as intermediate...`);
        
        // Step 1: Swap to intermediate token
        const step1Quote = await getMultiAggregatorQuote({
          fromChain: body.fromChain,
          toChain: body.fromChain,
          fromToken: body.fromToken,
          toToken: getTokenAddress(intermediate.symbol, body.fromChain),
          fromAmount: body.fromAmount,
          fromAddress: body.fromAddress,
          slippage: body.slippage || 0.5,
        });

        if (step1Quote.success) {
          // Step 2: Swap from intermediate to target
          const step2Quote = await getMultiAggregatorQuote({
            fromChain: body.toChain,
            toChain: body.toChain,
            fromToken: getTokenAddress(intermediate.symbol, body.toChain),
            toToken: body.toToken,
            fromAmount: step1Quote.data.toAmount,
            fromAddress: body.fromAddress,
            slippage: body.slippage || 0.5,
          });

          if (step2Quote.success) {
            return NextResponse.json({
              success: true,
              route: {
                steps: [
                  {
                    chainId: body.fromChain,
                    tokenIn: body.fromToken,
                    tokenOut: intermediate.symbol,
                    amountIn: body.fromAmount,
                    amountOut: step1Quote.data.toAmount,
                    provider: step1Quote.data.provider,
                    type: "swap",
                    gasEstimate: step1Quote.data.estimatedGas,
                    priceImpact: step1Quote.data.priceImpact || 0,
                    liquidityScore: step1Quote.data.liquidityScore || 50,
                  },
                  {
                    chainId: body.toChain,
                    tokenIn: intermediate.symbol,
                    tokenOut: body.toToken,
                    amountIn: step1Quote.data.toAmount,
                    amountOut: step2Quote.data.toAmount,
                    provider: step2Quote.data.provider,
                    type: "swap",
                    gasEstimate: step2Quote.data.estimatedGas,
                    priceImpact: step2Quote.data.priceImpact || 0,
                    liquidityScore: step2Quote.data.liquidityScore || 50,
                  }
                ],
                totalOutput: step2Quote.data.toAmount,
                totalGas: (BigInt(step1Quote.data.estimatedGas) + BigInt(step2Quote.data.estimatedGas)).toString(),
                totalPriceImpact: (step1Quote.data.priceImpact || 0) + (step2Quote.data.priceImpact || 0),
                estimatedTime: "3-8 minutes",
                confidence: 75,
              },
              alternatives: []
            });
          }
        }
      }
    }

    // Strategy 4: Bridge + swap combination
    console.log("[Intelligent Routing] 🌉 Attempting bridge + swap combination...");
    
    // Try bridging native tokens first, then swapping
    const nativeTokens = [
      { symbol: "ETH", chains: [1, 42161, 10, 8453] },
      { symbol: "BNB", chains: [56] },
      { symbol: "MATIC", chains: [137] },
      { symbol: "AVAX", chains: [43114] },
      { symbol: "FTM", chains: [250] },
    ];

    for (const native of nativeTokens) {
      if (native.chains.includes(body.fromChain) && native.chains.includes(body.toChain)) {
        console.log(`[Intelligent Routing] 🌉 Trying ${native.symbol} bridge...`);
        
        // This would require implementing bridge-specific logic
        // For now, return a placeholder response
        return NextResponse.json({
          success: true,
          route: {
            steps: [
              {
                chainId: body.fromChain,
                tokenIn: body.fromToken,
                tokenOut: native.symbol,
                amountIn: body.fromAmount,
                amountOut: "0", // Would need actual bridge calculation
                provider: "bridge",
                type: "bridge",
                gasEstimate: "200000",
                priceImpact: 0,
                liquidityScore: 90,
              }
            ],
            totalOutput: "0", // Would need actual calculation
            totalGas: "200000",
            totalPriceImpact: 0,
            estimatedTime: "10-30 minutes",
            confidence: 60,
          },
          alternatives: []
        });
      }
    }

    // No route found
    return NextResponse.json({
      success: false,
      error: "No viable route found for this token pair. The tokens may have insufficient liquidity or be incompatible.",
      alternatives: []
    });

  } catch (error) {
    console.error("[Intelligent Routing] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

// Helper function to get token addresses
function getTokenAddress(symbol: string, chainId: number): string {
  const tokenAddresses: { [key: string]: { [chainId: number]: string } } = {
    "USDC": {
      1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      250: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
    },
    "USDT": {
      1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      56: "0x55d398326f99059fF775485246999027B3197955",
      137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      43114: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
      250: "0x049d68029688eAbF473097a2fC38ef61633A3C7A",
    },
    "WETH": {
      1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      10: "0x4200000000000000000000000000000000000006",
      8453: "0x4200000000000000000000000000000000000006",
    },
    "WBTC": {
      1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      137: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
    },
    "BNB": {
      56: "0x0000000000000000000000000000000000000000", // Native BNB
    },
    "WBNB": {
      56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
    "TWC": {
      56: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", // Tiwicat Token on BSC
    },
    "TKC": {
      56: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", // TKC Token on BSC (same as TWC)
    }
  };

  return tokenAddresses[symbol]?.[chainId] || "0x0000000000000000000000000000000000000000";
}

// Helper function to detect low-cap tokens
function isLowCapTokenSwap(fromToken: string, toToken: string): boolean {
  const lowCapTokens = [
    "0x4B0F1812e5Df2A09796481Ff14017e6005508003", // TWC (Tiwi Token) / TKC Token
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933", // PEPE
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", // SHIB
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", // FLOKI
  ];
  
  return lowCapTokens.includes(fromToken) || lowCapTokens.includes(toToken);
}
