/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

        // Fetch all swap analytics
        const { data, error } = await supabase
          .from("swap_analytics")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          setIsLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setIsLoading(false);
          return;
        }

        // Calculate metrics
        const totalVolume = data.reduce((sum: number, row: any) => {
          return sum + Number(row.swap_volume_usd || 0);
        }, 0);

        const transactionCount = data.length;

        // Count unique users (wallet addresses)
        const uniqueUsers = new Set(
          data.map((row: any) => row.user_address?.toLowerCase())
        ).size;

        // Calculate actual gas fee revenue from swaps
        const gasFeeRevenue = data.reduce((sum: number, row: any) => {
          return sum + Number(row.gas_fee_revenue || 0);
        }, 0);

        // Network revenue = gas fee revenue (50% of gas fees)
        const networkRevenue = gasFeeRevenue;

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

    // Real-time subscription for new swaps
    const channel = supabase
      .channel("analytics_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swap_analytics",
        },
        () => {
          fetchAnalytics(); // Refetch when new swap added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { ...metrics, isLoading };
}


