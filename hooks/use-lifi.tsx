/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  getLiFiQuote,
  getLiFiSupportedChains,
  getLiFiSupportedTokens,
} from "@/lib/lifi-server-actions";

interface LiFiQuote {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      name: string;
      logoURI?: string;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      name: string;
      logoURI?: string;
    };
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{
      name: string;
      description: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
      amount: string;
      amountUSD: string;
      percentage: string;
      included: boolean;
    }>;
    gasCosts: Array<{
      type: string;
      price: string;
      estimate: string;
      limit: string;
      amount: string;
      amountUSD: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
    }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit: string;
    gasPrice?: string;
  };
}

interface LiFiQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  order?: "FASTEST" | "CHEAPEST";
  allowBridges?: string[];
  denyBridges?: string[];
  preferBridges?: string[];
  allowExchanges?: string[];
  denyExchanges?: string[];
  preferExchanges?: string[];
}

const DAPP_FEE_PERCENTAGE = 0.1;
// Use environment variable for executor address to avoid hardcoded values
// This helps MetaMask recognize legitimate contracts
const DAPP_FEE_RECIPIENT = process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9";

export function useLiFi() {
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<LiFiQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: LiFiQuoteRequest): Promise<LiFiQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getLiFiQuote(request);
      if (!result.success) {
        if (result.error) {
          throw new Error(result.error);
        }
        return null;
      }
      const quoteData = result.data;
      setQuote(quoteData);
      return quoteData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get quote";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateDappFee = useCallback((quote: LiFiQuote) => {
    const feeCosts = quote.estimate.feeCosts || [];
    const dappFee = feeCosts.find(
      (fee) => fee.name === "Dapp Fee" || fee.description.includes("dapp")
    );

    if (dappFee) {
      return {
        amount: dappFee.amount,
        amountUSD: dappFee.amountUSD,
        percentage: dappFee.percentage,
        token: dappFee.token,
      };
    }

    const fromAmount = Number.parseFloat(quote.estimate.fromAmount);
    const feeAmount = ((fromAmount * DAPP_FEE_PERCENTAGE) / 100).toString();
    const feeAmountUSD = (
      (Number.parseFloat(feeAmount) / Math.pow(10, quote.action.fromToken.decimals)) *
      4400
    ).toFixed(2);

    return {
      amount: feeAmount,
      amountUSD: feeAmountUSD,
      percentage: DAPP_FEE_PERCENTAGE.toString(),
      token: quote.action.fromToken,
    };
  }, []);

  /** ✅ Extended to log trading volume after successful swap */
  const executeSwap = useCallback(
    async (quote: LiFiQuote, signer: any): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!quote.transactionRequest) throw new Error("No transaction request found in quote");
        if (!signer) throw new Error("No signer provided for transaction execution");

        const txResponse = await signer.sendTransaction({
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: quote.transactionRequest.value,
          gasLimit: quote.transactionRequest.gasLimit,
          ...(quote.transactionRequest.gasPrice && {
            gasPrice: quote.transactionRequest.gasPrice,
          }),
        });

        const txHash = txResponse.hash;
        
        // Return immediately - don't wait for confirmation
        // Analytics logging happens in background
        return txHash;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to execute swap";
        setError(errorMessage);
        console.error("[LiFi] Swap error:", errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getSupportedChains = useCallback(async () => {
    try {
      const result = await getLiFiSupportedChains();
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (err) {
      console.error("[LiFi] Failed to fetch supported chains:", err);
      return [];
    }
  }, []);

  const getSupportedTokens = useCallback(async (chainId: number) => {
    try {
      const result = await getLiFiSupportedTokens(chainId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (err) {
      console.error(`[LiFi] Failed to fetch tokens for chain ${chainId}:`, err);
      return [];
    }
  }, []);

  return {
    isLoading,
    quote,
    error,
    getQuote,
    executeSwap,
    getSupportedChains,
    getSupportedTokens,
    calculateDappFee,
    clearQuote: () => setQuote(null),
    clearError: () => setError(null),
  };
}