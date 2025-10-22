import { NextRequest, NextResponse } from "next/server";

/**
 * SushiSwap Aggregator API
 * Gets real quotes from SushiSwap using their public API
 * Supports multiple chains
 */

interface SushiSwapQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface SushiSwapQuoteResult {
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

// SushiSwap Router addresses
const SUSHI_ROUTERS: { [key: number]: string } = {
  1: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F", // Ethereum
  56: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // BSC
  137: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Polygon
  42161: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Arbitrum
  10: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Optimism
  250: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Fantom
  43114: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Avalanche
};

export async function POST(request: NextRequest) {
  try {
    const body: SushiSwapQuoteRequest = await request.json();
    
    console.log("[SushiSwap Quote] 🍣 Getting SushiSwap quote:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      chainId: body.chainId,
    });

    // Validate chain support
    if (!SUSHI_ROUTERS[body.chainId]) {
      return NextResponse.json({
        success: false,
        error: `SushiSwap does not support chain ${body.chainId}`
      }, { status: 400 });
    }

    // Get SushiSwap quote
    const quote = await getSushiSwapQuote(body);
    
    if (quote) {
      return NextResponse.json({
        success: true,
        quote
      });
    }

    return NextResponse.json({
      success: false,
      error: "No SushiSwap quote available for this token pair"
    });

  } catch (error) {
    console.error("[SushiSwap Quote] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getSushiSwapQuote(request: SushiSwapQuoteRequest): Promise<any> {
  try {
    console.log("[SushiSwap Quote] 🍣 Getting quote from SushiSwap...");
    
    // SushiSwap API endpoints
    const baseUrl = "https://api.sushi.com";
    
    // Get quote
    const quoteUrl = `${baseUrl}/swap/v1/quote?chainId=${request.chainId}&tokenIn=${request.fromToken}&tokenOut=${request.toToken}&amount=${request.fromAmount}&slippagePercentage=${request.slippage || 1}`;
    
    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!quoteResponse.ok) {
      console.log("[SushiSwap Quote] ❌ Quote API failed:", quoteResponse.status);
      return null;
    }

    const quoteData = await quoteResponse.json();
    console.log("[SushiSwap Quote] 📊 Got quote data:", quoteData);

    // Get swap data
    const swapUrl = `${baseUrl}/swap/v1/swap?chainId=${request.chainId}&tokenIn=${request.fromToken}&tokenOut=${request.toToken}&amount=${request.fromAmount}&slippagePercentage=${request.slippage || 1}&recipient=${request.fromAddress}`;
    
    const swapResponse = await fetch(swapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!swapResponse.ok) {
      console.log("[SushiSwap Quote] ❌ Swap API failed:", swapResponse.status);
      return null;
    }

    const swapData = await swapResponse.json();
    console.log("[SushiSwap Quote] 🔄 Got swap data:", swapData);

    // Extract path from route
    const path: string[] = [];
    if (swapData.route && swapData.route.length > 0) {
      swapData.route.forEach((token: any) => {
        if (token.address) path.push(token.address);
      });
    }

    // Remove duplicates and ensure proper order
    const uniquePath = [...new Set(path)];
    if (uniquePath.length === 0) {
      uniquePath.push(request.fromToken, request.toToken);
    }

    return {
      dex: "SushiSwap",
      routerAddress: SUSHI_ROUTERS[request.chainId],
      path: uniquePath,
      expectedOutput: quoteData.amountOut,
      priceImpact: parseFloat(quoteData.priceImpact || "0"),
      gasEstimate: swapData.gas,
      transactionData: {
        to: swapData.to,
        data: swapData.data,
        value: swapData.value || "0",
      },
      method: swapData.data.substring(0, 10),
      minimumReceived: quoteData.minimumAmountOut || quoteData.amountOut,
      priceImpactPercentage: quoteData.priceImpact || "0",
      executionPrice: quoteData.price || "0",
    };
    
  } catch (error) {
    console.log("[SushiSwap Quote] Quote failed:", error);
    return null;
  }
}
