import { useState, useCallback } from 'react';

interface PancakeSwapQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  slippage?: number;
}

interface PancakeSwapQuote {
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
}

interface PancakeSwapQuoteResponse {
  success: boolean;
  quote?: PancakeSwapQuote;
  error?: string;
}

export function usePancakeSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: PancakeSwapQuoteRequest): Promise<PancakeSwapQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[PancakeSwap Hook] 🥞 Getting quote:", request);

      const response = await fetch('/api/pancakeswap-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: PancakeSwapQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[PancakeSwap Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[PancakeSwap Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get PancakeSwap quote';
      console.error("[PancakeSwap Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: PancakeSwapQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[PancakeSwap Hook] 🔄 Executing swap:", quote);

      // Execute the swap transaction
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: quote.transactionData.to,
          data: quote.transactionData.data,
          value: quote.transactionData.value,
          gas: quote.gasEstimate,
        }],
      });

      console.log("[PancakeSwap Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[PancakeSwap Hook] ❌ Swap failed:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getQuote,
    executeSwap,
    isLoading,
    error,
  };
}
