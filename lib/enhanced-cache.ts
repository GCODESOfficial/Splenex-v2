// Enhanced caching system for better performance
import { TokenBalance } from './types';

// Cache configuration
const CACHE_CONFIG = {
  BALANCE_TTL: 15000, // 15 seconds
  QUOTE_TTL: 10000,   // 10 seconds
  PRICE_TTL: 30000,   // 30 seconds
  GAS_TTL: 60000,     // 1 minute
  MAX_SIZE: 1000,     // Maximum cache entries
};

// Enhanced cache entry with metadata
interface EnhancedCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number; // Estimated memory size
}

class EnhancedCache<T> {
  private cache = new Map<string, EnhancedCacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private totalSize = 0;

  constructor(maxSize = CACHE_CONFIG.MAX_SIZE, defaultTTL = CACHE_CONFIG.BALANCE_TTL) {
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.totalSize -= entry.size;
      return null;
    }

    // Update access metadata
    entry.accessCount++;
    entry.lastAccessed = now;
    
    return entry.data;
  }

  set(key: string, data: T, ttl = this.defaultTTL): void {
    const now = Date.now();
    const size = this.estimateSize(data);
    
    // Remove existing entry if it exists
    const existing = this.cache.get(key);
    if (existing) {
      this.totalSize -= existing.size;
    }

    // LRU eviction if cache is full
    if (this.cache.size >= this.maxSize && !existing) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      accessCount: 1,
      lastAccessed: now,
      size,
    });

    this.totalSize += size;
  }

  private estimateSize(data: any): number {
    // Rough estimation of memory usage
    return JSON.stringify(data).length * 2; // 2 bytes per character
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestKey = key;
        oldestTime = entry.lastAccessed;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.cache.delete(oldestKey);
      this.totalSize -= entry.size;
    }
  }

  clear(): void {
    this.cache.clear();
    this.totalSize = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; totalSize: number; hitRate: number } {
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return {
      size: this.cache.size,
      totalSize: this.totalSize,
      hitRate: totalAccesses > 0 ? 
        Array.from(this.cache.values())
          .reduce((sum, entry) => sum + entry.accessCount, 0) / totalAccesses : 0,
    };
  }
}

// Specialized caches for different data types
export const balanceCache = new EnhancedCache<TokenBalance[]>(500, CACHE_CONFIG.BALANCE_TTL);
export const quoteCache = new EnhancedCache<any>(200, CACHE_CONFIG.QUOTE_TTL);
export const priceCache = new EnhancedCache<number>(1000, CACHE_CONFIG.PRICE_TTL);
export const gasEstimateCache = new EnhancedCache<string>(100, CACHE_CONFIG.GAS_TTL);

// Cache warming strategies
export class CacheWarmer {
  private warmingPromises = new Map<string, Promise<any>>();

  async warmBalanceCache(walletAddress: string, chains: string[]): Promise<void> {
    const cacheKey = `warm_balances_${walletAddress}`;
    
    if (this.warmingPromises.has(cacheKey)) {
      return this.warmingPromises.get(cacheKey);
    }

    const promise = this.fetchAndCacheBalances(walletAddress, chains);
    this.warmingPromises.set(cacheKey, promise);
    
    try {
      await promise;
    } finally {
      this.warmingPromises.delete(cacheKey);
    }
  }

  private async fetchAndCacheBalances(walletAddress: string, chains: string[]): Promise<void> {
    
    // Fetch balances for top chains in parallel
    const topChains = chains.slice(0, 5); // Top 5 chains
    const promises = topChains.map(async (chain) => {
      try {
        const response = await fetch(`/api/tokens?address=${walletAddress}&chain=${chain}`);
        if (response.ok) {
          const data = await response.json();
          const cacheKey = `balances_${walletAddress}_${chain}`;
          balanceCache.set(cacheKey, data.result || []);
        }
      } catch (error) {
      }
    });

    await Promise.allSettled(promises);
  }

  async warmPriceCache(symbols: string[]): Promise<void> {
    const cacheKey = `warm_prices_${symbols.join('_')}`;
    
    if (this.warmingPromises.has(cacheKey)) {
      return this.warmingPromises.get(cacheKey);
    }

    const promise = this.fetchAndCachePrices(symbols);
    this.warmingPromises.set(cacheKey, promise);
    
    try {
      await promise;
    } finally {
      this.warmingPromises.delete(cacheKey);
    }
  }

