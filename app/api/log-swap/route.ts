import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const swapData = await request.json();
    
    console.log('[LogSwap API] 📊 Received swap data:', {
      from: `${swapData.fromAmount} ${swapData.fromToken}`,
      to: `${swapData.toAmount} ${swapData.toToken}`,
      volume: `$${swapData.swapVolumeUsd?.toFixed(2)}`,
    });

    // CRITICAL: Must use service role key to bypass RLS and avoid "DELETE requires WHERE clause" error
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[LogSwap API] ❌ Missing Supabase credentials');
      console.error('[LogSwap API] Has URL:', !!supabaseUrl);
      console.error('[LogSwap API] Has Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
      
      // Don't fallback to anon key - it causes RLS DELETE errors
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing SUPABASE_SERVICE_ROLE_KEY. Please set this environment variable to bypass RLS.",
          hint: "The service role key bypasses Row Level Security (RLS) which prevents the 'DELETE requires WHERE clause' error."
        },
        { status: 500 }
      );
    }
    
    console.log('[LogSwap API] ✅ Using Service Role Key (bypasses RLS)');
    
    // Create client with service role key (bypasses all RLS policies)
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    // Calculate LI.FI fee (0.5% of swap volume)
    const lifiFeeUsd = swapData.swapVolumeUsd * 0.005;
    
    // Build insert data - only include fields that exist in the table
    const insertData: any = {
      timestamp: new Date().toISOString(),
      from_token: swapData.fromToken,
      to_token: swapData.toToken,
      from_amount: swapData.fromAmount,
      to_amount: swapData.toAmount,
      swap_volume_usd: swapData.swapVolumeUsd,
      wallet_address: swapData.walletAddress,
      lifi_fee_usd: lifiFeeUsd,
    };
    
    // Only add chain fields if they exist - use chain_id if both exist
    if (swapData.fromChain !== undefined) {
      insertData.from_chain_id = swapData.fromChain;
    }
    if (swapData.toChain !== undefined) {
      insertData.to_chain_id = swapData.toChain;
    }
    
    console.log('[LogSwap API] 📝 Inserting data:', JSON.stringify(insertData, null, 2));
    
    // Insert without select first - select can sometimes cause issues with certain table configs
    const { error: insertError } = await supabase
      .from('swap_analytics')
      .insert([insertData]);
    
    if (insertError) {
      console.error('[LogSwap API] ❌ Insert failed:', insertError);
      
      // Special handling for DELETE errors
      if (insertError.code === '21000' || insertError.message?.includes('DELETE requires a WHERE clause')) {
        console.error('[LogSwap API] 🔒 DELETE Error Detected - may be caused by triggers or constraints');
        console.error('[LogSwap API] Attempting to check table structure...');
        
        // Try to get table info to debug
        const { data: tableInfo, error: infoError } = await supabase
          .from('swap_analytics')
          .select('*')
          .limit(0);
        
        return NextResponse.json(
          {
            success: false,
            error: 'DELETE requires a WHERE clause',
            code: insertError.code,
            message: 'This error typically occurs when a database trigger or constraint tries to execute DELETE without WHERE clause.',
            hint: 'Check for database triggers or constraints on swap_analytics table that might be causing this.',
            details: insertError.details,
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
        },
        { status: 500 }
      );
    }
    
    // Insert succeeded - return success (we don't need to fetch the data back)
    console.log('[LogSwap API] ✅ Swap logged successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Swap logged successfully',
    });
  } catch (error) {
    console.error('[LogSwap API] ❌ Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

