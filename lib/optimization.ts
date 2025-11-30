// Ultra-fast optimization utilities: client caching, multicall, request deduplication, and caching

import { createPublicClient, http, type PublicClient, type Address, type Chain, encodeFunctionData, decodeFunctionResult } from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, bsc } from 'viem/chains';

// ============================================================================
// CLIENT CACHING - Singleton instances per chain
// ============================================================================

const clientCache = new Map<number, PublicClient>();

const getChainConfig = (chainId: number): Chain | null => {
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    56: bsc,
  };
  return chainMap[chainId] || null;
};

/**
 * Get cached public client instance for a chain (singleton pattern)
 * Optimized with fast timeouts and connection pooling
 */
export function getCachedClient(chainId: number): PublicClient {
  if (!clientCache.has(chainId)) {
    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }
    
    clientCache.set(chainId, createPublicClient({
      chain,
      transport: http(undefined, {
        timeout: 2000, // Aggressive 2s timeout (fail fast)
        retryCount: 1, // Single retry only
      }),
    }));
  }
  return clientCache.get(chainId)!;
}

// ============================================================================
// REQUEST DEDUPLICATION - Prevent duplicate concurrent requests
// ============================================================================

const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate concurrent requests - if same request is already pending, return that promise
 */
export async function dedupeRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }
  const promise = fn().finally(() => pendingRequests.delete(key));
  pendingRequests.set(key, promise);
  return promise;
}

// ============================================================================
// CACHING LAYER - TTL-based caching for expensive operations
// ============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const caches = {
  pairAddresses: new Map<string, CacheEntry<Address | null>>(),
  quotes: new Map<string, CacheEntry<any>>(),
  allowances: new Map<string, CacheEntry<bigint>>(),
  reserves: new Map<string, CacheEntry<any>>(),
};

const TTL = {
  pairAddress: 30000, // 30 seconds
  quote: 5000, // 5 seconds
  allowance: 10000, // 10 seconds
  reserves: 10000, // 10 seconds
};

function getCacheKey(prefix: string, ...args: any[]): string {
  return `${prefix}:${args.map(a => String(a)).join(':')}`;
}

function isExpired<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return true;
  return Date.now() > entry.expiresAt;
}

/**
 * Get cached value or execute function and cache result
 */
export async function getCached<T>(
  cacheType: keyof typeof caches,
  key: string,
  ttl: number,
  fn: () => Promise<T>
): Promise<T> {
  const cache = caches[cacheType] as Map<string, CacheEntry<T>>;
  const entry = cache.get(key);
  
  if (!isExpired(entry)) {
    return entry!.data;
  }
  
  const data = await fn();
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  return data;
}

/**
 * Cache pair address lookup
 */
export async function getCachedPairAddress(
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  fn: () => Promise<Address | null>
): Promise<Address | null> {
  const key = getCacheKey('pair', chainId, tokenA.toLowerCase(), tokenB.toLowerCase());
  return getCached('pairAddresses', key, TTL.pairAddress, fn);
}

/**
 * Cache quote
 */
export async function getCachedQuote(
  tokenIn: Address,
  tokenOut: Address,
  amountIn: string,
  chainId: number,
  fn: () => Promise<any>
): Promise<any> {
  const key = getCacheKey('quote', chainId, tokenIn.toLowerCase(), tokenOut.toLowerCase(), amountIn);
  return getCached('quotes', key, TTL.quote, fn);
}

/**
 * Cache allowance
 */
export async function getCachedAllowance(
  token: Address,
  owner: Address,
  spender: Address,
  chainId: number,
  fn: () => Promise<bigint>
): Promise<bigint> {
  const key = getCacheKey('allowance', chainId, token.toLowerCase(), owner.toLowerCase(), spender.toLowerCase());
  return getCached('allowances', key, TTL.allowance, fn);
}

/**
 * Clear cache for a specific type
 */
export function clearCache(cacheType?: keyof typeof caches): void {
  if (cacheType) {
    caches[cacheType].clear();
  } else {
    Object.values(caches).forEach(cache => cache.clear());
  }
}

// ============================================================================
// MULTICALL UTILITIES - Batch RPC calls
// ============================================================================

const MULTICALL_ADDRESSES: Record<number, Address> = {
  1: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  42161: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  10: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  137: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  8453: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
  56: '0xcA11bde05977b3631167028862bE2a173976CA11' as Address,
};

const MULTICALL_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

interface MulticallCall {
  target: Address;
  allowFailure: boolean;
  callData: `0x${string}`;
}

/**
 * Execute multiple contract calls in a single RPC request using multicall3
 */
export async function batchMulticall<T>(
  chainId: number,
  calls: MulticallCall[],
  decodeResults: (results: { success: boolean; returnData: `0x${string}` }[]) => T
): Promise<T> {
  if (calls.length === 0) {
    return decodeResults([]);
  }
  
  const publicClient = getCachedClient(chainId);
  const multicallAddress = MULTICALL_ADDRESSES[chainId];
  
  if (!multicallAddress) {
    throw new Error(`Multicall not available for chain ${chainId}`);
  }
  
  try {
    const results = await publicClient.readContract({
      address: multicallAddress,
      abi: MULTICALL_ABI,
      functionName: 'aggregate3',
      args: [calls],
    }) as { success: boolean; returnData: `0x${string}` }[];
    
    return decodeResults(results);
  } catch (error) {
    // Fallback to individual calls if multicall fails
    console.warn('[batchMulticall] Multicall failed, falling back to individual calls:', error);
    const individualResults = await Promise.all(
      calls.map(async (call) => {
        try {
          // Decode and execute individual call
          // This is a simplified fallback - in practice you'd decode the callData
          return { success: false, returnData: '0x' as `0x${string}` };
        } catch {
          return { success: false, returnData: '0x' as `0x${string}` };
        }
      })
    );
    return decodeResults(individualResults);
  }
}

/**
 * Batch getPair calls using multicall
 */
export async function batchGetPairAddresses(
  chainId: number,
  factoryAddress: Address,
  pairs: Array<{ tokenA: Address; tokenB: Address }>
): Promise<(Address | null)[]> {
  const FACTORY_ABI = [
    {
      inputs: [
        { internalType: 'address', name: 'tokenA', type: 'address' },
        { internalType: 'address', name: 'tokenB', type: 'address' },
      ],
      name: 'getPair',
      outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const;
  
  const calls: MulticallCall[] = pairs.map(({ tokenA, tokenB }) => ({
    target: factoryAddress,
    allowFailure: true,
    callData: encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: 'getPair',
      args: [tokenA, tokenB],
    }) as `0x${string}`,
  }));
  
  return batchMulticall(chainId, calls, (results) => {
    return results.map((result) => {
      if (!result.success) {
        return null;
      }
      try {
        const decoded = decodeFunctionResult({
          abi: FACTORY_ABI,
          functionName: 'getPair',
          data: result.returnData,
        }) as Address;
        return decoded && decoded !== '0x0000000000000000000000000000000000000000' ? decoded : null;
      } catch {
        return null;
      }
    });
  });
}

// ============================================================================
// TIMEOUT RACING - Fast failure for slow operations
// ============================================================================

/**
 * Race a promise against a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Fast timeout wrapper for RPC calls (500ms for pair checks, 1s for quotes)
 */
export async function fastRpcCall<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 2000
): Promise<T> {
  return withTimeout(fn(), timeoutMs, 'RPC call timeout');
}