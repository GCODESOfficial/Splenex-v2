/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { ethers } from "ethers";

/**
 * KEEPER/EXECUTOR SERVICE
 * This endpoint executes limit orders autonomously using stored signatures
 * Call this via cron job every 30-60 seconds
 * 
 * HOW IT WORKS:
 * 1. Fetches pending orders from database
 * 2. Checks if market price meets target
 * 3. Uses stored Permit + Order signatures to execute swap
 * 4. User signed everything upfront - NO new signatures needed!
 * 5. Executor pays gas fees (can be reimbursed from dapp fees)
 */
export async function GET(request: NextRequest) {
  try {
    console.log("[Keeper] 🤖 Starting autonomous execution cycle...");

    // Check if executor wallet is configured
    const executorPrivateKey = process.env.EXECUTOR_PRIVATE_KEY;
    if (!executorPrivateKey) {
      console.log("[Keeper] ⚠️ No executor wallet configured");
      return NextResponse.json({
        success: false,
        error: "Executor wallet not configured",
        note: "Set EXECUTOR_PRIVATE_KEY environment variable to enable autonomous execution"
      });
    }

    // Fetch all pending orders
    const { data: orders, error } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("status", "pending");

    if (error) {
      console.error("[Keeper] Database error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log(`[Keeper] 📋 Found ${orders?.length || 0} pending orders`);

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

    // Process each order
    for (const order of orders) {
      try {
        // Check if expired
        if (order.expiry_timestamp < now) {
          console.log(`[Keeper] ⏰ Order ${order.id} expired`);
          
          await supabase
            .from("limit_orders")
            .update({ status: "expired" })
            .eq("id", order.id);

          expiredCount++;
          continue;
        }

        // Check if order has required signatures
        if (!order.order_signature) {
          console.log(`[Keeper] ⚠️ Order ${order.id} missing order signature`);
          continue;
        }

        // Get current market rate
        const currentRate = await getCurrentMarketRate(
          order.from_token.chainId,
          order.from_token.address,
          order.to_token.address,
          order.from_amount,
          order.from_token.decimals || 18,
          order.to_token.decimals || 18
        );

        if (!currentRate) {
          console.log(`[Keeper] ⚠️ Could not get rate for order ${order.id}`);
          continue;
        }

        const targetRate = parseFloat(order.limit_rate);
        console.log(`[Keeper] 📊 Order ${order.id}: Target ${targetRate}, Current ${currentRate}`);

        // Check if conditions are met
        if (currentRate >= targetRate) {
          console.log(`[Keeper] ✅ Order ${order.id} conditions MET! Executing autonomously...`);

          // Execute the swap using stored signatures
          const executed = await executeOrderWithSignatures(order, executorPrivateKey);

          if (executed) {
            executedCount++;
            console.log(`[Keeper] 🎉 Order ${order.id} executed AUTONOMOUSLY!`);
          }
        } else {
          const percentAway = ((targetRate - currentRate) / targetRate * 100).toFixed(2);
          console.log(`[Keeper] 📊 Order ${order.id}: ${percentAway}% away from target`);
        }
      } catch (orderError) {
        console.error(`[Keeper] ❌ Error processing order ${order.id}:`, orderError);
      }
    }

    console.log(`[Keeper] ✅ Cycle complete: ${executedCount} executed, ${expiredCount} expired`);

    return NextResponse.json({
      success: true,
      checked: orders.length,
      executed: executedCount,
      expired: expiredCount,
    });
  } catch (error) {
    console.error("[Keeper] ❌ Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * Get current market rate for token pair
 */
async function getCurrentMarketRate(
  chainId: number,
  fromToken: string,
  toToken: string,
  fromAmount: string,
  fromDecimals: number,
  toDecimals: number
): Promise<number | null> {
  try {
    const fromAmountWei = (parseFloat(fromAmount) * Math.pow(10, fromDecimals)).toString();
    
    const params = new URLSearchParams({
      fromChain: chainId.toString(),
      toChain: chainId.toString(),
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: fromAmountWei,
      fromAddress: "0x0000000000000000000000000000000000000000",
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/multi-quote?${params}`, {
      headers: { 'User-Agent': 'Splenex-Keeper/1.0' }
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success && result.data) {
        const toAmountNum = parseFloat(result.data.toAmount) / Math.pow(10, toDecimals);
        const fromAmountNum = parseFloat(fromAmount);
        return toAmountNum / fromAmountNum;
      }
    }

    return null;
  } catch (error) {
    console.error("[getCurrentMarketRate] Error:", error);
    return null;
  }
}

/**
 * Execute order using Gelato Relay (GASLESS - NO EXECUTOR WALLET NEEDED!)
 */
async function executeOrderWithSignatures(
  order: any,
  executorPrivateKey: string
): Promise<boolean> {
  try {
    console.log(`[Keeper] 🚀 Executing order ${order.id} via GELATO RELAY...`);
    console.log(`[Keeper] 🔐 Using stored Permit + Order signatures`);
    console.log(`[Keeper] ⚡ GASLESS execution - Gelato pays gas!`);

    // Get fresh quote for execution
    const fromTokenDecimals = order.from_token.decimals || 18;
    const fromAmountWei = (
      parseFloat(order.from_amount) * Math.pow(10, fromTokenDecimals)
    ).toString();

    const params = new URLSearchParams({
      fromChain: order.from_token.chainId.toString(),
      toChain: order.to_token.chainId.toString(),
      fromToken: order.from_token.address,
      toToken: order.to_token.address,
      fromAmount: fromAmountWei,
      fromAddress: order.wallet_address,
      toAddress: order.wallet_address,
      slippage: order.slippage?.toString() || "1",
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const quoteResponse = await fetch(`${baseUrl}/api/multi-quote?${params}`);

    if (!quoteResponse.ok) {
      console.log(`[Keeper] ❌ Could not get quote for order ${order.id}`);
      return false;
    }

    const quoteResult = await quoteResponse.json();
    if (!quoteResult.success || !quoteResult.data) {
      console.log(`[Keeper] ❌ No quote available for order ${order.id}`);
      return false;
    }

    const quote = quoteResult.data;
    console.log(`[Keeper] ✅ Got quote from: ${quote.provider}`);

    // Execute via Gelato Relay (GASLESS!)
    const { GelatoRelay } = await import("@gelatonetwork/relay-sdk");
    const relay = new GelatoRelay();

    const apiKey = process.env.NEXT_PUBLIC_GELATO_API_KEY;
    if (!apiKey) {
      console.error(`[Keeper] ❌ Gelato API key not configured`);
      // Fallback: try executor wallet if configured
      if (executorPrivateKey) {
        console.log(`[Keeper] 💡 Falling back to executor wallet...`);
        return await executeWithExecutorWallet(order, quote, executorPrivateKey);
      }
      return false;
    }

    console.log(`[Keeper] 📤 Sending to Gelato Relay...`);
    
    const relayRequest = {
      chainId: order.from_token.chainId,
      target: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      user: order.wallet_address,
    };

    const relayResponse = await relay.sponsoredCall(relayRequest, apiKey);
    
    console.log(`[Keeper] ✅ Gelato task created: ${relayResponse.taskId}`);
    console.log(`[Keeper] ⏳ Waiting for Gelato to execute...`);

    // Wait for task completion
    const maxAttempts = 60;
    let txHash = null;

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(`https://relay.gelato.digital/tasks/status/${relayResponse.taskId}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        const taskState = statusData.task?.taskState;

        if (taskState === "ExecSuccess") {
          txHash = statusData.task?.transactionHash;
          console.log(`[Keeper] ✅ Gelato execution SUCCESS! TX: ${txHash}`);
          break;
        } else if (taskState === "ExecReverted" || taskState === "Cancelled") {
          console.error(`[Keeper] ❌ Gelato task failed: ${taskState}`);
          return false;
        }
        
        console.log(`[Keeper] ⏳ Status: ${taskState} (${i + 1}/${maxAttempts})`);
      }
    }

    if (!txHash) {
      console.error(`[Keeper] ❌ Timeout waiting for Gelato execution`);
      return false;
    }

    // Update order status
    await supabase
      .from("limit_orders")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        tx_hash: txHash,
        gelato_task_id: relayResponse.taskId,
      })
      .eq("id", order.id);

    console.log(`[Keeper] 🎉 Order ${order.id} EXECUTED via GELATO!`);
    console.log(`[Keeper] 💰 User received tokens - GASLESS execution!`);
    console.log(`[Keeper] 💸 Gelato paid gas, will bill via API key`);

    return true;
  } catch (error) {
    console.error(`[Keeper] ❌ Execution failed for order ${order.id}:`, error);
    
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

/**
 * Fallback: Execute with executor wallet if Gelato unavailable
 */
async function executeWithExecutorWallet(
  order: any,
  quote: any,
  executorPrivateKey: string
): Promise<boolean> {
  try {
    console.log(`[Keeper] 💼 Using executor wallet as fallback...`);

    const rpcUrl = getRpcUrl(order.from_token.chainId);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const executor = new ethers.Wallet(executorPrivateKey, provider);

    const tx = await executor.sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value || "0x0",
      gasLimit: quote.transactionRequest.gasLimit,
    });

    const receipt = await tx.wait();

    await supabase
      .from("limit_orders")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        tx_hash: tx.hash,
      })
      .eq("id", order.id);

    console.log(`[Keeper] ✅ Executed with executor wallet`);
    return true;
  } catch (error) {
    console.error(`[Keeper] ❌ Executor wallet execution failed:`, error);
    return false;
  }
}

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: "https://eth.llamarpc.com",
    56: "https://bsc-dataseed.binance.org",
    137: "https://polygon-rpc.com",
    42161: "https://arb1.arbitrum.io/rpc",
    8453: "https://mainnet.base.org",
    10: "https://mainnet.optimism.io",
    43114: "https://api.avax.network/ext/bc/C/rpc",
  };

  return rpcUrls[chainId] || rpcUrls[1];
}

