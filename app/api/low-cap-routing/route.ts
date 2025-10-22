import { NextRequest, NextResponse } from "next/server";

/**
 * Low-Cap Token Routing API
 * Specialized routing for low-cap tokens like TWC that may not be supported by major aggregators
 * Uses PancakeSwap directly for BSC tokens and other DEX-specific routing
 */

interface LowCapRoutingRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface LowCapRoutingResult {
  success: boolean;
  route?: {
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
  };
  error?: string;
}

// BSC-specific DEX configurations for low-cap tokens
const BSC_DEXES = {
  pancakeSwap: {
    router: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    factory: "0xcA143Ce0Fe65960E6Aa4D42C8D3cE161c2B6604",
    name: "PancakeSwap V2",
  },
  apeswap: {
    router: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
    factory: "0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6",
    name: "ApeSwap",
  },
  biswap: {
    router: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
    factory: "0x858E3312ed3A876947EA49d572A7C42DE08af7EE",
    name: "Biswap",
  },
};

// Low-cap token configurations
const LOW_CAP_TOKENS = {
  "0x4B0F1812e5Df2A09796481Ff14017e6005508003": {
    symbol: "TWC",
    name: "Tiwicat Token",
    chainId: 56,
    preferredDex: "pancakeSwap",
    minLiquidity: 10000, // $10K minimum
  },
  "0x6982508145454Ce325dDbE47a25d4ec3d2311933": {
    symbol: "PEPE",
    name: "Pepe",
    chainId: 1,
    preferredDex: "uniswap",
    minLiquidity: 1000000, // $1M minimum
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: LowCapRoutingRequest = await request.json();
    
    console.log("[Low-Cap Routing] 🐱 Processing low-cap token swap:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      chainId: body.chainId,
    });

    // Check if this is a low-cap token swap
    const isLowCapToken = LOW_CAP_TOKENS[body.fromToken] || LOW_CAP_TOKENS[body.toToken];
    
    if (!isLowCapToken) {
      return NextResponse.json({
        success: false,
        error: "This API is specifically for low-cap tokens. Use the main routing API instead."
      }, { status: 400 });
    }

    // Handle BSC low-cap tokens (like TWC)
    if (body.chainId === 56) {
      return await handleBSCLowCapSwap(body);
    }

    // Handle Ethereum low-cap tokens
    if (body.chainId === 1) {
      return await handleEthereumLowCapSwap(body);
    }

    return NextResponse.json({
      success: false,
      error: `Low-cap token routing not supported for chain ${body.chainId}`
    });

  } catch (error) {
    console.error("[Low-Cap Routing] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function handleBSCLowCapSwap(request: LowCapRoutingRequest): Promise<NextResponse> {
  console.log("[Low-Cap Routing] 🥞 Handling BSC low-cap token swap...");
  
  try {
    // For BSC, try PancakeSwap first (best for low-cap tokens)
    const pancakeRoute = await getPancakeSwapRoute(request);
    if (pancakeRoute) {
      return NextResponse.json({
        success: true,
        route: pancakeRoute
      });
    }

    // Fallback to ApeSwap
    const apeRoute = await getApeSwapRoute(request);
    if (apeRoute) {
      return NextResponse.json({
        success: true,
        route: apeRoute
      });
    }

    // Fallback to Biswap
    const biswapRoute = await getBiswapRoute(request);
    if (biswapRoute) {
      return NextResponse.json({
        success: true,
        route: biswapRoute
      });
    }

    return NextResponse.json({
      success: false,
      error: "No routes available for this low-cap token pair on BSC"
    });

  } catch (error) {
    console.error("[Low-Cap Routing] BSC error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to route BSC low-cap token swap"
    });
  }
}

async function handleEthereumLowCapSwap(request: LowCapRoutingRequest): Promise<NextResponse> {
  console.log("[Low-Cap Routing] 🦄 Handling Ethereum low-cap token swap...");
  
  try {
    // For Ethereum, try Uniswap V2 (better for low-cap tokens than V3)
    const uniswapRoute = await getUniswapV2Route(request);
    if (uniswapRoute) {
      return NextResponse.json({
        success: true,
        route: uniswapRoute
      });
    }

    // Fallback to SushiSwap
    const sushiRoute = await getSushiSwapRoute(request);
    if (sushiRoute) {
      return NextResponse.json({
        success: true,
        route: sushiRoute
      });
    }

    return NextResponse.json({
      success: false,
      error: "No routes available for this low-cap token pair on Ethereum"
    });

  } catch (error) {
    console.error("[Low-Cap Routing] Ethereum error:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to route Ethereum low-cap token swap"
    });
  }
}

