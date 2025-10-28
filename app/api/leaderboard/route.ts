import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'

interface WalletStats {
  wallet_address: string;
  trading_volume: number;
  transaction_count: number;
  first_transaction_date: string;
  last_transaction_date: string;
  unique_chains: number;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Credentials missing" }, { status: 500 });
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch all swap analytics data
    const { data: swaps, error } = await supabase
      .from('swap_analytics')
      .select('wallet_address, swap_volume_usd, timestamp')
      .order('timestamp', { ascending: false });
    
    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (!swaps || swaps.length === 0) {
      return NextResponse.json([]);
    }
    
    // Group by wallet address and calculate stats
    const walletMap = new Map<string, WalletStats>();
    
    for (const swap of swaps) {
      const wallet = swap.wallet_address;
      const volume = Number(swap.swap_volume_usd || 0);
      const timestamp = swap.timestamp;
      
      if (!wallet) continue;
      
      if (!walletMap.has(wallet)) {
        walletMap.set(wallet, {
          wallet_address: wallet,
          trading_volume: 0,
          transaction_count: 0,
          first_transaction_date: timestamp,
          last_transaction_date: timestamp,
          unique_chains: 0,
        });
      }
      
      const stats = walletMap.get(wallet)!;
      stats.trading_volume += volume;
      stats.transaction_count += 1;
      
      // Update first and last transaction dates
      if (timestamp < stats.first_transaction_date) {
        stats.first_transaction_date = timestamp;
      }
      if (timestamp > stats.last_transaction_date) {
        stats.last_transaction_date = timestamp;
      }
    }
    
    // Convert map to array and calculate active days
    const leaderboardData = Array.from(walletMap.values()).map((stats) => {
      const firstDate = new Date(stats.first_transaction_date);
      const lastDate = new Date(stats.last_transaction_date);
      const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const activeDays = diffDays === 0 ? 1 : diffDays;
      
      return {
        ...stats,
        active_days: activeDays,
      };
    });
    
    // Sort by trading volume (descending) and add rank
    const sortedData = leaderboardData
      .sort((a, b) => b.trading_volume - a.trading_volume)
      .map((entry, index) => {
        // Top 3 ranks use image paths, others use numbers
        const rankImages = [
          "/images/medal-first-place.svg",
          "/images/medal-second-place.svg",
          "/images/medal-third-place.svg",
        ];
        
        return {
          rank: index < 3 ? rankImages[index] : index + 1,
          wallet: entry.wallet_address,
          tradingVolume: formatVolume(entry.trading_volume),
          transactionCount: entry.transaction_count,
          activeDays: entry.active_days,
        };
      });
    
    return NextResponse.json(sortedData);
  } catch (error: any) {
    console.error("Error fetching leaderboard data:", error);
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

// Helper function to format volume
function formatVolume(volume: number): string {
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(2)}M`;
  } else if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(2)}K`;
  } else {
    return `$${volume.toFixed(2)}`;
  }
}

