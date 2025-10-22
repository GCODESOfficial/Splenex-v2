/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLiFi } from "./use-lifi";

/**
 * Client-side limit order monitor
 * Runs while user is online and automatically checks + executes limit orders
 */
export function useLimitOrderMonitor(walletAddress: string | null, isConnected: boolean) {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(0);
  const { getQuote } = useLiFi();
  const executingOrders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!walletAddress || !isConnected) {
      setIsMonitoring(false);
      return;
    }

    setIsMonitoring(true);
    console.log("[LimitOrderMonitor] 🚀 Starting client-side monitoring...");

    const checkAndExecuteOrders = async () => {
      try {
        // Fetch pending orders for this wallet
        const { data: orders, error } = await supabase
          .from("limit_orders")
          .select("*")
          .eq("wallet_address", walletAddress.toLowerCase())
          .eq("status", "pending");

        if (error || !orders || orders.length === 0) {
          return;
        }

        console.log(`[LimitOrderMonitor] 📋 Found ${orders.length} pending order(s)`);

        const now = Date.now();

        // Check each order
        for (const order of orders) {
          // Skip if already executing
          if (executingOrders.current.has(order.id)) {
            continue;
          }

          // Check if expired
          if (order.expiry_timestamp < now) {
            console.log(`[LimitOrderMonitor] ⏰ Order ${order.id} expired`);
            await supabase
              .from("limit_orders")
              .update({ status: "expired" })
              .eq("id", order.id);
            continue;
          }

          try {
            // Get current market rate using LiFi
            const fromToken = order.from_token;
            const toToken = order.to_token;
            const fromAmount = order.from_amount;

            // Calculate amount in wei
            const fromTokenDecimals = fromToken.decimals || 18;
            const fromAmountWei = (
              parseFloat(fromAmount) * Math.pow(10, fromTokenDecimals)
            ).toString();

            console.log(`[LimitOrderMonitor] 🔍 Checking order ${order.id}: ${fromAmount} ${fromToken.symbol} → ${toToken.symbol}`);
            console.log(`[LimitOrderMonitor]    Target rate: ${order.limit_rate}`);

            // Get quote to check current rate
            const quote = await getQuote({
              fromChain: fromToken.chainId,
              toChain: toToken.chainId,
              fromToken: fromToken.address,
              toToken: toToken.address,
              fromAmount: fromAmountWei,
              fromAddress: walletAddress,
              toAddress: walletAddress,
              slippage: order.slippage || 1,
            });

            if (!quote) {
              console.log(`[LimitOrderMonitor]    ⚠️ Could not get quote`);
              continue;
            }

            // Calculate current rate
            const toTokenDecimals = toToken.decimals || 18;
            const toAmount = parseFloat(quote.estimate.toAmount) / Math.pow(10, toTokenDecimals);
            const currentRate = toAmount / parseFloat(fromAmount);

            console.log(`[LimitOrderMonitor]    Current rate: ${currentRate.toFixed(6)}`);

            // Check if current rate meets or exceeds limit rate
            const targetRate = parseFloat(order.limit_rate);
            if (currentRate >= targetRate) {
              console.log(`[LimitOrderMonitor] ✅ RATE REACHED! Auto-executing order ${order.id}...`);

              // Mark as executing
              executingOrders.current.add(order.id);

              // Store quote and mark as ready
              await supabase
                .from("limit_orders")
                .update({ 
                  execution_quote: quote,
                  ready_for_execution: true,
                  quote_fetched_at: new Date().toISOString(),
                })
                .eq("id", order.id);

              console.log(`[LimitOrderMonitor] 💾 Order marked as ready for execution`);
              console.log(`[LimitOrderMonitor] 🎯 You signed this order initially - executing automatically...`);

              // Execute automatically - NO NEW SIGNATURE NEEDED!
              // The initial signature when creating the order is the authorization
              const executed = await executeOrderAutomatic(order, quote, walletAddress);

              if (executed) {
                console.log(`[LimitOrderMonitor] 🎉 Order executed successfully without re-signing!`);
              } else {
                console.log(`[LimitOrderMonitor] ⚠️ Automatic execution needs user confirmation (browser security)`);
              }

              // Remove from executing set
              executingOrders.current.delete(order.id);
            } else {
              const percentageAway = ((targetRate - currentRate) / targetRate * 100).toFixed(2);
              console.log(`[LimitOrderMonitor]    📊 ${percentageAway}% away from target`);
            }
          } catch (orderError) {
            console.error(`[LimitOrderMonitor] ❌ Error checking order ${order.id}:`, orderError);
            executingOrders.current.delete(order.id);
          }
        }

        setLastCheck(Date.now());
      } catch (error) {
        console.error("[LimitOrderMonitor] ❌ Monitor error:", error);
      }
    };

    // Initial check
    checkAndExecuteOrders();

    // Check every 30 seconds
    const interval = setInterval(checkAndExecuteOrders, 30000);

    return () => {
      clearInterval(interval);
      console.log("[LimitOrderMonitor] 🛑 Monitoring stopped");
    };
  }, [walletAddress, isConnected, getQuote]);

  return {
    isMonitoring,
    lastCheck,
  };
}