async function getPancakeSwapRoute(request: LowCapRoutingRequest): Promise<any> {
  try {
    console.log("[Low-Cap Routing] 🥞 Trying PancakeSwap...");
    
    // PancakeSwap V2 Router API simulation
    const dex = BSC_DEXES.pancakeSwap;
    
    // Simulate getting amounts out (in production, call actual PancakeSwap router)
    const simulatedOutput = (parseFloat(request.fromAmount) * 0.95).toString(); // 5% slippage simulation
    
    return {
      dex: dex.name,
      routerAddress: dex.router,
      path: [request.fromToken, request.toToken],
      expectedOutput: simulatedOutput,
      priceImpact: 5.0, // High price impact for low-cap tokens
      gasEstimate: "200000",
      transactionData: {
        to: dex.router,
        data: "0x", // Would contain actual swap calldata
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      }
    };
  } catch (error) {
    console.log("[Low-Cap Routing] PancakeSwap failed:", error);
    return null;
  }
}

async function getApeSwapRoute(request: LowCapRoutingRequest): Promise<any> {
  try {
    console.log("[Low-Cap Routing] 🦍 Trying ApeSwap...");
    
    const dex = BSC_DEXES.apeswap;
    
    const simulatedOutput = (parseFloat(request.fromAmount) * 0.93).toString(); // 7% slippage
    
    return {
      dex: dex.name,
      routerAddress: dex.router,
      path: [request.fromToken, request.toToken],
      expectedOutput: simulatedOutput,
      priceImpact: 7.0,
      gasEstimate: "250000",
      transactionData: {
        to: dex.router,
        data: "0x",
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      }
    };
  } catch (error) {
    console.log("[Low-Cap Routing] ApeSwap failed:", error);
    return null;
  }
}

async function getBiswapRoute(request: LowCapRoutingRequest): Promise<any> {
  try {
    console.log("[Low-Cap Routing] 🔄 Trying Biswap...");
    
    const dex = BSC_DEXES.biswap;
    
    const simulatedOutput = (parseFloat(request.fromAmount) * 0.92).toString(); // 8% slippage
    
    return {
      dex: dex.name,
      routerAddress: dex.router,
      path: [request.fromToken, request.toToken],
      expectedOutput: simulatedOutput,
      priceImpact: 8.0,
      gasEstimate: "300000",
      transactionData: {
        to: dex.router,
        data: "0x",
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      }
    };
  } catch (error) {
    console.log("[Low-Cap Routing] Biswap failed:", error);
    return null;
  }
}

async function getUniswapV2Route(request: LowCapRoutingRequest): Promise<any> {
  try {
    console.log("[Low-Cap Routing] 🦄 Trying Uniswap V2...");
    
    // Uniswap V2 Router
    const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    
    const simulatedOutput = (parseFloat(request.fromAmount) * 0.90).toString(); // 10% slippage
    
    return {
      dex: "Uniswap V2",
      routerAddress,
      path: [request.fromToken, request.toToken],
      expectedOutput: simulatedOutput,
      priceImpact: 10.0,
      gasEstimate: "300000",
      transactionData: {
        to: routerAddress,
        data: "0x",
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      }
    };
  } catch (error) {
    console.log("[Low-Cap Routing] Uniswap V2 failed:", error);
    return null;
  }
}

async function getSushiSwapRoute(request: LowCapRoutingRequest): Promise<any> {
  try {
    console.log("[Low-Cap Routing] 🍣 Trying SushiSwap...");
    
    // SushiSwap Router
    const routerAddress = "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F";
    
    const simulatedOutput = (parseFloat(request.fromAmount) * 0.88).toString(); // 12% slippage
    
    return {
      dex: "SushiSwap",
      routerAddress,
      path: [request.fromToken, request.toToken],
      expectedOutput: simulatedOutput,
      priceImpact: 12.0,
      gasEstimate: "350000",
      transactionData: {
        to: routerAddress,
        data: "0x",
        value: request.fromToken === "0x0000000000000000000000000000000000000000" ? request.fromAmount : "0",
      }
    };
  } catch (error) {
    console.log("[Low-Cap Routing] SushiSwap failed:", error);
    return null;
  }
}
