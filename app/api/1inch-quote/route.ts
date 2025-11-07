import { NextRequest, NextResponse } from "next/server";

/**
 * 1inch Aggregator API
 * Gets real quotes from 1inch using their public API
 * Supports multiple chains including Ethereum, BSC, Polygon, etc.
 */

interface OneInchQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface OneInchQuoteResult {
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

// Chain ID mappings for 1inch
const ONEINCH_CHAIN_MAP: { [key: number]: string } = {
  1: "eth", // Ethereum
  56: "bsc", // BSC
  137: "matic", // Polygon
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
    const body: OneInchQuoteRequest = await request.json();
    
    console.log("[1inch Quote] 🔥 Getting 1inch quote:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
      chainId: body.chainId,
    });

    // Validate chain support
    const chainName = ONEINCH_CHAIN_MAP[body.chainId];
    if (!chainName) {
      return NextResponse.json({
        success: false,
        error: `1inch does not support chain ${body.chainId}`
      }, { status: 400 });
    }

    // Get 1inch quote
    const quote = await getOneInchQuote(body, chainName);
    
    if (quote) {
      return NextResponse.json({
        success: true,
        quote
      });
    }

    return NextResponse.json({
      success: false,
      error: "No 1inch quote available for this token pair"
    });

  } catch (error) {
    console.error("[1inch Quote] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getOneInchQuote(request: OneInchQuoteRequest, chainName: string): Promise<any> {
  try {
    console.log("[1inch Quote] 🔥 Getting quote from 1inch API...");
    
    // 1inch API endpoints
    const baseUrl = `https://api.1inch.io/v5.2/${chainName}`;
    
    // Get quote
    const quoteUrl = `${baseUrl}/quote?fromTokenAddress=${request.fromToken}&toTokenAddress=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 1}`;
    
    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!quoteResponse.ok) {
      console.log("[1inch Quote] ❌ Quote API failed:", quoteResponse.status);
      return null;
    }

    const quoteData = await quoteResponse.json();
    console.log("[1inch Quote] 📊 Got quote data:", quoteData);

    // Get swap data
    const swapUrl = `${baseUrl}/swap?fromTokenAddress=${request.fromToken}&toTokenAddress=${request.toToken}&amount=${request.fromAmount}&fromAddress=${request.fromAddress}&slippage=${request.slippage || 1}`;
    
    const swapResponse = await fetch(swapUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0'
      }
    });

    if (!swapResponse.ok) {
      console.log("[1inch Quote] ❌ Swap API failed:", swapResponse.status);
      return null;
    }

    const swapData = await swapResponse.json();
    console.log("[1inch Quote] 🔄 Got swap data:", swapData);

    // Extract path from protocols
    const path: string[] = [];
    if (swapData.protocols && swapData.protocols.length > 0) {
      swapData.protocols.forEach((protocol: any) => {
        protocol.forEach((step: any) => {
          if (step.fromTokenAddress) path.push(step.fromTokenAddress);
          if (step.toTokenAddress) path.push(step.toTokenAddress);
        });
      });
    }

    // Remove duplicates and ensure proper order
    const uniquePath = [...new Set(path)];
    if (uniquePath.length === 0) {
      uniquePath.push(request.fromToken, request.toToken);
    }

    return {
      dex: "1inch",
      routerAddress: swapData.tx.to,
      path: uniquePath,
      expectedOutput: quoteData.toAmount,
      priceImpact: parseFloat(quoteData.priceImpact || "0"),
      gasEstimate: swapData.tx.gas,
      transactionData: {
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value || "0",
      },
      method: swapData.tx.data.substring(0, 10),
      minimumReceived: quoteData.toAmountMin || quoteData.toAmount,
      priceImpactPercentage: quoteData.priceImpact || "0",
      executionPrice: quoteData.executionPrice || "0",
    };
    
  } catch (error) {
    console.log("[1inch Quote] Quote failed:", error);
    return null;
  }
}