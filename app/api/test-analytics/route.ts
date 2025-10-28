import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    console.log("🔍 Testing swap analytics database...");
    
    // Test basic connection
    const { data, error } = await supabase
      .from('swap_analytics')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5);
    
    if (error) {
      console.error("❌ Database error:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code
      }, { status: 500 });
    }
    
    console.log("✅ Database connection successful!");
    
    if (!data || data.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No swaps found in database",
        swaps: [],
        totalRevenue: 0
      });
    }
    
    // Calculate total revenue
    const totalRevenue = data.reduce((sum, swap) => {
      return sum + Number(swap.gas_fee_revenue || swap.additional_charge || 0);
    }, 0);
    
    console.log(`💰 Total revenue from recent swaps: $${totalRevenue.toFixed(2)}`);
    
    return NextResponse.json({ 
      success: true, 
      message: "Database test successful",
      swaps: data,
      totalRevenue: totalRevenue,
      swapCount: data.length
    });
    
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
