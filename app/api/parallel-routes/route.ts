import { NextRequest, NextResponse } from "next/server";
import { getParallelRoutes } from "@/lib/aggregator-quotes";

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

    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    if (fromAmount === "0" || Number(fromAmount) <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be greater than 0",
        },
        { status: 400 }
      );
    }

    const result = await getParallelRoutes({
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
      return NextResponse.json(result, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      bestRoute: result.data,
      allRoutes: result.allQuotes,
      provider: result.provider,
      totalProviders: result.totalProviders,
      failedProviders: result.failedProviders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

