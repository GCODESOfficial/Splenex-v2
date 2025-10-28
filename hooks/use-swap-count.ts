"use client";
import { useState, useEffect } from "react";

export function useSwapCount(last24Hours = false) {
  const [swapCount, setSwapCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSwapCount() {
      try {
        setIsLoading(true);
        setError(null);

        // Get the total count from API
        const url = last24Hours ? '/api/swap-count?last24Hours=true' : '/api/swap-count';
        const response = await fetch(url);
        
        if (!response.ok) {
          console.error('[Swap Count] Error fetching count:', response.status);
          setError('Failed to fetch swap count');
          return;
        }

        const data = await response.json();
        setSwapCount(data.count || 0);
      } catch (err) {
        console.error('[Swap Count] Unexpected error:', err);
        setError('Failed to fetch swap count');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSwapCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchSwapCount, 30000);
    return () => clearInterval(interval);
  }, [last24Hours]);

  return { 
    swapCount, 
    isLoading, 
    error
  };
}
