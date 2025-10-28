import { NextRequest, NextResponse } from "next/server";

/**
 * Liquidity Detection API
 * Analyzes token pairs for liquidity availability across different protocols
 * Helps determine the best routing strategy for swaps
 */

interface LiquidityCheckRequest {
  tokenA: string;
  tokenB: string;
  chainId: number;
  amount?: string;
}

interface LiquidityResult {
  success: boolean;
  liquidity?: {
    totalLiquidity: string;
    availableProtocols: Array<{
      protocol: string;
      liquidity: string;
      priceImpact: number;
      confidence: number;
      fees: number;
    }>;
    bestRoute: {
      protocol: string;
      expectedOutput: string;
      priceImpact: number;
      gasEstimate: string;
    };
    riskLevel: "low" | "medium" | "high";
    recommendations: string[];
  };
  error?: string;
}

// Protocol liquidity data (simplified - in production, this would be fetched from APIs)
const PROTOCOL_LIQUIDITY: { [key: string]: any } = {
  "uniswap": {
    chains: [1],
    minLiquidity: "1000000", // $1M minimum
    avgFees: 0.3,
    confidence: 95,
  },
  "sushiswap": {
    chains: [1, 56, 137, 42161, 10, 43114, 8453, 250],
    minLiquidity: "500000", // $500K minimum
    avgFees: 0.25,
    confidence: 90,
  },
  "pancakeswap": {
    chains: [56, 1, 137, 42161, 10, 43114, 8453],
    minLiquidity: "2000000", // $2M minimum
    avgFees: 0.25,
    confidence: 92,
  },
  "kyberswap": {
    chains: [1, 56, 137, 42161, 10, 43114, 8453, 250, 100, 25, 42220],
    minLiquidity: "300000", // $300K minimum
    avgFees: 0.3,
    confidence: 88,
  },
  "1inch": {
    chains: [1, 56, 137, 42161, 10, 43114, 8453, 250, 100],
    minLiquidity: "100000", // $100K minimum
    avgFees: 0.1,
    confidence: 85,
  },
  "paraswap": {
    chains: [1, 56, 137, 42161, 10, 43114, 8453, 250],
    minLiquidity: "200000", // $200K minimum
    avgFees: 0.2,
    confidence: 87,
  },
  "0x": {
    chains: [1, 56, 137, 42161, 10, 43114, 8453],
    minLiquidity: "500000", // $500K minimum
    avgFees: 0.15,
    confidence: 93,
  },
};

// Major token liquidity estimates (simplified)
const TOKEN_LIQUIDITY: { [key: string]: { [chainId: number]: string } } = {
  "USDC": {
    1: "5000000000", // $5B
    56: "2000000000", // $2B
    137: "1500000000", // $1.5B
    42161: "1000000000", // $1B
    10: "800000000", // $800M
    8453: "500000000", // $500M
    43114: "300000000", // $300M
    250: "100000000", // $100M
  },
  "USDT": {
    1: "4000000000", // $4B
    56: "1500000000", // $1.5B
    137: "800000000", // $800M
    42161: "600000000", // $600M
    10: "400000000", // $400M
    43114: "200000000", // $200M
    250: "80000000", // $80M
  },
  "WETH": {
    1: "3000000000", // $3B
    42161: "800000000", // $800M
    10: "500000000", // $500M
    8453: "300000000", // $300M
  },
  "WBTC": {
    1: "2000000000", // $2B
    137: "300000000", // $300M
    42161: "200000000", // $200M
  },
  "ETH": {
    1: "10000000000", // $10B (native)
    42161: "2000000000", // $2B
    10: "1000000000", // $1B
    8453: "500000000", // $500M
  },
  "BNB": {
    56: "1000000000", // $1B
  },
  "MATIC": {
    137: "500000000", // $500M
  },
  "AVAX": {
    43114: "300000000", // $300M
  },
  "FTM": {
    250: "100000000", // $100M
  },
  // Low-cap meme tokens
  "TWC": {
    56: "50000", // $50K (very low liquidity)
  },
  "TKC": {
    56: "50000", // $50K (very low liquidity)
  },
  "PEPE": {
    1: "20000000", // $20M
  },
  "SHIB": {
    1: "100000000", // $100M
  },
  "FLOKI": {
    1: "5000000", // $5M
  },
  "BONK": {
    101: "10000000", // $10M
  },
};

