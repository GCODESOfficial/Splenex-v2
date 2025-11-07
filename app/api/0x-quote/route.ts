import { NextRequest, NextResponse } from "next/server";

/**
 * 0x Protocol Aggregator API
 * Gets real quotes from 0x Protocol using their public API
 * Supports multiple chains and DEXs
 */

interface ZeroXQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface ZeroXQuoteResult {
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

// Chain ID mappings for 0x
const ZEROX_CHAIN_MAP: { [key: number]: string } = {
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
    const body: ZeroXQuoteRequest = await request.json();
    
    console.log("[0x Quote] ⚡ Getting 0x quote:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      chainId: body.chainId,
    });

    // Validate chain support
    const chainName = ZEROX_CHAIN_MAP[body.chainId];
    if (!chainName) {
      return NextResponse.json({
        success: false,
        error: `0x Protocol does not support chain ${body.chainId}`
      }, { status: 400 });
    }

    // Get 0x quote
    const quote = await getZeroXQuote(body, chainName);
    
    if (quote) {
      return NextResponse.json({
        success: true,
        quote
      });
    }

    return NextResponse.json({
      success: false,
      error: "No 0x quote available for this token pair"
    });

  } catch (error) {
    console.error("[0x Quote] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getZeroXQuote(request: ZeroXQuoteRequest, chainName: string): Promise<any> {
  try {
    console.log("[0x Quote] ⚡ Getting quote from 0x API...");
    
    // 0x API endpoints
    const baseUrl = `https://${chainName}.api.0x.org/swap/v1`;
    
    // Get quote
    const quoteUrl = `${baseUrl}/quote?sellToken=${request.fromToken}&buyToken=${request.toToken}&sellAmount=${request.fromAmount}&slippagePercentage=${(request.slippage || 1) / 100}`;
    
    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!quoteResponse.ok) {
      console.log("[0x Quote] ❌ Quote API failed:", quoteResponse.status);
      return null;
    }

    const quoteData = await quoteResponse.json();
    console.log("[0x Quote] 📊 Got quote data:", quoteData);

    // Get swap data
    const swapUrl = `${baseUrl}/swap?sellToken=${request.fromToken}&buyToken=${request.toToken}&sellAmount=${request.fromAmount}&slippagePercentage=${(request.slippage || 1) / 100}&takerAddress=${request.fromAddress}`;
    
    const swapResponse = await fetch(swapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!swapResponse.ok) {
      console.log("[0x Quote] ❌ Swap API failed:", swapResponse.status);
      return null;
    }

    const swapData = await swapResponse.json();
    console.log("[0x Quote] 🔄 Got swap data:", swapData);

    // Extract path from orders
    const path: string[] = [];
    if (swapData.orders && swapData.orders.length > 0) {
      swapData.orders.forEach((order: any) => {
        if (order.makerToken) path.push(order.makerToken);
        if (order.takerToken) path.push(order.takerToken);
      });
    }

    // Remove duplicates and ensure proper order
    const uniquePath = [...new Set(path)];
    if (uniquePath.length === 0) {
      uniquePath.push(request.fromToken, request.toToken);
    }

    return {
      dex: "0x Protocol",
      routerAddress: swapData.to,
      path: uniquePath,
      expectedOutput: quoteData.buyAmount,
      priceImpact: parseFloat(quoteData.priceImpact || "0"),
      gasEstimate: swapData.gas,
      transactionData: {
        to: swapData.to,
        data: swapData.data,
        value: swapData.value || "0",
      },
      method: swapData.data.substring(0, 10),
      minimumReceived: quoteData.minimumProtocolFee || quoteData.buyAmount,
      priceImpactPercentage: quoteData.priceImpact || "0",
      executionPrice: quoteData.price || "0",
    };
    
  } catch (error) {
    console.log("[0x Quote] Quote failed:", error);
    return null;
  }
}