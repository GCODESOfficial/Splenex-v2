// Quote caching system for faster repeated requests
interface CachedQuote {
  data: any;
  timestamp: number;
  expiresAt: number;
}

// In-memory cache for quotes (30 seconds)
const quoteCache = new Map<string, CachedQuote>();
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Generate cache key from quote request
 */
function generateCacheKey(request: any): string {
  return `${request.fromChain}-${request.toChain}-${request.fromToken}-${request.toToken}-${request.fromAmount}-${request.slippage || 'default'}`;
}

/**
 * Get cached quote if available and not expired
 */
export function getCachedQuote(request: any): any | null {
  const cacheKey = generateCacheKey(request);
  const cached = quoteCache.get(cacheKey);
  
  if (!cached) {
    return null;
  }
  
  const now = Date.now();
  if (now > cached.expiresAt) {
    // Cache expired, remove it
    quoteCache.delete(cacheKey);
    return null;
  }
  
  console.log(`[Quote Cache] ⚡ Cache hit for ${cacheKey.substring(0, 50)}...`);
  return cached.data;
}

/**
 * Cache a quote result
 */
export function setCachedQuote(request: any, quote: any): void {
  const cacheKey = generateCacheKey(request);
  const now = Date.now();
  
  quoteCache.set(cacheKey, {
    data: quote,
    timestamp: now,
    expiresAt: now + CACHE_DURATION,
  });
  
  console.log(`[Quote Cache] 💾 Cached quote for ${cacheKey.substring(0, 50)}... (expires in 30s)`);
  
  // Clean up expired entries periodically
  if (quoteCache.size > 100) {
    cleanExpiredCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (const [key, cached] of quoteCache.entries()) {
    if (now > cached.expiresAt) {
      quoteCache.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Quote Cache] 🧹 Cleaned ${cleaned} expired entries`);
  }
}

/**
 * Clear all cached quotes (for testing or manual refresh)
 */
export function clearQuoteCache(): void {
  quoteCache.clear();
  console.log("[Quote Cache] 🗑️ Cleared all cached quotes");
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; entries: string[] } {
  return {
    size: quoteCache.size,
    entries: Array.from(quoteCache.keys()).map(key => key.substring(0, 50) + "..."),
  };
}
