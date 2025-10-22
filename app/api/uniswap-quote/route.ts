import { NextRequest, NextResponse } from "next/server";

/**
 * Uniswap V3 Aggregator API
 * Gets real quotes from Uniswap V3 using their subgraph API
 * Supports Ethereum mainnet primarily
 */

interface UniswapQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface UniswapQuoteResult {
  success: boolean;
  quote?: {
    dex: string;
    routerAddress: string;
    path: string[];
    expectedOutput: string;
    priceImpact: number;
    gasEstimate: string;
    transactionData: {
      to: string;
      data: string;
      value: string;
    };
    method: string;
    minimumReceived: string;
    priceImpactPercentage: string;
    executionPrice: string;
  };
  error?: string;
}

// Uniswap V3 Router addresses
const UNISWAP_ROUTERS: { [key: number]: string } = {
  1: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Ethereum
  42161: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Arbitrum
  10: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Optimism
  137: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Polygon
};

export async function POST(request: NextRequest) {
  try {
    const body: UniswapQuoteRequest = await request.json();
    
    console.log("[Uniswap Quote] 🦄 Getting Uniswap V3 quote:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      chainId: body.chainId,
    });

    // Validate chain support
    if (!UNISWAP_ROUTERS[body.chainId]) {
      return NextResponse.json({
        success: false,
        error: `Uniswap V3 does not support chain ${body.chainId}`
      }, { status: 400 });
    }

    // Get Uniswap quote
    const quote = await getUniswapQuote(body);
    
    if (quote) {
      return NextResponse.json({
        success: true,
        quote
      });
    }

    return NextResponse.json({
      success: false,
      error: "No Uniswap V3 quote available for this token pair"
    });

  } catch (error) {
    console.error("[Uniswap Quote] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getUniswapQuote(request: UniswapQuoteRequest): Promise<any> {
  try {
    console.log("[Uniswap Quote] 🦄 Getting quote from Uniswap V3...");
    
    // Uniswap V3 subgraph endpoints
    const subgraphUrls: { [key: number]: string } = {
      1: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
      42161: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-v3",
      10: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-optimism-v3",
      137: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-polygon-v3",
    };

    const subgraphUrl = subgraphUrls[request.chainId];
    if (!subgraphUrl) {
      return null;
    }

    // Query for token pair and pool data
    const query = `
      query GetTokenPair($token0: String!, $token1: String!) {
        token0: token(id: $token0) {
          id
          symbol
          decimals
        }
        token1: token(id: $token1) {
          id
          symbol
          decimals
        }
        pools(
          where: {
            token0: $token0,
            token1: $token1,
            liquidity_gt: "0"
          },
          orderBy: liquidity,
          orderDirection: desc,
          first: 1
        ) {
          id
          liquidity
          token0Price
          token1Price
          feeTier
        }
      }
    `;

    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          token0: request.fromToken.toLowerCase(),
          token1: request.toToken.toLowerCase(),
        }
      })
    });

    if (!response.ok) {
      console.log("[Uniswap Quote] ❌ Subgraph API failed:", response.status);
      return null;
    }

    const data = await response.json();
    console.log("[Uniswap Quote] 📊 Got subgraph data:", data);

    if (!data.data || !data.data.pools || data.data.pools.length === 0) {
      return null;
    }

    const pool = data.data.pools[0];
    const token0 = data.data.token0;
    const token1 = data.data.token1;

    // Calculate expected output based on pool price
    const fromAmount = parseFloat(request.fromAmount);
    let expectedOutput: string;
    let executionPrice: string;

    if (request.fromToken.toLowerCase() === token0.id) {
      // Selling token0 for token1
      executionPrice = pool.token1Price;
      expectedOutput = (fromAmount * parseFloat(pool.token1Price)).toString();
    } else {
      // Selling token1 for token0
      executionPrice = pool.token0Price;
      expectedOutput = (fromAmount * parseFloat(pool.token0Price)).toString();
    }

    // Calculate price impact (simplified)
    const priceImpact = calculatePriceImpact(fromAmount, parseFloat(pool.liquidity));

    return {
      dex: "Uniswap V3",
      routerAddress: UNISWAP_ROUTERS[request.chainId],
      path: [request.fromToken, request.toToken],
      expectedOutput: expectedOutput,
      priceImpact: priceImpact,
      gasEstimate: "200000", // Estimated gas for Uniswap V3 swap
      transactionData: {
        to: UNISWAP_ROUTERS[request.chainId],
        data: generateUniswapTransactionData(request),
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      },
      method: "0x414bf389", // exactInputSingle
      minimumReceived: (parseFloat(expectedOutput) * 0.95).toString(), // 5% slippage
      priceImpactPercentage: priceImpact.toString(),
      executionPrice: executionPrice,
    };
    
  } catch (error) {
    console.log("[Uniswap Quote] Quote failed:", error);
    return null;
  }
}

function calculatePriceImpact(amount: number, liquidity: number): number {
  // Simplified price impact calculation
  // In reality, this would be more complex based on Uniswap V3's concentrated liquidity
  const impact = (amount / liquidity) * 100;
  return Math.min(impact, 10); // Cap at 10%
}

function generateUniswapTransactionData(request: UniswapQuoteRequest): string {
  // Simplified transaction data generation
  // In production, this would properly encode the exactInputSingle function call
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
  return `0x414bf389${request.fromAmount}${request.toToken}${request.fromAddress}${deadline}`;
}
