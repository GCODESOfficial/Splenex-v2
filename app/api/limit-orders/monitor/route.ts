/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * Monitor and execute limit orders
 * This endpoint should be called periodically (e.g., via a cron job)
 * It checks all pending limit orders and executes them if the target rate is reached
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[LimitOrderMonitor] Starting monitoring cycle...");

    // Fetch all pending limit orders
    const { data: orders, error } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("status", "pending");

    if (error) {
      console.error("[LimitOrderMonitor] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`[LimitOrderMonitor] Found ${orders?.length || 0} pending orders`);

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending orders",
        checked: 0,
        executed: 0,
        expired: 0,
      });
    }

    const now = Date.now();
    let executedCount = 0;
    let expiredCount = 0;

    // Check each order
    for (const order of orders) {
      try {
        // Check if order has expired
        if (order.expiry_timestamp < now) {
          console.log(`[LimitOrderMonitor] Order ${order.id} expired`);
          
          await supabase
            .from("limit_orders")
            .update({ status: "expired" })
            .eq("id", order.id);

          expiredCount++;
          continue;
        }

        // Get current market rate for the token pair
        const currentRate = await getCurrentMarketRate(
          order.from_token.chainId,
          order.from_token.address,
          order.to_token.address,
          order.from_amount
        );

        if (!currentRate) {
          console.log(`[LimitOrderMonitor] Could not get rate for order ${order.id}`);
          continue;
        }

        console.log(`[LimitOrderMonitor] Order ${order.id}: Target rate: ${order.limit_rate}, Current rate: ${currentRate}`);

        // Check if current rate meets or exceeds limit rate
        const targetRate = parseFloat(order.limit_rate);
        if (currentRate >= targetRate) {
          console.log(`[LimitOrderMonitor] ✅ Order ${order.id} rate reached! Executing...`);

          // Execute the swap
          const executed = await executeSwapForOrder(order);

          if (executed) {
            await supabase
              .from("limit_orders")
              .update({ 
                status: "executed",
                executed_at: new Date().toISOString(),
              })
              .eq("id", order.id);

            executedCount++;
            console.log(`[LimitOrderMonitor] ✅ Order ${order.id} executed successfully`);
          } else {
            console.log(`[LimitOrderMonitor] ⚠️ Failed to execute order ${order.id}`);
          }
        }
      } catch (error) {
        console.error(`[LimitOrderMonitor] Error processing order ${order.id}:`, error);
      }
    }

    console.log(`[LimitOrderMonitor] Monitoring cycle complete: ${executedCount} executed, ${expiredCount} expired`);

    return NextResponse.json({
      success: true,
      checked: orders.length,
      executed: executedCount,
      expired: expiredCount,
    });
  } catch (error) {
    console.error("[LimitOrderMonitor] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

/**
 * Get current market rate for a token pair
 */
async function getCurrentMarketRate(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  fromAmount: string
): Promise<number | null> {
  try {
    // Normalize native token addresses
    const normalizedFromToken = ["ETH", "BNB", "MATIC"].includes(fromTokenAddress)
      ? "0x0000000000000000000000000000000000000000"
      : fromTokenAddress;
    const normalizedToToken = ["ETH", "BNB", "MATIC"].includes(toTokenAddress)
      ? "0x0000000000000000000000000000000000000000"
      : toTokenAddress;

    // Try multi-aggregator quote
    const params = new URLSearchParams({
      fromChain: chainId.toString(),
      toChain: chainId.toString(),
      fromToken: normalizedFromToken,
      toToken: normalizedToToken,
      fromAmount: fromAmount,
      fromAddress: "0x0000000000000000000000000000000000000000", // Dummy address for rate check
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/multi-quote?${params}`);

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        // Calculate rate from quote
        const toAmount = parseFloat(result.data.toAmount);
        const fromAmountNum = parseFloat(fromAmount);
        const rate = toAmount / fromAmountNum;
        
        console.log(`[getCurrentMarketRate] Rate: ${rate} (${toAmount} / ${fromAmountNum})`);
        return rate;
      }
    }

    return null;
  } catch (error) {
    console.error("[getCurrentMarketRate] Error:", error);
    return null;
  }
}

/**
 * Execute a swap for a limit order
 * Uses multi-aggregator system to get best quote and execute
 */
async function executeSwapForOrder(order: any): Promise<boolean> {
  try {
    console.log(`[executeSwapForOrder] Executing order ${order.id}`);
    
    const fromToken = order.from_token;
    const toToken = order.to_token;
    
    // Calculate amount in wei
    const fromTokenDecimals = fromToken.decimals || 18;
    const fromAmountWei = (
      parseFloat(order.from_amount) * Math.pow(10, fromTokenDecimals)
    ).toString();
    
    console.log(`[executeSwapForOrder] Getting quote for ${order.from_amount} ${fromToken.symbol} → ${toToken.symbol}`);
    
    // Get a fresh quote using multi-aggregator
    const params = new URLSearchParams({
      fromChain: fromToken.chainId.toString(),
      toChain: toToken.chainId.toString(),
      fromToken: fromToken.address,
      toToken: toToken.address,
      fromAmount: fromAmountWei,
      fromAddress: order.wallet_address,
      toAddress: order.wallet_address,
      slippage: order.slippage.toString(),
    });
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const quoteResponse = await fetch(`${baseUrl}/api/multi-quote?${params}`);
    
    if (!quoteResponse.ok) {
      console.log(`[executeSwapForOrder] Failed to get quote: ${quoteResponse.status}`);
      return false;
    }
    
    const quoteResult = await quoteResponse.json();
    
    if (!quoteResult.success || !quoteResult.data) {
      console.log(`[executeSwapForOrder] No quote available`);
      return false;
    }
    
    console.log(`[executeSwapForOrder] Got quote from ${quoteResult.data.provider}`);
    console.log(`[executeSwapForOrder] Will receive ${quoteResult.data.toAmount} (min: ${quoteResult.data.toAmountMin})`);
    
    // NOTE: Actual transaction execution requires:
    // 1. Backend wallet with gas funds
    // 2. Secure key management (AWS KMS, HashiCorp Vault, etc.)
    // 3. Transaction relay service
    // 4. Proper nonce management
    //
    // For now, mark order as ready for execution
    // The user will be notified to execute when they're online
    console.log(`[executeSwapForOrder] ✅ Order ${order.id} conditions met - ready for user execution`);
    console.log(`[executeSwapForOrder] Quote: ${quoteResult.data.provider.toUpperCase()}`);
    console.log(`[executeSwapForOrder] Expected output: ${quoteResult.data.toAmount}`);
    
    // Store the quote data for user execution
    await supabase
      .from("limit_orders")
      .update({ 
        execution_quote: quoteResult.data,
        ready_for_execution: true,
        quote_fetched_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    
    // Return false for now (user execution needed)
    // When backend wallet is implemented, return true after successful execution
    return false;
  } catch (error) {
    console.error(`[executeSwapForOrder] Error:`, error);
    return false;
  }
}

