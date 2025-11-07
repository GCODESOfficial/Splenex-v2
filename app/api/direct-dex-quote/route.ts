import { NextRequest, NextResponse } from "next/server";

/**
 * Direct DEX Router Integration
 * When aggregators fail, call DEX routers directly
 * This allows swapping ANY token with liquidity, even low-cap meme tokens!
 */

interface RouterQuoteRequest {
  fromChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  slippage?: number;
}

// Router ABIs (simplified)
const ROUTER_ABI = {
  getAmountsOut: "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
};

// Router addresses for different chains
const ROUTERS: { [key: number]: { address: string; name: string } } = {
  56: { // BSC
    address: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
    name: "PancakeSwap V2"
  },
  1: { // Ethereum
    address: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    name: "Uniswap V2"
  },
  137: { // Polygon
    address: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
    name: "QuickSwap"
  },
};

// Wrapped native tokens
const WRAPPED_NATIVE: { [key: number]: string } = {
  56: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
  1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",   // WETH
  137: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", // WMATIC
};

// RPC endpoints
const RPC_URLS: { [key: number]: string } = {
  56: process.env.BSC_RPC_URL || "https://bsc-dataseed1.binance.org",
  1: process.env.ETH_RPC_URL || "https://eth.llamarpc.com",
  137: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
};

/**
 * Call DEX router getAmountsOut via RPC
 */
async function getRouterQuote(request: RouterQuoteRequest) {
  try {
    const router = ROUTERS[request.fromChain];
    const wrappedNative = WRAPPED_NATIVE[request.fromChain];
    const rpcUrl = RPC_URLS[request.fromChain];

    if (!router || !wrappedNative || !rpcUrl) {
      return null;
    }

    console.log(`[Direct DEX] 🔧 Calling ${router.name} router directly...`);
    console.log(`[Direct DEX] Router: ${router.address}`);

    // Determine if native token is involved
    const isFromNative = request.fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
    const isToNative = request.toToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

    // Build path
    let path: string[];
    if (isFromNative) {
      path = [wrappedNative, request.toToken];
    } else if (isToNative) {
      path = [request.fromToken, wrappedNative];
    } else {
      // Token to token - route through wrapped native
      path = [request.fromToken, wrappedNative, request.toToken];
    }

    console.log(`[Direct DEX] Path:`, path);

    // Encode getAmountsOut call
    // Function signature: getAmountsOut(uint256,address[])
    const functionSignature = "0xd06ca61f"; // getAmountsOut selector
    
    // Encode parameters
    const amountHex = BigInt(request.fromAmount).toString(16).padStart(64, '0');
    const pathOffset = "0000000000000000000000000000000000000000000000000000000000000040"; // offset to path array
    const pathLength = path.length.toString(16).padStart(64, '0');
    const pathAddresses = path.map(addr => addr.slice(2).toLowerCase().padStart(64, '0')).join('');
    
    const calldata = functionSignature + amountHex + pathOffset + pathLength + pathAddresses;

    // Make RPC call
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [
          {
            to: router.address,
            data: calldata,
          },
          "latest"
        ],
      }),
    });

    if (!response.ok) {
      console.log(`[Direct DEX] RPC call failed: ${response.status}`);
      return null;
    }

    const rpcResult = await response.json();
    
    if (rpcResult.error) {
      console.log(`[Direct DEX] RPC error:`, rpcResult.error.message);
      return null;
    }

    if (!rpcResult.result || rpcResult.result === "0x") {
      console.log(`[Direct DEX] No liquidity for this pair`);
      return null;
    }

    // Decode result (array of uint256)
    const resultHex = rpcResult.result.slice(2);
    const amounts: string[] = [];
    
    // Skip first 64 bytes (array offset and length)
    for (let i = 128; i < resultHex.length; i += 64) {
      const amountHex = resultHex.slice(i, i + 64);
      amounts.push(BigInt("0x" + amountHex).toString());
    }

    const outputAmount = amounts[amounts.length - 1];
    
    if (!outputAmount || outputAmount === "0") {
      console.log(`[Direct DEX] Zero output amount`);
      return null;
    }

    console.log(`[Direct DEX] ✅ Got quote from ${router.name}!`);
    console.log(`[Direct DEX] Input: ${request.fromAmount}, Output: ${outputAmount}`);

    // Calculate minimum output with slippage
    const slippageMultiplier = 1 - ((request.slippage || 0.5) / 100);
    const minOutput = (BigInt(outputAmount) * BigInt(Math.floor(slippageMultiplier * 10000)) / BigInt(10000)).toString();

    return {
      provider: router.name.toLowerCase().replace(/\s+/g, '-'),
      toAmount: outputAmount,
      toAmountMin: minOutput,
      path: path,
      routerAddress: router.address,
      estimatedGas: isFromNative ? "150000" : "200000",
    };
  } catch (error) {
    console.error(`[Direct DEX] Error:`, error);
    return null;
  }
}

