// Performance optimization utilities for faster balance fetching, quotes, and swaps
import { TokenBalance } from './types';

// Enhanced caching with TTL and LRU eviction
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
}

class PerformanceCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(maxSize = 1000, defaultTTL = 30000) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.accessCount++;
    return entry.data;
  }

  set(key: string, data: T, ttl = this.defaultTTL): void {
    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
    });
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < oldestAccess || 
          (entry.accessCount === oldestAccess && entry.timestamp < oldestTime)) {
        oldestKey = key;
        oldestAccess = entry.accessCount;
        oldestTime = entry.timestamp;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global caches for different data types
export const balanceCache = new PerformanceCache<TokenBalance[]>(500, 15000); // 15s TTL
export const quoteCache = new PerformanceCache<any>(200, 10000); // 10s TTL
export const priceCache = new PerformanceCache<number>(1000, 30000); // 30s TTL
export const gasEstimateCache = new PerformanceCache<string>(100, 60000); // 1min TTL

// Parallel execution utilities
export async function executeInParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency = 5
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(item => processor(item))
    );
    
    results.push(...batchResults
      .filter((result): result is PromiseFulfilledResult<R> => result.status === 'fulfilled')
      .map(result => result.value)
    );
  }
  
  return results;
}

// Fast balance fetching with parallel execution
export async function fetchBalancesFast(
  walletAddress: string,
  chains: Array<{ name: string; rpc: string[]; symbol: string }>,
  onProgress?: (progress: { chain: string; done: number; total: number }) => void
): Promise<TokenBalance[]> {
  console.log('[Performance] 🚀 Fast balance fetching started...');
  
  const cacheKey = `balances_${walletAddress}_${chains.map(c => c.name).join('_')}`;
  const cached = balanceCache.get(cacheKey);
  if (cached) {
    console.log('[Performance] ⚡ Balance cache hit!');
    return cached;
  }

  const allTokens: TokenBalance[] = [];
  let completedChains = 0;

  // Process chains in parallel batches
  const chainBatches = [];
  for (let i = 0; i < chains.length; i += 3) {
    chainBatches.push(chains.slice(i, i + 3));
  }

  for (const batch of chainBatches) {
    const batchPromises = batch.map(async (chain) => {
      try {
        console.log(`[Performance] 📡 Fetching ${chain.name}...`);
        
        // Try multiple RPC endpoints in parallel
        const rpcPromises = chain.rpc.map(async (rpcUrl) => {
          try {
            const response = await fetch(rpcUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_getBalance",
                params: [walletAddress, "latest"],
                id: 1,
              }),
            });

            const data = await response.json();
            if (data.result) {
              const balanceInEth = parseInt(data.result, 16) / Math.pow(10, 18);
              return { balance: balanceInEth, rpc: rpcUrl };
            }
            return null;
          } catch (error) {
            console.warn(`[Performance] RPC ${rpcUrl} failed:`, error);
            return null;
          }
        });

        const results = await Promise.allSettled(rpcPromises);
        const successfulResult = results
          .filter((result): result is PromiseFulfilledResult<{ balance: number; rpc: string } | null> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value)[0];

        if (successfulResult && successfulResult.balance > 0) {
          // Get price from cache or fetch quickly
          const priceKey = `price_${chain.symbol}`;
          let price = priceCache.get(priceKey);
          
          if (!price) {
            // Quick price fetch for native tokens
            try {
              const priceResponse = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${chain.symbol.toLowerCase()}&vs_currencies=usd`,
                { next: { revalidate: 30 } }
              );
              const priceData = await priceResponse.json();
              price = priceData[chain.symbol.toLowerCase()]?.usd || 0;
              priceCache.set(priceKey, price);
            } catch (error) {
              price = 0;
            }
          }

          const usdValue = successfulResult.balance * price;
          
          return {
            symbol: chain.symbol,
            name: chain.name,
            balance: successfulResult.balance.toFixed(6),
            usdValue,
            price,
            address: "native",
            chain: chain.name,
            chainId: "1", // Default to mainnet
            decimals: 18,
            logo: "",
          };
        }
        
        return null;
      } catch (error) {
        console.error(`[Performance] Error fetching ${chain.name}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    const successfulTokens = batchResults
      .filter((result): result is PromiseFulfilledResult<TokenBalance | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value!);

    allTokens.push(...successfulTokens);
    completedChains += batch.length;
    
    if (onProgress) {
      onProgress({
        chain: batch.map(c => c.name).join(', '),
        done: completedChains,
        total: chains.length,
      });
    }
  }

  // Cache the results
  balanceCache.set(cacheKey, allTokens);
  
  console.log(`[Performance] ✅ Fast balance fetch completed: ${allTokens.length} tokens`);
  return allTokens;
}

// Fast quote fetching with parallel aggregator calls
export async function fetchQuotesFast(
  request: {
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
    slippage?: number;
  },
  aggregators: Array<(req: any) => Promise<any>>
): Promise<any> {
  console.log('[Performance] 🚀 Fast quote fetching started...');
  
  const cacheKey = `quote_${request.fromToken}_${request.toToken}_${request.fromAmount}`;
  const cached = quoteCache.get(cacheKey);
  if (cached) {
    console.log('[Performance] ⚡ Quote cache hit!');
    return cached;
  }

  // Execute all aggregators in parallel with shorter timeout
  const quotePromises = aggregators.map(async (aggregator, index) => {
    try {
      return await Promise.race([
        aggregator(request),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000) // 3s timeout
        )
      ]);
    } catch (error) {
      console.warn(`[Performance] Aggregator ${index + 1} failed:`, error);
      return null;
    }
  });

  const results = await Promise.allSettled(quotePromises);
  const successfulQuotes = results
    .filter((result): result is PromiseFulfilledResult<any> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);

  if (successfulQuotes.length === 0) {
    console.log('[Performance] ❌ No quotes available');
    return null;
  }

  // Sort by output amount and return best quote
  const bestQuote = successfulQuotes.sort((a, b) => {
    const amountA = BigInt(a.toAmount || '0');
    const amountB = BigInt(b.toAmount || '0');
    return amountA > amountB ? -1 : 1;
  })[0];

  // Cache the result
  quoteCache.set(cacheKey, bestQuote);
  
  console.log(`[Performance] ✅ Fast quote completed: ${bestQuote.provider}`);
  return bestQuote;
}

// Pre-approval optimization for faster swaps
export async function optimizeTokenApproval(
  tokenAddress: string,
  spenderAddress: string,
  amount: string,
  walletAddress: string,
  rpcUrl: string
): Promise<{ needsApproval: boolean; currentAllowance: string }> {
  console.log('[Performance] 🔍 Checking token approval...');
  
  const cacheKey = `approval_${tokenAddress}_${spenderAddress}_${walletAddress}`;
  const cached = gasEstimateCache.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  try {
    // Check current allowance
    const allowanceResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: tokenAddress,
            data: `0xdd62ed3e000000000000000000000000${walletAddress.substring(2)}000000000000000000000000${spenderAddress.substring(2)}`,
          },
          "latest",
        ],
        id: 1,
      }),
    });

    const allowanceData = await allowanceResponse.json();
    const currentAllowance = allowanceData.result || "0x0";
    const needsApproval = BigInt(currentAllowance) < BigInt(amount);

    const result = { needsApproval, currentAllowance };
    gasEstimateCache.set(cacheKey, JSON.stringify(result), 30000); // 30s cache
    
    return result;
  } catch (error) {
    console.error('[Performance] Approval check failed:', error);
    return { needsApproval: true, currentAllowance: "0x0" };
  }
}

