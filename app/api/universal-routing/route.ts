import { NextRequest, NextResponse } from "next/server";

/**
 * Universal Multi-Hop Routing API
 * Handles ANY token pair by finding optimal multi-hop routes
 * Uses intelligent pathfinding to connect any two tokens
 */

interface MultiHopRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
  maxHops?: number;
}

interface MultiHopResult {
  success: boolean;
  route?: {
    steps: Array<{
      step: number;
      fromToken: string;
      toToken: string;
      dex: string;
      routerAddress: string;
      amountIn: string;
      amountOut: string;
      priceImpact: number;
      gasEstimate: string;
    }>;
    totalOutput: string;
    totalGas: string;
    totalPriceImpact: number;
    totalHops: number;
    confidence: number;
  };
  error?: string;
}

// Universal token mapping for all chains
const UNIVERSAL_TOKENS = {
  // Major stablecoins (available on most chains)
  USDT: {
    1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    56: "0x55d398326f99059fF775485246999027B3197955",
    137: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    42161: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    10: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    43114: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    250: "0x049d68029688eAbF473097a2fC38ef61633A3C7A",
  },
  USDC: {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    56: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    10: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    250: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
  },
  DAI: {
    1: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    137: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    42161: "0xDA10009cB5D20bABcd1C3c3c5B95B4B2D18F0F8e",
    10: "0xDA10009cB5D20bABcd1C3c3c5B95B4B2D18F0F8e",
  },
  
  // Native tokens and their wrapped versions
  ETH: {
    1: "0x0000000000000000000000000000000000000000",
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    10: "0x4200000000000000000000000000000000000006",
    8453: "0x4200000000000000000000000000000000000006",
  },
  WETH: {
    1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    42161: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    10: "0x4200000000000000000000000000000000000006",
    8453: "0x4200000000000000000000000000000000000006",
  },
  BNB: {
    56: "0x0000000000000000000000000000000000000000",
  },
  WBNB: {
    56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  },
  MATIC: {
    137: "0x0000000000000000000000000000000000000000",
  },
  WMATIC: {
    137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
  },
  AVAX: {
    43114: "0x0000000000000000000000000000000000000000",
  },
  WAVAX: {
    43114: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
  },
  FTM: {
    250: "0x0000000000000000000000000000000000000000",
  },
  WFTM: {
    250: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
  },
  
  // Major cryptocurrencies
  WBTC: {
    1: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    137: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    42161: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  },
  
  // Low-cap tokens
  TWC: {
    56: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
  },
  TKC: {
    56: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", // Same as TWC
  },
  PEPE: {
    1: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
  },
  SHIB: {
    1: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
  },
  FLOKI: {
    1: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E",
  },
};

// DEX configurations for each chain
const CHAIN_DEXES = {
  56: ["pancakeSwapV2", "apeswap", "biswap", "mdex"],
  1: ["uniswapV2", "sushiswap", "shibaswap"],
  137: ["quickswap", "sushiswap"],
  42161: ["sushiswap", "uniswapV3"],
  10: ["uniswapV3", "sushiswap"],
  43114: ["traderjoe", "pangolin"],
  250: ["spiritswap", "spookyswap"],
};

export async function POST(request: NextRequest) {
  try {
    const body: MultiHopRequest = await request.json();
    
    console.log("[Multi-Hop Routing] 🔀 Processing multi-hop swap:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      chainId: body.chainId,
      maxHops: body.maxHops || 3,
    });

    // Find optimal multi-hop route
    const route = await findOptimalRoute(body);
    
    if (route) {
      return NextResponse.json({
        success: true,
        route
      });
    }

    return NextResponse.json({
      success: false,
      error: "No multi-hop route found for this token pair"
    });

  } catch (error) {
    console.error("[Multi-Hop Routing] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
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
    // Try direct swap using direct DEX routing
    const directResponse = await fetch("/api/direct-dex-routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (directResponse.ok) {
      const directData = await directResponse.json();
      if (directData.success) {
        return {
          steps: [{
            step: 1,
            fromToken: request.fromToken,
            toToken: request.toToken,
            dex: directData.route.dex,
            routerAddress: directData.route.routerAddress,
            amountIn: request.fromAmount,
            amountOut: directData.route.expectedOutput,
            priceImpact: directData.route.priceImpact,
            gasEstimate: directData.route.gasEstimate,
          }],
          totalOutput: directData.route.expectedOutput,
          totalGas: directData.route.gasEstimate,
          totalPriceImpact: directData.route.priceImpact,
          totalHops: 1,
          confidence: 95,
        };
      }
    }
  } catch (error) {
    console.log("[Multi-Hop Routing] Direct swap failed:", error);
  }
  
  return null;
}