/**
 * Encode swap transaction
 */
function encodeSwapTransaction(
  routerAddress: string,
  fromToken: string,
  toToken: string,
  fromAmount: string,
  minOutput: string,
  path: string[],
  fromAddress: string
): { to: string; data: string; value: string } {
  const isFromNative = fromToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const isToNative = toToken.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  
  const deadline = Math.floor(Date.now() / 1000) + 1200; // 20 minutes
  const deadlineHex = deadline.toString(16).padStart(64, '0');
  const addressHex = fromAddress.slice(2).toLowerCase().padStart(64, '0');
  
  let functionSignature: string;
  let data: string;
  let value: string;

  if (isFromNative) {
    // swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline)
    functionSignature = "0x7ff36ab5";
    const minOutHex = BigInt(minOutput).toString(16).padStart(64, '0');
    const pathOffset = "0000000000000000000000000000000000000000000000000000000000000080";
    const pathLength = path.length.toString(16).padStart(64, '0');
    const pathData = path.map(addr => addr.slice(2).toLowerCase().padStart(64, '0')).join('');
    
    data = functionSignature + minOutHex + pathOffset + addressHex + deadlineHex + pathLength + pathData;
    value = fromAmount;
  } else if (isToNative) {
    // swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)
    functionSignature = "0x18cbafe5";
    const amountInHex = BigInt(fromAmount).toString(16).padStart(64, '0');
    const minOutHex = BigInt(minOutput).toString(16).padStart(64, '0');
    const pathOffset = "00000000000000000000000000000000000000000000000000000000000000a0";
    const pathLength = path.length.toString(16).padStart(64, '0');
    const pathData = path.map(addr => addr.slice(2).toLowerCase().padStart(64, '0')).join('');
    
    data = functionSignature + amountInHex + minOutHex + pathOffset + addressHex + deadlineHex + pathLength + pathData;
    value = "0";
  } else {
    // swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline)
    functionSignature = "0x38ed1739";
    const amountInHex = BigInt(fromAmount).toString(16).padStart(64, '0');
    const minOutHex = BigInt(minOutput).toString(16).padStart(64, '0');
    const pathOffset = "00000000000000000000000000000000000000000000000000000000000000a0";
    const pathLength = path.length.toString(16).padStart(64, '0');
    const pathData = path.map(addr => addr.slice(2).toLowerCase().padStart(64, '0')).join('');
    
    data = functionSignature + amountInHex + minOutHex + pathOffset + addressHex + deadlineHex + pathLength + pathData;
    value = "0";
  }

  return {
    to: routerAddress,
    data: data,
    value: value,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const fromChain = parseInt(searchParams.get("fromChain") || "0");
    const toChain = parseInt(searchParams.get("toChain") || "0");
    const fromToken = searchParams.get("fromToken") || "";
    const toToken = searchParams.get("toToken") || "";
    const fromAmount = searchParams.get("fromAmount") || "";
    const fromAddress = searchParams.get("fromAddress") || "";
    const slippage = parseFloat(searchParams.get("slippage") || "0.5");

    // Validation
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }

    // Only same-chain swaps
    if (fromChain !== toChain) {
      return NextResponse.json({
        success: false,
        error: "Direct DEX only supports same-chain swaps",
      }, { status: 400 });
    }

    console.log("[Direct DEX API] 🎯 Getting direct DEX quote...");
    console.log(`[Direct DEX API] ${fromToken} → ${toToken} on chain ${fromChain}`);

    const quote = await getRouterQuote({
      fromChain,
      fromToken,
      toToken,
      fromAmount,
      slippage,
    });

    if (!quote) {
      return NextResponse.json({
        success: false,
        error: "No liquidity found for this pair on direct DEX",
      }, { status: 404 });
    }

    // Build transaction
    const transaction = encodeSwapTransaction(
      quote.routerAddress,
      fromToken,
      toToken,
      fromAmount,
      quote.toAmountMin,
      quote.path,
      fromAddress
    );

    console.log("[Direct DEX API] ✅ Quote generated successfully!");

    return NextResponse.json({
      success: true,
      data: {
        provider: quote.provider,
        toAmount: quote.toAmount,
        toAmountMin: quote.toAmountMin,
        estimatedGas: quote.estimatedGas,
        path: quote.path,
        transactionRequest: {
          ...transaction,
          from: fromAddress,
          gasLimit: quote.estimatedGas,
        },
      },
    });
  } catch (error) {
    console.error("[Direct DEX API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Direct DEX quote failed",
      },
      { status: 500 }
    );
  }
}
