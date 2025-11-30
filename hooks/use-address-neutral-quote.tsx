/**
 * Address-Neutral Quote Hook
 * 
 * This hook treats all token addresses equally without making assumptions
 * about whether they're native tokens or ERC20 contracts.
 */

import { useState, useCallback } from 'react';

interface AddressNeutralQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;        // Any address - native, ERC20, or custom
  toToken: string;          // Any address - native, ERC20, or custom
  fromAmount: string;       // Amount in Wei
  fromAddress: string;      // User's wallet address
  toAddress?: string;       // Optional destination address
  slippage?: number;        // Slippage tolerance
}

interface AddressNeutralQuote {
  provider: string;
  toAmount: string;
  priceImpact?: number;
  estimatedGas?: string;
  path?: string[];
  swapData?: string;
  minimumReceived?: string;
}

interface AddressNeutralQuoteResponse {
  success: boolean;
  data?: AddressNeutralQuote;
  error?: string;
  provider?: string;
}

export function useAddressNeutralQuote() {
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<AddressNeutralQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get quote with any token addresses
   * No assumptions about token types - just pass addresses through
   */
  const getQuote = useCallback(async (request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {

      const params = new URLSearchParams({
        fromChain: request.fromChain.toString(),
        toChain: request.toChain.toString(),
        fromToken: request.fromToken,
        toToken: request.toToken,
        fromAmount: request.fromAmount,
        fromAddress: request.fromAddress,
        ...(request.toAddress && { toAddress: request.toAddress }),
        slippage: (request.slippage || 0.5).toString(),
      });

      const response = await fetch(`/api/address-neutral-quote?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AddressNeutralQuoteResponse = await response.json();

      if (data.success && data.data) {
        setQuote(data.data);
        return data.data;
      } else {
        setError(data.error || 'No quote available');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get quote';
      console.error('[AddressNeutral Hook] ❌ Error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Execute swap with any token addresses
   * No special handling for native vs ERC20 tokens
   */
  const executeSwap = useCallback(async (
    quote: AddressNeutralQuote, 
    fromAddress: string
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {

      if (!quote.swapData) {
        throw new Error('No swap data available');
      }

      // Execute transaction with provided swap data
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: fromAddress,
          to: quote.swapData, // This would be the router address in real implementation
          data: quote.swapData,
          value: '0x0', // Would be calculated based on token type
          gas: quote.estimatedGas || '150000',
        }],
      });

      return txHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap';
      console.error('[AddressNeutral Hook] ❌ Swap error:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear current quote and error
   */
  const clearQuote = useCallback(() => {
    setQuote(null);
    setError(null);
  }, []);

  return {
    // State
    isLoading,
    quote,
    error,
    
    // Functions
    getQuote,
    executeSwap,
    clearQuote,
  };
}

/**
 * Address-neutral token interface
 * Treats all tokens equally regardless of type
 */
export interface AddressNeutralToken {
  symbol: string;
  name: string;
  address: string;        // Any address - native, ERC20, or custom
  chainId: number;
  chainName: string;
  decimals?: number;
  balance?: string;
  usdValue?: string;
  icon?: string;
  logoURI?: string;
  // No special fields for native vs ERC20 - all treated equally
}

/**
 * Helper function to create address-neutral quote request
 * No validation of address types - just pass through
 */
export function createAddressNeutralQuoteRequest(
  fromToken: AddressNeutralToken,
  toToken: AddressNeutralToken,
  fromAmount: string,
  fromAddress: string,
  toAddress?: string,
  slippage: number = 0.5
): AddressNeutralQuoteRequest {
  // Convert amount to Wei using token decimals (default to 18 if not specified)
  const decimals = fromToken.decimals || 18;
  const fromAmountWei = (parseFloat(fromAmount) * Math.pow(10, decimals)).toString();

  return {
    fromChain: fromToken.chainId,
    toChain: toToken.chainId,
    fromToken: fromToken.address,
    toToken: toToken.address,
    fromAmount: fromAmountWei,
    fromAddress,
    toAddress,
    slippage,
  };
}

/**
 * Helper function to format quote output
 * No assumptions about token types
 */
export function formatQuoteOutput(
  quote: AddressNeutralQuote,
  toTokenDecimals: number = 18
): string {
  try {
    const amount = BigInt(quote.toAmount);
    const divisor = BigInt(Math.pow(10, toTokenDecimals));
    const formatted = Number(amount) / Number(divisor);
    return formatted.toFixed(6);
  } catch {
    return '0';
  }
}

export default useAddressNeutralQuote;