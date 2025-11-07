/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";

export function useTokenPrice(symbol: string, amount: string) {
  const [usdValue, setUsdValue] = useState<number>(0);
  const [tokenPrice, setTokenPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchPrice() {
      if (!symbol || !amount || parseFloat(amount) <= 0) {
        setUsdValue(0);
        setTokenPrice(0);
        return;
      }

      setIsLoading(true);
      try {
        // Stablecoins are always $1
        const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'GUSD', 'USDP'];
        if (stablecoins.includes(symbol.toUpperCase())) {
          const usd = parseFloat(amount);
          setTokenPrice(1);
          setUsdValue(usd);
          return;
        }

        // Fetch price from API
        const response = await fetch(`/api/prices?symbols=${symbol}`);
        if (response.ok) {
          const prices = await response.json();
          const price = prices[symbol] || 0;
          setTokenPrice(price);
          setUsdValue(parseFloat(amount) * price);
        } else {
          // Fallback to estimated prices
          const fallbackPrices: Record<string, number> = {
            'ETH': 3500, 'WETH': 3500,
            'BTC': 65000, 'WBTC': 65000,
            'BNB': 600, 'WBNB': 600,
            'MATIC': 0.80, 'WMATIC': 0.80,
            'AVAX': 35, 'WAVAX': 35,
            'SOL': 145,
            'ARB': 1.20,
            'OP': 2.50,
          };
          const price = fallbackPrices[symbol.toUpperCase()] || 0;
          setTokenPrice(price);
          setUsdValue(parseFloat(amount) * price);
        }
      } catch (error) {
        setTokenPrice(0);
        setUsdValue(0);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrice();
  }, [symbol, amount]);

  return { usdValue, tokenPrice, isLoading };
}