async function attemptTwoHopRoute(request: MultiHopRequest): Promise<any> {
  const intermediateTokens = getIntermediateTokens(request.chainId);
  
  for (const intermediate of intermediateTokens) {
    try {
      console.log(`[Multi-Hop Routing] 🔄 Trying ${intermediate.symbol} as intermediate...`);
      
      // Step 1: fromToken -> intermediate
      const step1 = await attemptDirectSwap({
        ...request,
        toToken: intermediate.address,
      });
      
      if (step1) {
        // Step 2: intermediate -> toToken
        const step2 = await attemptDirectSwap({
          ...request,
          fromToken: intermediate.address,
          fromAmount: step1.totalOutput,
        });
        
        if (step2) {
          return {
            steps: [
              {
                step: 1,
                fromToken: request.fromToken,
                toToken: intermediate.address,
                dex: step1.steps[0].dex,
                routerAddress: step1.steps[0].routerAddress,
                amountIn: request.fromAmount,
                amountOut: step1.totalOutput,
                priceImpact: step1.steps[0].priceImpact,
                gasEstimate: step1.steps[0].gasEstimate,
              },
              {
                step: 2,
                fromToken: intermediate.address,
                toToken: request.toToken,
                dex: step2.steps[0].dex,
                routerAddress: step2.steps[0].routerAddress,
                amountIn: step1.totalOutput,
                amountOut: step2.totalOutput,
                priceImpact: step2.steps[0].priceImpact,
                gasEstimate: step2.steps[0].gasEstimate,
              }
            ],
            totalOutput: step2.totalOutput,
            totalGas: (parseInt(step1.totalGas) + parseInt(step2.totalGas)).toString(),
            totalPriceImpact: step1.totalPriceImpact + step2.totalPriceImpact,
            totalHops: 2,
            confidence: 85,
          };
        }
      }
    } catch (error) {
      console.log(`[Multi-Hop Routing] 2-hop via ${intermediate.symbol} failed:`, error);
      continue;
    }
  }
  
  return null;
}

async function attemptThreeHopRoute(request: MultiHopRequest): Promise<any> {
  const intermediateTokens = getIntermediateTokens(request.chainId);
  
  for (const intermediate1 of intermediateTokens) {
    for (const intermediate2 of intermediateTokens) {
      if (intermediate1.address === intermediate2.address) continue;
      
      try {
        console.log(`[Multi-Hop Routing] 🔀 Trying ${intermediate1.symbol} -> ${intermediate2.symbol}...`);
        
        // Step 1: fromToken -> intermediate1
        const step1 = await attemptDirectSwap({
          ...request,
          toToken: intermediate1.address,
        });
        
        if (step1) {
          // Step 2: intermediate1 -> intermediate2
          const step2 = await attemptDirectSwap({
            ...request,
            fromToken: intermediate1.address,
            toToken: intermediate2.address,
            fromAmount: step1.totalOutput,
          });
          
          if (step2) {
            // Step 3: intermediate2 -> toToken
            const step3 = await attemptDirectSwap({
              ...request,
              fromToken: intermediate2.address,
              fromAmount: step2.totalOutput,
            });
            
            if (step3) {
              return {
                steps: [
                  {
                    step: 1,
                    fromToken: request.fromToken,
                    toToken: intermediate1.address,
                    dex: step1.steps[0].dex,
                    routerAddress: step1.steps[0].routerAddress,
                    amountIn: request.fromAmount,
                    amountOut: step1.totalOutput,
                    priceImpact: step1.steps[0].priceImpact,
                    gasEstimate: step1.steps[0].gasEstimate,
                  },
                  {
                    step: 2,
                    fromToken: intermediate1.address,
                    toToken: intermediate2.address,
                    dex: step2.steps[0].dex,
                    routerAddress: step2.steps[0].routerAddress,
                    amountIn: step1.totalOutput,
                    amountOut: step2.totalOutput,
                    priceImpact: step2.steps[0].priceImpact,
                    gasEstimate: step2.steps[0].gasEstimate,
                  },
                  {
                    step: 3,
                    fromToken: intermediate2.address,
                    toToken: request.toToken,
                    dex: step3.steps[0].dex,
                    routerAddress: step3.steps[0].routerAddress,
                    amountIn: step2.totalOutput,
                    amountOut: step3.totalOutput,
                    priceImpact: step3.steps[0].priceImpact,
                    gasEstimate: step3.steps[0].gasEstimate,
                  }
                ],
                totalOutput: step3.totalOutput,
                totalGas: (parseInt(step1.totalGas) + parseInt(step2.totalGas) + parseInt(step3.totalGas)).toString(),
                totalPriceImpact: step1.totalPriceImpact + step2.totalPriceImpact + step3.totalPriceImpact,
                totalHops: 3,
                confidence: 75,
              };
            }
          }
        }
      } catch (error) {
        console.log(`[Multi-Hop Routing] 3-hop via ${intermediate1.symbol} -> ${intermediate2.symbol} failed:`, error);
        continue;
      }
    }
  }
  
  return null;
}

