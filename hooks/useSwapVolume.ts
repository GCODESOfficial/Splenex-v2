/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useSwapVolume.ts
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useSwapVolume() {
  const [totalVolume, setTotalVolume] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: string; total: number }[]>([]);
  const [yesterdayVolume, setYesterdayVolume] = useState(0);
  const [todayVolume, setTodayVolume] = useState(0);

  useEffect(() => {
    async function fetchVolume() {
      try {
        // Query with * to get all columns (more flexible if schema changes)
        const { data, error } = await supabase
          .from("swap_analytics")
          .select("*");

        if (error) {
          console.warn("[Volume] ⚠️ Database query failed:", error.message);
          console.log("[Volume] ℹ️ Using mock data or table may not exist yet");
          return;
        }

        if (!data || data.length === 0) {
          console.log("[Volume] ℹ️ No swap data in database yet");
          return;
        }

        console.log("[Volume] 📊 Raw data from database:", data);
        console.log("[Volume] 🔍 Available columns:", Object.keys(data[0] || {}));

        // Calculate volume with flexible column names
        const grouped: Record<string, number> = {};
        data?.forEach((row: any) => {
          // Try different possible timestamp column names
          const timestamp = row.timestamp || row.created_at || row.date || new Date().toISOString();
          const day = new Date(timestamp).toISOString().split("T")[0];
          
          // Try different possible volume column names
          const volume = Number(row.swap_volume_usd || row.volume_usd || row.volume || 0);
          
          grouped[day] = (grouped[day] || 0) + volume;
        });
        
        setDailyData(Object.entries(grouped).map(([day, total]) => ({ day, total })));
        
        const total = data?.reduce((a: number, b: any) => {
          const volume = Number(b.swap_volume_usd || b.volume_usd || b.volume || 0);
          return a + volume;
        }, 0) || 0;
        
        // Calculate yesterday's and today's volume
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const yesterdayVol = grouped[yesterdayStr] || 0;
        
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const todayVol = grouped[todayStr] || 0;
        
        console.log(`[Volume] 💰 Total Volume: $${total.toFixed(2)}`);
        console.log(`[Volume] 📅 Today's Volume: $${todayVol.toFixed(2)}`);
        console.log(`[Volume] 📅 Yesterday's Volume: $${yesterdayVol.toFixed(2)}`);
        setTotalVolume(total);
        setYesterdayVolume(yesterdayVol);
        setTodayVolume(todayVol);
      } catch (err) {
        console.warn("[Volume] ⚠️ Error in fetchVolume:", err);
      }
    }
    
    fetchVolume();

    // Set up real-time subscription for new swaps
    const channel = supabase
      .channel("swap_analytics_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "swap_analytics",
        },
        (payload) => {
          console.log("[Volume] 🔄 New swap detected:", payload.new);
          fetchVolume(); // Refetch all data
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { totalVolume, dailyData, yesterdayVolume, todayVolume };
}
