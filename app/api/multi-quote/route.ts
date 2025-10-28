import { NextRequest, NextResponse } from "next/server";
import { getMultiAggregatorQuote } from "@/lib/aggregator-quotes";

/**
 * Enhanced Multi-Aggregator Quote API
 * Tries comprehensive DEX aggregators including Solana, Cosmos, and chain-specific ones
 * Returns the best quote across all providers with maximum token coverage
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const fromChain = parseInt(searchParams.get("fromChain") || "0");
    const toChain = parseInt(searchParams.get("toChain") || "0");
    const fromToken = searchParams.get("fromToken") || "";
    const toToken = searchParams.get("toToken") || "";
    const fromAmount = searchParams.get("fromAmount") || "";
    const fromAddress = searchParams.get("fromAddress") || "";
    const toAddress = searchParams.get("toAddress") || undefined;
    const slippage = parseFloat(searchParams.get("slippage") || "0.5");

    // Validation
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }

    if (fromAmount === "0" || parseFloat(fromAmount) <= 0) {
      return NextResponse.json({
        success: false,
        error: "Amount must be greater than 0",
      }, { status: 400 });
    }

    console.log("[Multi-Quote API] 🎯 Quote request received");
    console.log(`[Multi-Quote API] ${fromToken} (${fromChain}) → ${toToken} (${toChain})`);
    console.log(`[Multi-Quote API] Amount: ${fromAmount}`);

    const result = await getMultiAggregatorQuote({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage,
    });

    if (!result.success || !result.data) {
      console.log("[Multi-Quote API] ❌ No quotes available");
      return NextResponse.json(result, { status: 404 });
    }

    console.log(`[Multi-Quote API] ✅ Quote from: ${result.data.provider}`);
    console.log(`[Multi-Quote API] Checked ${result.totalProviders} provider(s)`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Multi-Quote API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get quote",
      },
      { status: 500 }
    );
  }
}

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
    } = body;

    // Validation
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }

    console.log("[Multi-Quote API] 🎯 POST Quote request received");

    const result = await getMultiAggregatorQuote({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Multi-Quote API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get quote",
      },
      { status: 500 }
    );
  }
}