/**
 * Execute a limit order AUTOMATICALLY 
 * Uses pre-signed transaction if available (ZERO popups!)
 * Otherwise uses stored quote (ONE confirmation)
 */
async function executeOrderAutomatic(order: any, quote: any, walletAddress: string) {
  try {
    console.log(`[LimitOrderMonitor] 💫 Auto-executing order ${order.id}...`);

    // Fetch full order data to check for pre-signed transaction
    const { data: orderData, error: fetchError } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("id", order.id)
      .single();

    if (fetchError || !orderData) {
      throw new Error("Could not fetch order data");
    }

    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No wallet provider found");
    }

    const ethereum = (window as any).ethereum;

    // Method 1: Use pre-signed transaction (BEST - ZERO POPUPS!)
    if (orderData.presigned_transaction) {
      console.log(`[LimitOrderMonitor] 🚀 Using PRE-SIGNED transaction!`);
      console.log(`[LimitOrderMonitor] ⚡ Broadcasting without any popup...`);

      try {
        const txHash = await ethereum.request({
          method: "eth_sendRawTransaction",
          params: [orderData.presigned_transaction],
        });

        console.log(`[LimitOrderMonitor] ✅ PRE-SIGNED transaction broadcast! Hash: ${txHash}`);
        console.log(`[LimitOrderMonitor] 🎉 ZERO POPUPS - Completely silent execution!`);

        // Update order status
        await supabase
          .from("limit_orders")
          .update({ 
            status: "executed",
            executed_at: new Date().toISOString(),
            tx_hash: txHash,
          })
          .eq("id", order.id);

        // Show success notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Limit Order Executed Silently! 🎉', {
            body: `Your order for ${order.from_amount} ${order.from_token.symbol} → ${order.to_token.symbol} executed with ZERO popups!`,
            icon: '/images/token-icon.svg',
          });
        }

        return true;
      } catch (rawTxError: any) {
        console.warn(`[LimitOrderMonitor] ⚠️ Pre-signed tx broadcast failed:`, rawTxError);
        console.log(`[LimitOrderMonitor] 💡 Falling back to standard execution...`);
        // Fall through to Method 2
      }
    }

    // Method 2: Standard execution with stored quote (ONE confirmation)
    console.log(`[LimitOrderMonitor] 📤 Using standard execution method...`);
    console.log(`[LimitOrderMonitor] ℹ️ Will show ONE confirmation popup`);

    try {
      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from: walletAddress,
          to: quote.transactionRequest.to,
          data: quote.transactionRequest.data,
          value: quote.transactionRequest.value || "0x0",
          gas: quote.transactionRequest.gasLimit,
        }],
      });

      console.log(`[LimitOrderMonitor] ✅ Transaction sent! Hash: ${txHash}`);
      console.log(`[LimitOrderMonitor] 🎉 Order executed (with one confirmation)!`);

      // Update order status
      await supabase
        .from("limit_orders")
        .update({ 
          status: "executed",
          executed_at: new Date().toISOString(),
          tx_hash: txHash,
        })
        .eq("id", order.id);

      // Show success notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Limit Order Executed! 🎉', {
          body: `Your order for ${order.from_amount} ${order.from_token.symbol} → ${order.to_token.symbol} has been executed!`,
          icon: '/images/token-icon.svg',
        });
      }

      return true;
    } catch (txError: any) {
      const errMsg = txError?.message || String(txError);
      
      if (errMsg.includes("User rejected") || errMsg.includes("user rejected")) {
        console.log(`[LimitOrderMonitor] ℹ️ User rejected execution`);
        return false;
      }
      
      throw txError;
    }
  } catch (error) {
    console.error(`[LimitOrderMonitor] ❌ Auto-execution failed:`, error);
    
    // Keep order as ready for retry
    await supabase
      .from("limit_orders")
      .update({ 
        last_execution_attempt: new Date().toISOString(),
        last_execution_error: error instanceof Error ? error.message : String(error),
      })
      .eq("id", order.id);
    
    return false;
  }
}

