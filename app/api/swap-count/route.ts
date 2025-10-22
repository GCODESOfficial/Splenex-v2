import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    // Get the total count of swaps from the database
    const { count, error } = await supabase
      .from('swap_analytics')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[Swap Count API] Error:', error);
      return NextResponse.json({ count: 0, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      count: count || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Swap Count API] Unexpected error:', error);
    return NextResponse.json({ 
      count: 0, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
