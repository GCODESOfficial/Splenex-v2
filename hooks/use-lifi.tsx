/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { calculateGasRevenue } from "@/config/revenue";
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
const DAPP_FEE_RECIPIENT = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9";

export function useLiFi() {
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<LiFiQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: LiFiQuoteRequest): Promise<LiFiQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getLiFiQuote(request);
      if (!result.success) throw new Error(result.error);
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
        console.log("[LiFi] Swap transaction sent:", txHash);

        const receipt = await txResponse.wait();
        console.log("[LiFi] Swap confirmed:", receipt);

        /** --- FIXED: Record Trading Volume with Accurate USD Calculation --- */
        let usdValue = 0;
        
        try {
          const fromToken = quote.action.fromToken;
          const fromAmount = quote.action.fromAmount;
          const fromAmountNum = Number.parseFloat(fromAmount) / Math.pow(10, fromToken.decimals);
          
          console.log(`[Analytics] 📊 Calculating volume: ${fromAmountNum} ${fromToken.symbol}`);
          
          // Method 1: Stablecoins = 1:1 USD (most accurate)
          const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'USDD', 'GUSD', 'USDP'];
          if (stablecoins.includes(fromToken.symbol)) {
            usdValue = fromAmountNum;
            console.log(`[Analytics] 💵 Stablecoin detected: ${fromToken.symbol} = $${usdValue.toFixed(2)}`);
          } 
          // Method 2: Use gas costs USD as price reference (if available)
          else if (quote.estimate?.gasCosts?.[0]?.amountUSD) {
            // For now, fetch price from API for accurate calculation
            const priceResponse = await fetch(`/api/prices?symbols=${fromToken.symbol}`);
            if (priceResponse.ok) {
              const prices = await priceResponse.json();
              const tokenPrice = prices[fromToken.symbol] || 0;
              if (tokenPrice > 0) {
                usdValue = fromAmountNum * tokenPrice;
                console.log(`[Analytics] 📈 Price API: ${fromToken.symbol} @ $${tokenPrice} = $${usdValue.toFixed(2)}`);
              }
            }
          }
          // Method 3: For native tokens, estimate based on symbol
          else {
            const nativeTokenPrices: Record<string, number> = {
              'ETH': 3500, 'WETH': 3500,
              'BNB': 600, 'WBNB': 600,
              'MATIC': 1, 'WMATIC': 1,
              'AVAX': 40, 'WAVAX': 40,
              'FTM': 0.5, 'WFTM': 0.5,
            };
            const estimatedPrice = nativeTokenPrices[fromToken.symbol] || 0;
            if (estimatedPrice > 0) {
              usdValue = fromAmountNum * estimatedPrice;
              console.log(`[Analytics] 🔷 Estimated native token: ${fromToken.symbol} @ ~$${estimatedPrice} = $${usdValue.toFixed(2)}`);
            }
          }
          
          console.log(`[Analytics] 💰 Final swap volume: $${usdValue.toFixed(2)}`);
        } catch (calcError) {
          console.error("[Analytics] Error calculating USD value:", calcError);
          // Fallback: use a minimal value to avoid losing the swap record
          usdValue = 0.01;
        }

        // Calculate gas fee revenue
        let gasFeeRevenue = 0;
        try {
          const gasCosts = quote.estimate?.gasCosts?.[0];
          if (gasCosts && gasCosts.amountUSD) {
            const gasRevenue = calculateGasRevenue(gasCosts.amountUSD);
            gasFeeRevenue = gasRevenue.revenue;
            
            console.log(`[Revenue] 💰 Gas Fee Revenue Calculation:`);
            console.log(`[Revenue] Original Gas Fee: $${gasRevenue.originalGasFee.toFixed(2)}`);
            console.log(`[Revenue] Additional Charge (50%): $${gasRevenue.additionalCharge.toFixed(2)}`);
            console.log(`[Revenue] Total Gas Fee: $${gasRevenue.totalGasFee.toFixed(2)}`);
            console.log(`[Revenue] Revenue to Wallet: $${gasRevenue.revenue.toFixed(2)}`);
            console.log(`[Revenue] Revenue Wallet: ${gasRevenue.revenueWallet}`);
          }
        } catch (gasError) {
          console.warn("[Revenue] ⚠️ Could not calculate gas revenue:", gasError);
        }

        const { error: insertErr } = await supabase.from("swap_analytics").insert({
          user_address: quote.transactionRequest.from,
          swap_volume_usd: usdValue,
          gas_fee_revenue: gasFeeRevenue,
          from_chain: quote.action.fromChainId,
          to_chain: quote.action.toChainId,
          tx_hash: txHash,
        });

        if (insertErr) console.error("[Analytics] ❌ Failed to log swap volume:", insertErr);
        else console.log(`[Analytics] ✅ Swap volume logged: $${usdValue.toFixed(2)}, Gas revenue: $${gasFeeRevenue.toFixed(2)}`);

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
