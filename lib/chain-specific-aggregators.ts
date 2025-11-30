// Enhanced chain-specific aggregators for BSC and Ethereum
import { QuoteRequest, UnifiedQuote } from './comprehensive-aggregators';

/**
 * BSC-specific aggregators
 */

// PancakeSwap V3 (BSC's largest DEX)
async function getPancakeSwapV3Quote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 56 || request.toChain !== 56) {
      return null; // PancakeSwap V3 only supports BSC
    }

    const response = await fetch(
      `https://api.pancakeswap.info/api/v3/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "pancakeswap-v3",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "200000",
      liquidityScore: 95,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[PancakeSwapV3] Error:", error);
    return null;
  }
}

// BiSwap (BSC DEX)
async function getBiSwapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 56 || request.toChain !== 56) {
      return null;
    }

    const response = await fetch(
      `https://api.biswap.org/api/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "biswap",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "180000",
      liquidityScore: 75,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[BiSwap] Error:", error);
    return null;
  }
}

// ApeSwap (BSC DEX)
async function getApeSwapQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 56 || request.toChain !== 56) {
      return null;
    }

    const response = await fetch(
      `https://api.apeswap.finance/api/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "apeswap",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "170000",
      liquidityScore: 70,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[ApeSwap] Error:", error);
    return null;
  }
}

// MDEX (BSC DEX)
async function getMDEXQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 56 || request.toChain !== 56) {
      return null;
    }

    const response = await fetch(
      `https://api.mdex.com/api/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "mdex",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "160000",
      liquidityScore: 65,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[MDEX] Error:", error);
    return null;
  }
}

/**
 * Ethereum-specific aggregators
 */

// Uniswap V2 (Ethereum)
async function getUniswapV2Quote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null; // Uniswap V2 only supports Ethereum
    }

    const response = await fetch(
      `https://api.uniswap.org/v2/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "uniswap-v2",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "150000",
      liquidityScore: 90,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[UniswapV2] Error:", error);
    return null;
  }
}

// Uniswap V3 (Ethereum)
async function getUniswapV3Quote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null; // Uniswap V3 only supports Ethereum
    }

    const response = await fetch(
      `https://api.uniswap.org/v3/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "uniswap-v3",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "200000",
      liquidityScore: 95,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[UniswapV3] Error:", error);
    return null;
  }
}

// SushiSwap (Ethereum)
async function getSushiSwapEthereumQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null;
    }

    const response = await fetch(
      `https://api.sushi.com/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "sushiswap-ethereum",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "180000",
      liquidityScore: 85,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[SushiSwapEthereum] Error:", error);
    return null;
  }
}

// Curve (Ethereum)
async function getCurveEthereumQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null;
    }

    const response = await fetch(
      `https://api.curve.fi/api/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "curve-ethereum",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "120000",
      liquidityScore: 80,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[CurveEthereum] Error:", error);
    return null;
  }
}

// Balancer V2 (Ethereum)
async function getBalancerV2Quote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null;
    }

    const response = await fetch(
      `https://api.balancer.fi/v2/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "balancer-v2",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "250000",
      liquidityScore: 75,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[BalancerV2] Error:", error);
    return null;
  }
}

// Yearn Finance (Ethereum)
async function getYearnFinanceQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null;
    }

    const response = await fetch(
      `https://api.yearn.finance/v1/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "yearn-finance",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "300000",
      liquidityScore: 70,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[YearnFinance] Error:", error);
    return null;
  }
}

// Compound (Ethereum)
async function getCompoundQuote(request: QuoteRequest): Promise<UnifiedQuote | null> {
  try {
    
    if (request.fromChain !== 1 || request.toChain !== 1) {
      return null;
    }

    const response = await fetch(
      `https://api.compound.finance/api/v2/quote?token0=${request.fromToken}&token1=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 0.5}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (!data.amountOut) {
      return null;
    }

    return {
      provider: "compound",
      toAmount: data.amountOut,
      estimatedGas: data.gasEstimate || "200000",
      liquidityScore: 65,
      priceImpact: data.priceImpact || 0,
    };
  } catch (error) {
    console.error("[Compound] Error:", error);
    return null;
  }
}

// Export all chain-specific aggregators
export {
  // BSC aggregators
  getPancakeSwapV3Quote,
  getBiSwapQuote,
  getApeSwapQuote,
  getMDEXQuote,
  
  // Ethereum aggregators
  getUniswapV2Quote,
  getUniswapV3Quote,
  getSushiSwapEthereumQuote,
  getCurveEthereumQuote,
  getBalancerV2Quote,
  getYearnFinanceQuote,
  getCompoundQuote,
};

/**
 * Get chain-specific aggregators
 */
export function getChainSpecificAggregators(chainId: number): Array<(req: QuoteRequest) => Promise<UnifiedQuote | null>> {
  switch (chainId) {
    case 1: // Ethereum
      return [
        getUniswapV3Quote,
        getUniswapV2Quote,
        getSushiSwapEthereumQuote,
        getCurveEthereumQuote,
        getBalancerV2Quote,
        getYearnFinanceQuote,
        getCompoundQuote,
      ];
    
    case 56: // BSC
      return [
        getPancakeSwapV3Quote,
        getBiSwapQuote,
        getApeSwapQuote,
        getMDEXQuote,
      ];
    
    default:
      return [];
  }
}
