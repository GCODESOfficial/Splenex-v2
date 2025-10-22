import { NextRequest, NextResponse } from "next/server";

/**
 * ParaSwap Aggregator API
 * Gets real quotes from ParaSwap using their public API
 * Supports multiple chains and DEXs
 */

interface ParaSwapQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface ParaSwapQuoteResult {
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

// Chain ID mappings for ParaSwap
const PARASWAP_CHAIN_MAP: { [key: number]: string } = {
  1: "ethereum", // Ethereum
  56: "bsc", // BSC
  137: "polygon", // Polygon
  42161: "arbitrum", // Arbitrum
  10: "optimism", // Optimism
  250: "fantom", // Fantom
  43114: "avalanche", // Avalanche
  25: "cronos", // Cronos
  100: "gnosis", // Gnosis
  1284: "moonbeam", // Moonbeam
};

export async function POST(request: NextRequest) {
  try {
    const body: ParaSwapQuoteRequest = await request.json();
    
    console.log("[ParaSwap Quote] 🦄 Getting ParaSwap quote:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      chainId: body.chainId,
    });

    // Validate chain support
    const chainName = PARASWAP_CHAIN_MAP[body.chainId];
    if (!chainName) {
      return NextResponse.json({
        success: false,
        error: `ParaSwap does not support chain ${body.chainId}`
      }, { status: 400 });
    }

    // Get ParaSwap quote
    const quote = await getParaSwapQuote(body, chainName);
    
    if (quote) {
      return NextResponse.json({
        success: true,
        quote
      });
    }

    return NextResponse.json({
      success: false,
      error: "No ParaSwap quote available for this token pair"
    });

  } catch (error) {
    console.error("[ParaSwap Quote] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getParaSwapQuote(request: ParaSwapQuoteRequest, chainName: string): Promise<any> {
  try {
    console.log("[ParaSwap Quote] 🦄 Getting quote from ParaSwap API...");
    
    // ParaSwap API endpoints
    const baseUrl = `https://apiv5.paraswap.io`;
    
    // Get quote
    const quoteUrl = `${baseUrl}/prices/?srcToken=${request.fromToken}&destToken=${request.toToken}&amount=${request.fromAmount}&srcDecimals=18&destDecimals=18&side=SELL&network=${request.chainId}`;
    
    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!quoteResponse.ok) {
      console.log("[ParaSwap Quote] ❌ Quote API failed:", quoteResponse.status);
      return null;
    }

    const quoteData = await quoteResponse.json();
    console.log("[ParaSwap Quote] 📊 Got quote data:", quoteData);

    if (!quoteData.priceRoute) {
      return null;
    }

    // Get swap data
    const swapUrl = `${baseUrl}/transactions/${request.chainId}?srcToken=${request.fromToken}&destToken=${request.toToken}&amount=${request.fromAmount}&srcDecimals=18&destDecimals=18&side=SELL&userAddress=${request.fromAddress}&slippage=${request.slippage || 1}`;
    
    const swapResponse = await fetch(swapUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      },
      body: JSON.stringify({
        priceRoute: quoteData.priceRoute
      })
    });

    if (!swapResponse.ok) {
      console.log("[ParaSwap Quote] ❌ Swap API failed:", swapResponse.status);
      return null;
    }

    const swapData = await swapResponse.json();
    console.log("[ParaSwap Quote] 🔄 Got swap data:", swapData);

    // Extract path from price route
    const path: string[] = [];
    if (quoteData.priceRoute.bestRoute && quoteData.priceRoute.bestRoute.length > 0) {
      quoteData.priceRoute.bestRoute.forEach((route: any) => {
        if (route.swaps && route.swaps.length > 0) {
          route.swaps.forEach((swap: any) => {
            if (swap.srcToken) path.push(swap.srcToken);
            if (swap.destToken) path.push(swap.destToken);
          });
        }
      });
    }

    // Remove duplicates and ensure proper order
    const uniquePath = [...new Set(path)];
    if (uniquePath.length === 0) {
      uniquePath.push(request.fromToken, request.toToken);
    }

    return {
      dex: "ParaSwap",
      routerAddress: swapData.to,
      path: uniquePath,
      expectedOutput: quoteData.priceRoute.destAmount,
      priceImpact: parseFloat(quoteData.priceRoute.priceImpact || "0"),
      gasEstimate: swapData.gas,
      transactionData: {
        to: swapData.to,
        data: swapData.data,
        value: swapData.value || "0",
      },
      method: swapData.data.substring(0, 10),
      minimumReceived: quoteData.priceRoute.destAmount,
      priceImpactPercentage: quoteData.priceRoute.priceImpact || "0",
      executionPrice: quoteData.priceRoute.price || "0",
    };
    
  } catch (error) {
    console.log("[ParaSwap Quote] Quote failed:", error);
    return null;
  }
}
