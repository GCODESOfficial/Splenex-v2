/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * Execute a ready limit order
 * This is called by the client when an order is marked as ready_for_execution
 * The execution happens automatically using the stored quote and original signature
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: "Order ID required" },
        { status: 400 }
      );
    }

    console.log(`[LimitOrderExecute] 🚀 Executing order ${orderId}...`);

    // Fetch the order
    const { data: order, error: fetchError } = await supabase
      .from("limit_orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      console.error("[LimitOrderExecute] Order not found:", fetchError);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    // Verify order is ready for execution
    if (!order.ready_for_execution || !order.execution_quote) {
      console.log("[LimitOrderExecute] Order not ready for execution");
      return NextResponse.json(
        { success: false, error: "Order not ready for execution" },
        { status: 400 }
      );
    }

    // Verify order is still pending
    if (order.status !== "pending") {
      console.log(`[LimitOrderExecute] Order status is ${order.status}, not pending`);
      return NextResponse.json(
        { success: false, error: `Order is ${order.status}` },
        { status: 400 }
      );
    }

    // Verify not expired
    if (order.expiry_timestamp < Date.now()) {
      await supabase
        .from("limit_orders")
        .update({ status: "expired" })
        .eq("id", orderId);

      return NextResponse.json(
        { success: false, error: "Order has expired" },
        { status: 400 }
      );
    }

    console.log("[LimitOrderExecute] ✅ Order verified and ready");
    console.log("[LimitOrderExecute] 📝 Original signature:", order.signature?.substring(0, 20) + "...");
    console.log("[LimitOrderExecute] 💰 Quote provider:", order.execution_quote.provider);

    // Return the execution data to client
    // Client will execute using their wallet (one-click, they already signed the order)
    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        wallet_address: order.wallet_address,
        from_token: order.from_token,
        to_token: order.to_token,
        from_amount: order.from_amount,
        signature: order.signature,
        message: order.message,
      },
      quote: order.execution_quote,
    });
  } catch (error) {
    console.error("[LimitOrderExecute] Error:", error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}

