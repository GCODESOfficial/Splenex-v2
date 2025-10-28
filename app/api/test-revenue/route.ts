import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('[API] Testing Supabase connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('swap_analytics')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('[API] Supabase error:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        details: error 
      });
    }
    
    console.log('[API] Supabase connection successful');
    
    // Test insert with sample data
    const testData = {
      timestamp: new Date().toISOString(),
      from_token: 'TEST',
      to_token: 'TEST',
      from_amount: '1',
      to_amount: '1',
      from_chain: 1,
      to_chain: 1,
      swap_volume_usd: 100,
      wallet_address: '0x1234567890123456789012345678901234567890',
      gas_fee_revenue: 2.5,
      original_gas_fee: 5,
      total_gas_fee: 7.5,
      additional_charge: 2.5,
      from_chain_id: 1,
      to_chain_id: 1,
    };
    
    console.log('[API] Testing insert with sample data:', testData);
    
    const { error: insertError } = await supabase
      .from('swap_analytics')
      .insert([testData]);
    
    if (insertError) {
      console.error('[API] Insert error:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: insertError.message,
        details: insertError,
        testData 
      });
    }
    
    console.log('[API] Test insert successful');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase connection and insert test successful',
      testData 
    });
    
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
