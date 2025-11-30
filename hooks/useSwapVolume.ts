/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useSwapVolume.ts
"use client";
import { useEffect, useState } from "react";

export function useSwapVolume() {
  const [totalVolume, setTotalVolume] = useState(0);
  const [dailyData, setDailyData] = useState<{ day: string; total: number }[]>([]);
  const [yesterdayVolume, setYesterdayVolume] = useState(0);
  const [todayVolume, setTodayVolume] = useState(0);
  const [last24HoursVolume, setLast24HoursVolume] = useState(0);
  const [last24HoursCount, setLast24HoursCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVolume() {
      try {
        setIsLoading(true);
        // Fetch data from analytics API
        const response = await fetch("/api/analytics");
        
        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (!data || !Array.isArray(data) || data.length === 0) {
          return;
        }

        // Calculate volume with flexible column names
        const grouped: Record<string, number> = {};
        data?.forEach((row: any) => {
          // Try different possible timestamp column names
          const timestamp = row.timestamp || row.created_at || row.date || new Date().toISOString();
          
          // Use UTC date for consistent day grouping
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
        
        // Calculate yesterday's and today's volume using UTC
        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        
        const todayStr = today.toISOString().split("T")[0];
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        
        const todayVol = grouped[todayStr] || 0;
        const yesterdayVol = grouped[yesterdayStr] || 0;
        
        // Calculate last 24 hours volume and count
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let last24Vol = 0;
        let last24Cnt = 0;
        
        data?.forEach((row: any) => {
          const timestamp = row.timestamp || row.created_at || row.date;
          const rowDate = new Date(timestamp);
          
          if (rowDate >= twentyFourHoursAgo) {
            const volume = Number(row.swap_volume_usd || row.volume_usd || row.volume || 0);
            last24Vol += volume;
            last24Cnt += 1;
          }
        });

        const percentage = yesterdayVol > 0 ? ((todayVol - yesterdayVol) / yesterdayVol) * 100 : 0;
        
        setTotalVolume(total);
        setYesterdayVolume(yesterdayVol);
        setTodayVolume(todayVol);
        setLast24HoursVolume(last24Vol);
        setLast24HoursCount(last24Cnt);
      } catch (err) {
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchVolume();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchVolume, 30000);
    return () => clearInterval(interval);
  }, []);

  return { totalVolume, dailyData, yesterdayVolume, todayVolume, last24HoursVolume, last24HoursCount, isLoading };
}