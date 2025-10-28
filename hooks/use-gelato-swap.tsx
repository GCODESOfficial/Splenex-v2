/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { executeGaslessSwap, waitForTaskCompletion, isGelatoSupported } from "@/lib/relayer";
import { supabase } from "@/lib/supabaseClient";
import { calculateGasRevenue } from "@/config/revenue";
import { logSwapAnalytics, calculateTokenUSDValue, calculateGasFeeRevenue } from "@/lib/swapAnalytics";

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
 * Log swap volume to analytics - NOW ACTUALLY INSERTS TO DATABASE
 */
async function logSwapVolume(quote: any, txHash: string) {
  try {
    const fromToken = quote.action.fromToken;
    const toToken = quote.action.toToken;
    const fromAmount = quote.action.fromAmount;
    const toAmount = quote.estimate?.toAmount || "0";
    const fromAmountNum = Number.parseFloat(fromAmount) / Math.pow(10, fromToken.decimals);
    const toAmountNum = Number.parseFloat(toAmount) / Math.pow(10, toToken.decimals);

    console.log(`[Analytics] 📊 Calculating volume: ${fromAmountNum} ${fromToken.symbol} -> ${toAmountNum} ${toToken.symbol}`);

    // Calculate USD value using centralized function
    const usdValue = await calculateTokenUSDValue(fromToken.symbol, fromAmountNum, fromToken.decimals);

    console.log(`[Analytics] 💰 Final swap volume: $${usdValue.toFixed(2)}`);

    // Calculate gas fee revenue
    let gasFeeRevenue = 0;
    let originalGasFee = 0;
    let additionalCharge = 0;
    let totalGasFee = 0;

    try {
      const gasCosts = quote.estimate?.gasCosts?.[0];
      if (gasCosts && gasCosts.amountUSD) {
        const gasRevenue = calculateGasRevenue(gasCosts.amountUSD);
        gasFeeRevenue = gasRevenue.revenue;
        originalGasFee = gasRevenue.originalGasFee;
        additionalCharge = gasRevenue.additionalCharge;
        totalGasFee = gasRevenue.totalGasFee;
        
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

    // NOW ACTUALLY INSERT TO DATABASE
    const swapData = {
      timestamp: new Date().toISOString(),
      from_token: fromToken.symbol,
      to_token: toToken.symbol,
      from_amount: fromAmountNum.toString(),
      to_amount: toAmountNum.toString(),
      from_chain: fromToken.chainId || 1,
      to_chain: toToken.chainId || 1,
      swap_volume_usd: usdValue,
      wallet_address: quote.action.fromAddress || 'unknown',
      tx_hash: txHash,
      gas_fee_revenue: gasFeeRevenue,
      original_gas_fee: originalGasFee,
      total_gas_fee: totalGasFee,
      additional_charge: additionalCharge,
      from_chain_id: fromToken.chainId || 1,
      to_chain_id: toToken.chainId || 1,
    };

    const success = await logSwapAnalytics(swapData);
    
    if (success) {
      console.log(`[Gelato] ✅ Swap analytics logged successfully: $${usdValue.toFixed(2)} USD, Gas revenue: $${gasFeeRevenue.toFixed(2)}`);
    } else {
      console.error(`[Gelato] ❌ Failed to log swap analytics to database`);
    }
  } catch (error) {
    console.error("[Analytics] Error logging swap:", error);
  }
}

