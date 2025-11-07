/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";

export interface DashboardMetrics {
  totalVolume: number;
  transactionCount: number;
  totalUsers: number;
  networkRevenue: number;
  dailyData: { day: string; volume: number; transactions: number }[];
}

export function useAnalytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalVolume: 0,
    transactionCount: 0,
    totalUsers: 0,
    networkRevenue: 0,
    dailyData: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setIsLoading(true);

        // Fetch data from API route
        console.log("[Analytics] 🔍 Fetching analytics from API...");
        
        const response = await fetch("/api/analytics");
        
        if (!response.ok) {
          console.error("[Analytics] ❌ API error:", response.status);
          setIsLoading(false);
          return;
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          console.log("[Analytics] ⚠️ No swap data found");
          setIsLoading(false);
          return;
        }

        console.log(`[Analytics] ✅ Found ${data.length} swaps`);

        // Calculate metrics from API data
        const totalVolume = data.reduce((sum: number, row: any) => {
          return sum + Number(row.swap_volume_usd || 0);
        }, 0);

        const transactionCount = data.length;

        // Count unique users (wallet addresses)
        const uniqueUsers = new Set(
          data.map((row: any) => row.wallet_address?.toLowerCase())
        ).size;

        // Calculate actual revenue: gas fees + LI.FI fees
        const gasFeeRevenue = data.reduce((sum: number, row: any) => {
          return sum + Number(row.gas_fee_revenue || row.additional_charge || 0);
        }, 0);

        const lifiFeeRevenue = data.reduce((sum: number, row: any) => {
          return sum + Number(row.lifi_fee_usd || 0);
        }, 0);

        // Network revenue = gas fee revenue + LI.FI fees
        const networkRevenue = gasFeeRevenue + lifiFeeRevenue;
        
        console.log(`[Analytics] 📊 Calculated metrics:`);
        console.log(`[Analytics]   - Total Volume: $${totalVolume.toFixed(2)}`);
        console.log(`[Analytics]   - Transaction Count: ${transactionCount}`);
        console.log(`[Analytics]   - Unique Users: ${uniqueUsers}`);
        console.log(`[Analytics]   - Gas Fee Revenue: $${gasFeeRevenue.toFixed(2)}`);
        console.log(`[Analytics]   - LI.FI Fee Revenue: $${lifiFeeRevenue.toFixed(2)}`);
        console.log(`[Analytics]   - Network Revenue: $${networkRevenue.toFixed(2)}`);

        // Group by day for chart
        const grouped: Record<string, { volume: number; transactions: number }> = {};
        data.forEach((row: any) => {
          const timestamp = row.created_at || row.timestamp || new Date().toISOString();
          const day = new Date(timestamp).toISOString().split("T")[0];
          const volume = Number(row.swap_volume_usd || 0);

          if (!grouped[day]) {
            grouped[day] = { volume: 0, transactions: 0 };
          }
          grouped[day].volume += volume;
          grouped[day].transactions += 1;
        });

        const dailyData = Object.entries(grouped).map(([day, data]) => ({
          day,
          volume: data.volume,
          transactions: data.transactions,
        }));

        setMetrics({
          totalVolume,
          transactionCount,
          totalUsers: uniqueUsers,
          networkRevenue,
          dailyData,
        });
      } catch (err) {
        console.error("[Analytics] Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  return { ...metrics, isLoading };
}