  private async fetchAndCachePrices(symbols: string[]): Promise<void> {
    
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd`,
        { next: { revalidate: 30 } }
      );

      if (response.ok) {
        const data = await response.json();
        
        symbols.forEach(symbol => {
          const price = data[symbol.toLowerCase()]?.usd || 0;
          priceCache.set(`price_${symbol.toUpperCase()}`, price);
        });
        
      }
    } catch (error) {
    }
  }
}

export const cacheWarmer = new CacheWarmer();

// Cache invalidation strategies
export class CacheInvalidator {
  invalidateBalanceCache(walletAddress: string, chain?: string): void {
    if (chain) {
      const cacheKey = `balances_${walletAddress}_${chain}`;
      balanceCache.clear(); // Clear specific chain
    } else {
      balanceCache.clear(); // Clear all balances
    }
  }

  invalidateQuoteCache(fromToken?: string, toToken?: string): void {
    if (fromToken && toToken) {
      // Clear specific token pair quotes
      const keysToDelete: string[] = [];
      for (const key of quoteCache['cache'].keys()) {
        if (key.includes(fromToken) && key.includes(toToken)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => quoteCache['cache'].delete(key));
    } else {
      quoteCache.clear(); // Clear all quotes
    }
  }

  invalidatePriceCache(symbol?: string): void {
    if (symbol) {
      const cacheKey = `price_${symbol.toUpperCase()}`;
      priceCache['cache'].delete(cacheKey);
    } else {
      priceCache.clear(); // Clear all prices
    }
  }
}

export const cacheInvalidator = new CacheInvalidator();

// Cache analytics and monitoring
export class CacheAnalytics {
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    warmUps: 0,
  };

  recordHit(): void {
    this.metrics.hits++;
  }

  recordMiss(): void {
    this.metrics.misses++;
  }

  recordEviction(): void {
    this.metrics.evictions++;
  }

  recordWarmUp(): void {
    this.metrics.warmUps++;
  }

  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    return total > 0 ? this.metrics.hits / total : 0;
  }

  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  getCacheStats(): {
    balance: ReturnType<typeof balanceCache.getStats>;
    quote: ReturnType<typeof quoteCache.getStats>;
    price: ReturnType<typeof priceCache.getStats>;
    gas: ReturnType<typeof gasEstimateCache.getStats>;
  } {
    return {
      balance: balanceCache.getStats(),
      quote: quoteCache.getStats(),
      price: priceCache.getStats(),
      gas: gasEstimateCache.getStats(),
    };
  }
}

export const cacheAnalytics = new CacheAnalytics();

// Smart cache prefetching based on user behavior
export class SmartPrefetcher {
  private userPatterns = new Map<string, {
    frequentTokens: string[];
    frequentChains: string[];
    lastActivity: number;
  }>();

  updateUserPattern(walletAddress: string, token: string, chain: string): void {
    const pattern = this.userPatterns.get(walletAddress) || {
      frequentTokens: [],
      frequentChains: [],
      lastActivity: Date.now(),
    };

    // Update frequent tokens (keep top 10)
    if (!pattern.frequentTokens.includes(token)) {
      pattern.frequentTokens.push(token);
      pattern.frequentTokens = pattern.frequentTokens.slice(-10);
    }

    // Update frequent chains (keep top 5)
    if (!pattern.frequentChains.includes(chain)) {
      pattern.frequentChains.push(chain);
      pattern.frequentChains = pattern.frequentChains.slice(-5);
    }

    pattern.lastActivity = Date.now();
    this.userPatterns.set(walletAddress, pattern);
  }

  async prefetchForUser(walletAddress: string): Promise<void> {
    const pattern = this.userPatterns.get(walletAddress);
    if (!pattern) return;

    // Prefetch balances for frequent chains
    if (pattern.frequentChains.length > 0) {
      await cacheWarmer.warmBalanceCache(walletAddress, pattern.frequentChains);
    }

    // Prefetch prices for frequent tokens
    if (pattern.frequentTokens.length > 0) {
      await cacheWarmer.warmPriceCache(pattern.frequentTokens);
    }

  }

  getUserPattern(walletAddress: string): typeof this.userPatterns extends Map<string, infer U> ? U : never | null {
    return this.userPatterns.get(walletAddress) || null;
  }
}

export const smartPrefetcher = new SmartPrefetcher();

// Cache cleanup and maintenance
export function startCacheMaintenance(): void {
  // Clean up expired entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    
    // Clean up old user patterns (older than 7 days)
    for (const [walletAddress, pattern] of smartPrefetcher['userPatterns'].entries()) {
      if (now - pattern.lastActivity > 7 * 24 * 60 * 60 * 1000) {
        smartPrefetcher['userPatterns'].delete(walletAddress);
      }
    }

  }, 5 * 60 * 1000); // 5 minutes
}

// Start maintenance on module load
if (typeof window !== 'undefined') {
  startCacheMaintenance();
}