export async function POST(request: NextRequest) {
  try {
    const body: LiquidityCheckRequest = await request.json();
    
    console.log("[Liquidity Detection] 💧 Checking liquidity for:", {
      tokenA: body.tokenA,
      tokenB: body.tokenB,
      chainId: body.chainId,
    });

    // Validate request
    if (!body.tokenA || !body.tokenB || !body.chainId) {
      return NextResponse.json({
        success: false,
        error: "Missing required parameters: tokenA, tokenB, chainId"
      }, { status: 400 });
    }

    // Get liquidity estimates for both tokens
    const liquidityA = getTokenLiquidity(body.tokenA, body.chainId);
    const liquidityB = getTokenLiquidity(body.tokenB, body.chainId);
    
    // Calculate pair liquidity (geometric mean for conservative estimate)
    const pairLiquidity = calculatePairLiquidity(liquidityA, liquidityB);
    
    // Find available protocols for this chain
    const availableProtocols = Object.entries(PROTOCOL_LIQUIDITY)
      .filter(([_, config]) => config.chains.includes(body.chainId))
      .map(([protocol, config]) => ({
        protocol,
        liquidity: pairLiquidity,
        priceImpact: calculatePriceImpact(pairLiquidity, body.amount || "1000000"),
        confidence: config.confidence,
        fees: config.avgFees,
      }))
      .filter(protocol => BigInt(protocol.liquidity) >= BigInt(config.minLiquidity))
      .sort((a, b) => b.confidence - a.confidence);

    if (availableProtocols.length === 0) {
      return NextResponse.json({
        success: false,
        error: "Insufficient liquidity for this token pair on this chain",
        liquidity: {
          totalLiquidity: pairLiquidity,
          availableProtocols: [],
          bestRoute: null,
          riskLevel: "high",
          recommendations: [
            "Try a different chain with more liquidity",
            "Use a smaller swap amount",
            "Consider using a different token pair",
            "Wait for better market conditions"
          ]
        }
      });
    }

    // Determine best route
    const bestRoute = availableProtocols.reduce((best, current) => {
      const currentScore = current.confidence * (1 - current.priceImpact / 100);
      const bestScore = best.confidence * (1 - best.priceImpact / 100);
      return currentScore > bestScore ? current : best;
    });

    // Calculate risk level
    const riskLevel = calculateRiskLevel(pairLiquidity, bestRoute.priceImpact, availableProtocols.length);

    // Generate recommendations
    const recommendations = generateRecommendations(riskLevel, bestRoute, availableProtocols);

    return NextResponse.json({
      success: true,
      liquidity: {
        totalLiquidity: pairLiquidity,
        availableProtocols,
        bestRoute: {
          protocol: bestRoute.protocol,
          expectedOutput: calculateExpectedOutput(body.amount || "1000000", bestRoute.priceImpact),
          priceImpact: bestRoute.priceImpact,
          gasEstimate: estimateGasCost(bestRoute.protocol, body.chainId),
        },
        riskLevel,
        recommendations,
      }
    });

  } catch (error) {
    console.error("[Liquidity Detection] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

function getTokenLiquidity(tokenAddress: string, chainId: number): string {
  // Simplified token symbol detection (in production, use proper token registry)
  const tokenSymbol = getTokenSymbol(tokenAddress);
  return TOKEN_LIQUIDITY[tokenSymbol]?.[chainId] || "1000000"; // Default $1M
}

function getTokenSymbol(address: string): string {
  // Simplified mapping (in production, use proper token registry)
  const addressMap: { [key: string]: string } = {
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2": "WETH",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "WBTC",
    "0x0000000000000000000000000000000000000000": "ETH",
    "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c": "BNB",
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": "MATIC",
    "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7": "AVAX",
    "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83": "FTM",
    // Low-cap meme tokens
    "0x4B0F1812e5Df2A09796481Ff14017e6005508003": "TWC", // Tiwicat Token on BSC
    "0x4B0F1812e5Df2A09796481Ff14017e6005508003": "TKC", // TKC Token on BSC (same as TWC)
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933": "PEPE", // Pepe on Ethereum
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE": "SHIB", // Shiba Inu on Ethereum
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E": "FLOKI", // Floki on Ethereum
  };
  
  return addressMap[address] || "UNKNOWN";
}

function calculatePairLiquidity(liquidityA: string, liquidityB: string): string {
  // Use geometric mean for conservative estimate
  const liquidityANum = parseFloat(liquidityA);
  const liquidityBNum = parseFloat(liquidityB);
  const geometricMean = Math.sqrt(liquidityANum * liquidityBNum);
  return Math.floor(geometricMean).toString();
}

function calculatePriceImpact(liquidity: string, amount: string): number {
  const liquidityNum = parseFloat(liquidity);
  const amountNum = parseFloat(amount);
  
  // Simplified price impact calculation
  const impact = (amountNum / liquidityNum) * 100;
  return Math.min(impact, 50); // Cap at 50%
}

function calculateRiskLevel(liquidity: string, priceImpact: number, protocolCount: number): "low" | "medium" | "high" {
  const liquidityNum = parseFloat(liquidity);
  
  if (liquidityNum > 10000000 && priceImpact < 1 && protocolCount > 3) {
    return "low";
  } else if (liquidityNum > 1000000 && priceImpact < 5 && protocolCount > 1) {
    return "medium";
  } else {
    return "high";
  }
}

function calculateExpectedOutput(amount: string, priceImpact: number): string {
  const amountNum = parseFloat(amount);
  const output = amountNum * (1 - priceImpact / 100);
  return output.toString();
}

function estimateGasCost(protocol: string, chainId: number): string {
  // Simplified gas estimates
  const gasEstimates: { [key: string]: { [chainId: number]: string } } = {
    "uniswap": { 1: "200000" },
    "sushiswap": { 1: "250000", 56: "200000", 137: "150000" },
    "pancakeswap": { 56: "180000", 1: "220000" },
    "kyberswap": { 1: "300000" },
    "1inch": { 1: "150000" },
    "paraswap": { 1: "280000" },
    "0x": { 1: "200000" },
  };
  
  return gasEstimates[protocol]?.[chainId] || "250000";
}

function generateRecommendations(
  riskLevel: "low" | "medium" | "high",
  bestRoute: any,
  availableProtocols: any[]
): string[] {
  const recommendations = [];
  
  if (riskLevel === "low") {
    recommendations.push("✅ Excellent liquidity - safe to proceed");
    recommendations.push(`💡 Best route: ${bestRoute.protocol} with ${bestRoute.priceImpact.toFixed(2)}% price impact`);
  } else if (riskLevel === "medium") {
    recommendations.push("⚠️ Moderate liquidity - proceed with caution");
    recommendations.push(`💡 Consider using ${bestRoute.protocol} for best execution`);
    recommendations.push("💡 Monitor price impact during execution");
  } else {
    recommendations.push("🚨 High risk - consider alternatives");
    recommendations.push("💡 Try a smaller swap amount");
    recommendations.push("💡 Consider using a different chain");
    recommendations.push("💡 Wait for better market conditions");
  }
  
  if (availableProtocols.length > 1) {
    recommendations.push(`🔄 ${availableProtocols.length} protocols available - good routing options`);
  }
  
  return recommendations;
}
