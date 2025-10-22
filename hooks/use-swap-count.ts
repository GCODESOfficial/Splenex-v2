"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useSwapCount() {
  const [swapCount, setSwapCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSwapCount() {
      try {
        setIsLoading(true);
        setError(null);

        // Get the total count of swaps
        const { count, error } = await supabase
          .from('swap_analytics')
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.error('[Swap Count] Error fetching count:', error);
          setError(error.message);
          return;
        }

        setSwapCount(count || 0);
      } catch (err) {
        console.error('[Swap Count] Unexpected error:', err);
        setError('Failed to fetch swap count');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSwapCount();

    // Set up real-time subscription for new swaps
    const channel = supabase
      .channel('swap_count_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'swap_analytics',
        },
        (payload) => {
          console.log('[Swap Count] New swap detected:', payload);
          setSwapCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'swap_analytics',
        },
        (payload) => {
          console.log('[Swap Count] Swap deleted:', payload);
          setSwapCount(prev => Math.max(0, prev - 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { 
    swapCount, 
    isLoading, 
    error,
    refreshCount: () => {
      // Manual refresh function
      const { count } = supabase
        .from('swap_analytics')
        .select('*', { count: 'exact', head: true });
      
      if (count) {
        setSwapCount(count);
      }
    }
  };
}
