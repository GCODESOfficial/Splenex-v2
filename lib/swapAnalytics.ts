import { supabase } from './supabaseClient';

export interface SwapAnalyticsData {
  timestamp: string;
  from_token: string;
  to_token: string;
  from_amount: string;
  to_amount: string;
  from_chain: number;
  to_chain: number;
  swap_volume_usd: number;
  wallet_address: string;
  tx_hash?: string;
  gas_fee_revenue?: number;
  original_gas_fee?: number;
  total_gas_fee?: number;
  additional_charge?: number;
  from_chain_id?: number;
  to_chain_id?: number;
}

/**
 * Centralized function to log swap analytics to the database
 */
export async function logSwapAnalytics(data: SwapAnalyticsData): Promise<boolean> {
  try {
    console.log('[SwapAnalytics] 📊 Logging swap to database:', {
      from: `${data.from_amount} ${data.from_token}`,
      to: `${data.to_amount} ${data.to_token}`,
      volume: `$${data.swap_volume_usd.toFixed(2)}`,
      tx: data.tx_hash,
      wallet: data.wallet_address
    });

    const { data: insertData, error } = await supabase
      .from('swap_analytics')
      .insert([data])
      .select();

    if (error) {
      console.error('[SwapAnalytics] ❌ Failed to insert swap analytics:', error);
      return false;
    }

    console.log('[SwapAnalytics] ✅ Successfully logged swap to database:', insertData);
    return true;
  } catch (error) {
    console.error('[SwapAnalytics] ❌ Error logging swap analytics:', error);
    return false;
  }
}

/**
 * Calculate USD value for a token amount
 */
export async function calculateTokenUSDValue(
  tokenSymbol: string,
  amount: number,
  decimals: number
): Promise<number> {
  try {
    // Method 1: Stablecoins = 1:1 USD
    const stablecoins = ["USDT", "USDC", "DAI", "BUSD", "FRAX", "TUSD", "USDD", "GUSD", "USDP"];
    if (stablecoins.includes(tokenSymbol)) {
      return amount;
    }

    // Method 2: Fetch price from API
    const priceResponse = await fetch(`/api/prices?symbols=${tokenSymbol}`);
    if (priceResponse.ok) {
      const prices = await priceResponse.json();
      const tokenPrice = prices[tokenSymbol] || 0;
      if (tokenPrice > 0) {
        return amount * tokenPrice;
      }
    }

    console.warn(`[SwapAnalytics] ⚠️ Could not determine USD value for ${tokenSymbol}`);
    return 0;
  } catch (error) {
    console.error(`[SwapAnalytics] ❌ Error calculating USD value for ${tokenSymbol}:`, error);
    return 0;
  }
}

/**
 * Calculate gas fee revenue (50% tax on gas fees)
 */
export function calculateGasFeeRevenue(originalGasFee: number): {
  originalGasFee: number;
  additionalCharge: number;
  totalGasFee: number;
  revenue: number;
} {
  const additionalCharge = originalGasFee * 0.5; // 50% tax
  const totalGasFee = originalGasFee + additionalCharge;
  const revenue = additionalCharge; // Revenue is the 50% tax

  return {
    originalGasFee,
    additionalCharge,
    totalGasFee,
    revenue
  };
}

