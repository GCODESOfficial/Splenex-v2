import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const last24Hours = searchParams.get('last24Hours') === 'true';
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ count: 0 });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
      .from('swap_analytics')
      .select('*', { count: 'exact', head: true });

    // If requesting last 24 hours, filter by timestamp
    if (last24Hours) {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      query = query.gte('timestamp', twentyFourHoursAgo.toISOString());
    }
    
    const { count, error } = await query;

    if (error) {
      return NextResponse.json({ count: 0 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    return NextResponse.json({ count: 0 });
  }
}
