import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    console.log("🔍 Testing Supabase connection...");
    
    // Test basic connection
    const { data, error } = await supabase
      .from('swap_analytics')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("❌ Supabase connection failed:", error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 });
    }
    
    console.log("✅ Supabase connection successful!");
    
    // Test insert with minimal data
    const testData = {
      timestamp: new Date().toISOString(),
      from_token: 'TEST',
      to_token: 'TEST',
      from_amount: '1',
      to_amount: '1',
      from_chain: 1,
      to_chain: 1,
      swap_volume_usd: 1,
      wallet_address: '0x0000000000000000000000000000000000000000',
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('swap_analytics')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error("❌ Insert test failed:", insertError);
      return NextResponse.json({ 
        success: false, 
        insertError: insertError.message,
        insertCode: insertError.code,
        insertDetails: insertError.details,
        insertHint: insertError.hint
      }, { status: 500 });
    }
    
    console.log("✅ Insert test successful!");
    
    // Clean up test data
    if (insertData && insertData.length > 0) {
      await supabase
        .from('swap_analytics')
        .delete()
        .eq('id', insertData[0].id);
      console.log("🧹 Test data cleaned up");
    }
    
    return NextResponse.json({ 
      success: true, 
      message: "Supabase connection and insert test successful",
      testData: insertData
    });
    
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