// Gas estimation optimization
export async function estimateGasFast(
  transactionData: any,
  rpcUrl: string
): Promise<string> {
  console.log('[Performance] ⛽ Fast gas estimation...');
  
  const cacheKey = `gas_${JSON.stringify(transactionData).slice(0, 100)}`;
  const cached = gasEstimateCache.get(cacheKey);
  if (cached) {
    console.log('[Performance] ⚡ Gas cache hit!');
    return cached;
  }

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [transactionData],
        id: 1,
      }),
    });

    const data = await response.json();
    const gasEstimate = data.result || "0x5208"; // Default 21,000 gas
    
    gasEstimateCache.set(cacheKey, gasEstimate, 60000); // 1min cache
    return gasEstimate;
  } catch (error) {
    console.error('[Performance] Gas estimation failed:', error);
    return "0x5208"; // Default gas limit
  }
}

// Debounced function execution
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// Throttled function execution
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      const times = this.metrics.get(operation) || [];
      times.push(duration);
      this.metrics.set(operation, times);
      
      console.log(`[Performance] ${operation}: ${duration.toFixed(2)}ms`);
    };
  }

  getAverageTime(operation: string): number {
    const times = this.metrics.get(operation) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length || 0;
  }

  getMetrics(): Record<string, { average: number; count: number }> {
    const result: Record<string, { average: number; count: number }> = {};
    
    for (const [operation, times] of this.metrics.entries()) {
      result[operation] = {
        average: this.getAverageTime(operation),
        count: times.length,
      };
    }
    
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();
