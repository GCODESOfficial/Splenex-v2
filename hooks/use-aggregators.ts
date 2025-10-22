import { useState, useCallback } from 'react';

interface AggregatorQuoteRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface AggregatorQuote {
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

interface AggregatorQuoteResponse {
  success: boolean;
  quote?: AggregatorQuote;
  error?: string;
}

// 1inch Hook
export function useOneInch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: AggregatorQuoteRequest): Promise<AggregatorQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[1inch Hook] 🔥 Getting quote:", request);

      const response = await fetch('/api/1inch-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AggregatorQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[1inch Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[1inch Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get 1inch quote';
      console.error("[1inch Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: AggregatorQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[1inch Hook] 🔄 Executing swap:", quote);

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

      console.log("[1inch Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[1inch Hook] ❌ Swap failed:", errorMessage);
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

// 0x Protocol Hook
export function useZeroX() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: AggregatorQuoteRequest): Promise<AggregatorQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[0x Hook] ⚡ Getting quote:", request);

      const response = await fetch('/api/0x-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AggregatorQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[0x Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[0x Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get 0x quote';
      console.error("[0x Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: AggregatorQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[0x Hook] 🔄 Executing swap:", quote);

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

      console.log("[0x Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[0x Hook] ❌ Swap failed:", errorMessage);
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

// ParaSwap Hook
export function useParaSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: AggregatorQuoteRequest): Promise<AggregatorQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[ParaSwap Hook] 🦄 Getting quote:", request);

      const response = await fetch('/api/paraswap-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AggregatorQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[ParaSwap Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[ParaSwap Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get ParaSwap quote';
      console.error("[ParaSwap Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: AggregatorQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[ParaSwap Hook] 🔄 Executing swap:", quote);

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

      console.log("[ParaSwap Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[ParaSwap Hook] ❌ Swap failed:", errorMessage);
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

// Uniswap V3 Hook
export function useUniswapV3() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: AggregatorQuoteRequest): Promise<AggregatorQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[Uniswap V3 Hook] 🦄 Getting quote:", request);

      const response = await fetch('/api/uniswap-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AggregatorQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[Uniswap V3 Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[Uniswap V3 Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Uniswap V3 quote';
      console.error("[Uniswap V3 Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: AggregatorQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[Uniswap V3 Hook] 🔄 Executing swap:", quote);

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

      console.log("[Uniswap V3 Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[Uniswap V3 Hook] ❌ Swap failed:", errorMessage);
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

// SushiSwap Hook
export function useSushiSwap() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: AggregatorQuoteRequest): Promise<AggregatorQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[SushiSwap Hook] 🍣 Getting quote:", request);

      const response = await fetch('/api/sushiswap-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AggregatorQuoteResponse = await response.json();

      if (data.success && data.quote) {
        console.log("[SushiSwap Hook] ✅ Quote received:", data.quote);
        return data.quote;
      } else {
        console.log("[SushiSwap Hook] ❌ No quote available:", data.error);
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get SushiSwap quote';
      console.error("[SushiSwap Hook] ❌ Error:", errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const executeSwap = useCallback(async (quote: AggregatorQuote, fromAddress: string): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("[SushiSwap Hook] 🔄 Executing swap:", quote);

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

      console.log("[SushiSwap Hook] ✅ Transaction sent:", txHash);
      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error("[SushiSwap Hook] ❌ Swap failed:", errorMessage);
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