async function attemptStablecoinRoute(request: MultiHopRequest): Promise<any> {
  const stablecoins = ["USDT", "USDC", "DAI"];
  
  for (const stablecoin of stablecoins) {
    const stablecoinAddress = UNIVERSAL_TOKENS[stablecoin as keyof typeof UNIVERSAL_TOKENS]?.[request.chainId];
    if (!stablecoinAddress) continue;
    
    try {
      console.log(`[Multi-Hop Routing] 💰 Trying stablecoin route via ${stablecoin}...`);
      
      const route = await attemptTwoHopRoute({
        ...request,
        toToken: stablecoinAddress,
      });
      
      if (route) {
        // Now try to go from stablecoin to final token
        const finalRoute = await attemptDirectSwap({
          ...request,
          fromToken: stablecoinAddress,
          fromAmount: route.totalOutput,
        });
        
        if (finalRoute) {
          return {
            steps: [
              ...route.steps,
              {
                step: route.steps.length + 1,
                fromToken: stablecoinAddress,
                toToken: request.toToken,
                dex: finalRoute.steps[0].dex,
                routerAddress: finalRoute.steps[0].routerAddress,
                amountIn: route.totalOutput,
                amountOut: finalRoute.totalOutput,
                priceImpact: finalRoute.steps[0].priceImpact,
                gasEstimate: finalRoute.steps[0].gasEstimate,
              }
            ],
            totalOutput: finalRoute.totalOutput,
            totalGas: (parseInt(route.totalGas) + parseInt(finalRoute.totalGas)).toString(),
            totalPriceImpact: route.totalPriceImpact + finalRoute.totalPriceImpact,
            totalHops: route.totalHops + 1,
            confidence: 80,
          };
        }
      }
    } catch (error) {
      console.log(`[Multi-Hop Routing] Stablecoin route via ${stablecoin} failed:`, error);
      continue;
    }
  }
  
  return null;
}

async function attemptNativeTokenRoute(request: MultiHopRequest): Promise<any> {
  const nativeTokens = getNativeTokens(request.chainId);
  
  for (const native of nativeTokens) {
    try {
      console.log(`[Multi-Hop Routing] 🌟 Trying native token route via ${native.symbol}...`);
      
      const route = await attemptTwoHopRoute({
        ...request,
        toToken: native.address,
      });
      
      if (route) {
        const finalRoute = await attemptDirectSwap({
          ...request,
          fromToken: native.address,
          fromAmount: route.totalOutput,
        });
        
        if (finalRoute) {
          return {
            steps: [
              ...route.steps,
              {
                step: route.steps.length + 1,
                fromToken: native.address,
                toToken: request.toToken,
                dex: finalRoute.steps[0].dex,
                routerAddress: finalRoute.steps[0].routerAddress,
                amountIn: route.totalOutput,
                amountOut: finalRoute.totalOutput,
                priceImpact: finalRoute.steps[0].priceImpact,
                gasEstimate: finalRoute.steps[0].gasEstimate,
              }
            ],
            totalOutput: finalRoute.totalOutput,
            totalGas: (parseInt(route.totalGas) + parseInt(finalRoute.totalGas)).toString(),
            totalPriceImpact: route.totalPriceImpact + finalRoute.totalPriceImpact,
            totalHops: route.totalHops + 1,
            confidence: 70,
          };
        }
      }
    } catch (error) {
      console.log(`[Multi-Hop Routing] Native token route via ${native.symbol} failed:`, error);
      continue;
    }
  }
  
  return null;
}

