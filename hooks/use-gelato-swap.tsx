/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { executeGaslessSwap, waitForTaskCompletion, isGelatoSupported } from "@/lib/relayer";
import { supabase } from "@/lib/supabaseClient";
import { calculateGasRevenue } from "@/config/revenue";

interface GelatoSwapResult {
  taskId: string;
  transactionHash?: string;
  success: boolean;
  error?: string;
}

/**
 * Hook for gasless swap execution via Gelato Relay
 * Replaces direct wallet signing with meta-transactions
 */
export function useGelatoSwap() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute swap using Gelato Relay (gasless meta-transaction)
   * @param quote - LiFi quote object
   * @param userAddress - User's wallet address
   * @param chainId - Chain ID
   * @returns Transaction hash or null
   */
  const executeGaslessSwapWithQuote = useCallback(
    async (quote: any, userAddress: string, chainId: number): Promise<GelatoSwapResult> => {
      setIsExecuting(true);
      setError(null);
      setTaskId(null);

      try {
        console.log("[GelatoSwap] 🚀 Initiating gasless swap...");

        if (!quote.transactionRequest) {
          throw new Error("No transaction request found in quote");
        }

        // Check if chain is supported by Gelato
        if (!isGelatoSupported(chainId)) {
          throw new Error(
            `Gasless swaps not supported on this network. Please pay gas directly or switch to a supported network.`
          );
        }

        // Execute via Gelato Relay
        const relayResult = await executeGaslessSwap(
          quote.transactionRequest.to,
          quote.transactionRequest.data,
          chainId,
          userAddress
        );

        if (!relayResult.success || !relayResult.taskId) {
          throw new Error(relayResult.error || "Failed to create relay task");
        }

        console.log("[GelatoSwap] ✅ Relay task created:", relayResult.taskId);
        setTaskId(relayResult.taskId);

        // Wait for task completion
        console.log("[GelatoSwap] ⏳ Waiting for Gelato to execute transaction...");
        const completionResult = await waitForTaskCompletion(relayResult.taskId);

        if (!completionResult.success) {
          throw new Error(completionResult.error || "Task execution failed");
        }

        const txHash = completionResult.transactionHash || "";
        console.log("[GelatoSwap] ✅ Swap executed via Gelato! TX:", txHash);

        // Log swap volume (same as before)
        await logSwapVolume(quote, txHash);

        return {
          taskId: relayResult.taskId,
          transactionHash: txHash,
          success: true,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to execute gasless swap";
        setError(errorMessage);
        console.error("[GelatoSwap] ❌ Error:", errorMessage);
        
        return {
          taskId: taskId || "",
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return {
    executeGaslessSwapWithQuote,
    isExecuting,
    taskId,
    error,
  };
}

/**
 * Log swap volume to analytics (same logic as use-lifi.tsx)
 */
async function logSwapVolume(quote: any, txHash: string) {
  try {
    let usdValue = 0;

    const fromToken = quote.action.fromToken;
    const fromAmount = quote.action.fromAmount;
    const fromAmountNum = Number.parseFloat(fromAmount) / Math.pow(10, fromToken.decimals);

    console.log(`[Analytics] 📊 Calculating volume: ${fromAmountNum} ${fromToken.symbol}`);

    // Method 1: Stablecoins = 1:1 USD
    const stablecoins = ["USDT", "USDC", "DAI", "BUSD", "FRAX", "TUSD", "USDD", "GUSD", "USDP"];
    if (stablecoins.includes(fromToken.symbol)) {
      usdValue = fromAmountNum;
      console.log(`[Analytics] 💵 Stablecoin: ${fromToken.symbol} = $${usdValue.toFixed(2)}`);
    }
    // Method 2: Fetch price from API
    else {
      const priceResponse = await fetch(`/api/prices?symbols=${fromToken.symbol}`);
      if (priceResponse.ok) {
        const prices = await priceResponse.json();
        const tokenPrice = prices[fromToken.symbol] || 0;
        if (tokenPrice > 0) {
          usdValue = fromAmountNum * tokenPrice;
          console.log(`[Analytics] 📈 ${fromToken.symbol} @ $${tokenPrice} = $${usdValue.toFixed(2)}`);
        }
      }
    }

    console.log(`[Analytics] 💰 Final swap volume: $${usdValue.toFixed(2)}`);

    // Calculate gas fee revenue (for Gelato, this would be the gas fee they charge)
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
  } catch (error) {
    console.error("[Analytics] Error logging swap:", error);
  }
}

