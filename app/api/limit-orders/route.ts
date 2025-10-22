/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// POST: Create a new limit order
export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();

    console.log("[LimitOrderAPI] Received new limit order:", orderData);

    // Validate required fields
    if (!orderData.walletAddress || !orderData.fromToken || !orderData.toToken) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Insert order into database
    const insertData: any = {
      wallet_address: orderData.walletAddress.toLowerCase(),
      from_token: orderData.fromToken,
      to_token: orderData.toToken,
      from_amount: orderData.fromAmount,
      limit_rate: orderData.limitRate,
      to_amount: orderData.toAmount,
      expiry_timestamp: orderData.expiryTimestamp,
      slippage: orderData.slippage,
      status: "pending",
      signature: orderData.signature,
      message: orderData.message,
      created_at: orderData.createdAt,
    };

    // Store permit signature (for gasless token approval)
    if (orderData.permitSignature) {
      insertData.permit_signature = orderData.permitSignature;
    }
    
    // Store order signature (EIP-712 authorization)
    if (orderData.orderSignature) {
      insertData.order_signature = orderData.orderSignature;
    }
    
    // Store executor address
    if (orderData.executorAddress) {
      insertData.executor_address = orderData.executorAddress;
    }
    
    // Store signed swap transaction (for auto-execution)
    if (orderData.signedSwapTransaction) {
      insertData.signed_swap_transaction = orderData.signedSwapTransaction;
    }
    
    // Store swap transaction data
    if (orderData.swapTransactionData) {
      insertData.swap_transaction_data = orderData.swapTransactionData;
    }

    const { data, error } = await supabase
      .from("limit_orders")
      .insert([insertData])
      .select();

    if (error) {
      console.error("[LimitOrderAPI] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("[LimitOrderAPI] Order saved successfully:", data);

    return NextResponse.json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error("[LimitOrderAPI] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

// GET: Fetch limit orders for a wallet
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("walletAddress");
    const status = searchParams.get("status") || "pending";

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: "Wallet address required" },
        { status: 400 }
      );
    }

    console.log(`[LimitOrderAPI] Fetching ${status} orders for:`, walletAddress);

    const { data, error } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("wallet_address", walletAddress.toLowerCase())
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[LimitOrderAPI] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`[LimitOrderAPI] Found ${data?.length || 0} orders`);

    return NextResponse.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error("[LimitOrderAPI] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

// DELETE: Cancel a limit order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID required" },
        { status: 400 }
      );
    }

    console.log("[LimitOrderAPI] Cancelling order:", orderId);

    const { error } = await supabase
      .from("limit_orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);

    if (error) {
      console.error("[LimitOrderAPI] Database error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("[LimitOrderAPI] Order cancelled successfully");

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("[LimitOrderAPI] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