function getIntermediateTokens(chainId: number): Array<{symbol: string, address: string}> {
  const tokens = [];
  
  // Add stablecoins
  if (UNIVERSAL_TOKENS.USDT[chainId]) tokens.push({symbol: "USDT", address: UNIVERSAL_TOKENS.USDT[chainId]});
  if (UNIVERSAL_TOKENS.USDC[chainId]) tokens.push({symbol: "USDC", address: UNIVERSAL_TOKENS.USDC[chainId]});
  if (UNIVERSAL_TOKENS.DAI[chainId]) tokens.push({symbol: "DAI", address: UNIVERSAL_TOKENS.DAI[chainId]});
  
  // Add native tokens
  if (UNIVERSAL_TOKENS.ETH[chainId]) tokens.push({symbol: "ETH", address: UNIVERSAL_TOKENS.ETH[chainId]});
  if (UNIVERSAL_TOKENS.WETH[chainId]) tokens.push({symbol: "WETH", address: UNIVERSAL_TOKENS.WETH[chainId]});
  if (UNIVERSAL_TOKENS.BNB[chainId]) tokens.push({symbol: "BNB", address: UNIVERSAL_TOKENS.BNB[chainId]});
  if (UNIVERSAL_TOKENS.WBNB[chainId]) tokens.push({symbol: "WBNB", address: UNIVERSAL_TOKENS.WBNB[chainId]});
  if (UNIVERSAL_TOKENS.MATIC[chainId]) tokens.push({symbol: "MATIC", address: UNIVERSAL_TOKENS.MATIC[chainId]});
  if (UNIVERSAL_TOKENS.WMATIC[chainId]) tokens.push({symbol: "WMATIC", address: UNIVERSAL_TOKENS.WMATIC[chainId]});
  if (UNIVERSAL_TOKENS.AVAX[chainId]) tokens.push({symbol: "AVAX", address: UNIVERSAL_TOKENS.AVAX[chainId]});
  if (UNIVERSAL_TOKENS.WAVAX[chainId]) tokens.push({symbol: "WAVAX", address: UNIVERSAL_TOKENS.WAVAX[chainId]});
  if (UNIVERSAL_TOKENS.FTM[chainId]) tokens.push({symbol: "FTM", address: UNIVERSAL_TOKENS.FTM[chainId]});
  if (UNIVERSAL_TOKENS.WFTM[chainId]) tokens.push({symbol: "WFTM", address: UNIVERSAL_TOKENS.WFTM[chainId]});
  
  // Add major cryptocurrencies
  if (UNIVERSAL_TOKENS.WBTC[chainId]) tokens.push({symbol: "WBTC", address: UNIVERSAL_TOKENS.WBTC[chainId]});
  
  return tokens;
}

function getNativeTokens(chainId: number): Array<{symbol: string, address: string}> {
  const tokens = [];
  
  if (UNIVERSAL_TOKENS.ETH[chainId]) tokens.push({symbol: "ETH", address: UNIVERSAL_TOKENS.ETH[chainId]});
  if (UNIVERSAL_TOKENS.BNB[chainId]) tokens.push({symbol: "BNB", address: UNIVERSAL_TOKENS.BNB[chainId]});
  if (UNIVERSAL_TOKENS.MATIC[chainId]) tokens.push({symbol: "MATIC", address: UNIVERSAL_TOKENS.MATIC[chainId]});
  if (UNIVERSAL_TOKENS.AVAX[chainId]) tokens.push({symbol: "AVAX", address: UNIVERSAL_TOKENS.AVAX[chainId]});
  if (UNIVERSAL_TOKENS.FTM[chainId]) tokens.push({symbol: "FTM", address: UNIVERSAL_TOKENS.FTM[chainId]});
  
  return tokens;
}
