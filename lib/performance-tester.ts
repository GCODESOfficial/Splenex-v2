// Performance testing and validation script
import { performanceMonitor } from './performance-optimizer';
import { balanceCache, quoteCache, priceCache, gasEstimateCache } from './enhanced-cache';
import { fetchBalancesFast, fetchQuotesFast } from './performance-optimizer';

interface PerformanceTestResult {
  operation: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  successRate: number;
  cacheHitRate?: number;
}

class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  async testBalanceFetching(walletAddress: string, iterations = 5): Promise<PerformanceTestResult> {
    console.log(`[PerformanceTest] 🧪 Testing balance fetching (${iterations} iterations)...`);
    
    const times: number[] = [];
    let successes = 0;
    
    for (let i = 0; i < iterations; i++) {
      const stopTiming = performanceMonitor.startTiming('balance_fetch_test');
      
      try {
        // Test with sample chains
        const chains = [
          { name: 'Ethereum', rpc: ['https://eth.llamarpc.com'], symbol: 'ETH' },
          { name: 'BSC', rpc: ['https://bsc-dataseed.binance.org'], symbol: 'BNB' },
          { name: 'Polygon', rpc: ['https://polygon-rpc.com'], symbol: 'MATIC' },
        ];
        
        await fetchBalancesFast(walletAddress, chains);
        successes++;
      } catch (error) {
        console.error('[PerformanceTest] Balance fetch failed:', error);
      } finally {
        const duration = stopTiming();
        times.push(duration);
      }
    }
    
    const result: PerformanceTestResult = {
      operation: 'Balance Fetching',
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: successes / iterations,
      cacheHitRate: balanceCache.getStats().hitRate,
    };
    
    this.results.push(result);
    console.log(`[PerformanceTest] ✅ Balance fetching: ${result.averageTime.toFixed(2)}ms avg`);
    
    return result;
  }

  async testQuoteFetching(iterations = 5): Promise<PerformanceTestResult> {
    console.log(`[PerformanceTest] 🧪 Testing quote fetching (${iterations} iterations)...`);
    
    const times: number[] = [];
    let successes = 0;
    
    const testRequest = {
      fromToken: '0xA0b86a33E6441b8c4C8C0E1234567890123456789', // Mock token
      toToken: '0xB0b86a33E6441b8c4C8C0E1234567890123456789',
      fromAmount: '1000000000000000000', // 1 ETH
      fromAddress: '0xC0b86a33E6441b8c4C8C0E1234567890123456789',
      slippage: 0.5,
    };
    
    const mockAggregators = [
      async () => ({ toAmount: '2000000000000000000', provider: 'mock1' }),
      async () => ({ toAmount: '1950000000000000000', provider: 'mock2' }),
      async () => ({ toAmount: '1980000000000000000', provider: 'mock3' }),
    ];
    
    for (let i = 0; i < iterations; i++) {
      const stopTiming = performanceMonitor.startTiming('quote_fetch_test');
      
      try {
        await fetchQuotesFast(testRequest, mockAggregators);
        successes++;
      } catch (error) {
        console.error('[PerformanceTest] Quote fetch failed:', error);
      } finally {
        const duration = stopTiming();
        times.push(duration);
      }
    }
    
    const result: PerformanceTestResult = {
      operation: 'Quote Fetching',
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: successes / iterations,
      cacheHitRate: quoteCache.getStats().hitRate,
    };
    
    this.results.push(result);
    console.log(`[PerformanceTest] ✅ Quote fetching: ${result.averageTime.toFixed(2)}ms avg`);
    
    return result;
  }

  async testCachingPerformance(iterations = 10): Promise<PerformanceTestResult> {
    console.log(`[PerformanceTest] 🧪 Testing caching performance (${iterations} iterations)...`);
    
    const times: number[] = [];
    let successes = 0;
    
    // Test cache operations
    for (let i = 0; i < iterations; i++) {
      const stopTiming = performanceMonitor.startTiming('cache_test');
      
      try {
        // Test cache set/get operations
        const testKey = `test_key_${i}`;
        const testData = { balance: '1000', timestamp: Date.now() };
        
        balanceCache.set(testKey, [testData as any]);
        const retrieved = balanceCache.get(testKey);
        
        if (retrieved) {
          successes++;
        }
      } catch (error) {
        console.error('[PerformanceTest] Cache test failed:', error);
      } finally {
        const duration = stopTiming();
        times.push(duration);
      }
    }
    
    const result: PerformanceTestResult = {
      operation: 'Cache Operations',
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: successes / iterations,
      cacheHitRate: balanceCache.getStats().hitRate,
    };
    
    this.results.push(result);
    console.log(`[PerformanceTest] ✅ Cache operations: ${result.averageTime.toFixed(2)}ms avg`);
    
    return result;
  }

  async runComprehensiveTest(walletAddress: string): Promise<PerformanceTestResult[]> {
    console.log('[PerformanceTest] 🚀 Starting comprehensive performance test...');
    
    // Clear previous results
    this.results = [];
    
    // Run all tests
    await this.testBalanceFetching(walletAddress);
    await this.testQuoteFetching();
    await this.testCachingPerformance();
    
    // Generate summary
    this.generateSummary();
    
    return this.results;
  }

  private generateSummary(): void {
    console.log('\n[PerformanceTest] 📊 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(50));
    
    this.results.forEach(result => {
      console.log(`\n${result.operation}:`);
      console.log(`  Average Time: ${result.averageTime.toFixed(2)}ms`);
      console.log(`  Min Time: ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max Time: ${result.maxTime.toFixed(2)}ms`);
      console.log(`  Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
      if (result.cacheHitRate !== undefined) {
        console.log(`  Cache Hit Rate: ${(result.cacheHitRate * 100).toFixed(1)}%`);
      }
    });
    
    // Performance benchmarks
    console.log('\n[PerformanceTest] 🎯 PERFORMANCE BENCHMARKS');
    console.log('='.repeat(50));
    
    const balanceTest = this.results.find(r => r.operation === 'Balance Fetching');
    const quoteTest = this.results.find(r => r.operation === 'Quote Fetching');
    const cacheTest = this.results.find(r => r.operation === 'Cache Operations');
    
    if (balanceTest) {
      const benchmark = balanceTest.averageTime < 2000 ? '✅ EXCELLENT' : 
                       balanceTest.averageTime < 5000 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT';
      console.log(`Balance Fetching: ${benchmark} (${balanceTest.averageTime.toFixed(2)}ms)`);
    }
    
    if (quoteTest) {
      const benchmark = quoteTest.averageTime < 1000 ? '✅ EXCELLENT' : 
                       quoteTest.averageTime < 3000 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT';
      console.log(`Quote Fetching: ${benchmark} (${quoteTest.averageTime.toFixed(2)}ms)`);
    }
    
    if (cacheTest) {
      const benchmark = cacheTest.averageTime < 10 ? '✅ EXCELLENT' : 
                       cacheTest.averageTime < 50 ? '⚠️ GOOD' : '❌ NEEDS IMPROVEMENT';
      console.log(`Cache Operations: ${benchmark} (${cacheTest.averageTime.toFixed(2)}ms)`);
    }
    
    console.log('\n[PerformanceTest] ✅ Comprehensive test completed!');
  }

  getResults(): PerformanceTestResult[] {
    return this.results;
  }

  // Memory usage test
  async testMemoryUsage(): Promise<void> {
    console.log('[PerformanceTest] 🧠 Testing memory usage...');
    
    const initialMemory = process.memoryUsage();
    console.log('Initial Memory:', {
      rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(initialMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    });
    
    // Fill caches with test data
    for (let i = 0; i < 1000; i++) {
      balanceCache.set(`test_balance_${i}`, [{ balance: '1000', symbol: 'TEST' } as any]);
      quoteCache.set(`test_quote_${i}`, { toAmount: '2000', provider: 'test' });
      priceCache.set(`test_price_${i}`, 100 + Math.random() * 100);
    }
    
    const afterCacheMemory = process.memoryUsage();
    console.log('After Cache Fill:', {
      rss: `${(afterCacheMemory.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(afterCacheMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(afterCacheMemory.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    });
    
    const memoryIncrease = {
      rss: afterCacheMemory.rss - initialMemory.rss,
      heapUsed: afterCacheMemory.heapUsed - initialMemory.heapUsed,
    };
    
    console.log('Memory Increase:', {
      rss: `${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    });
    
    // Clear caches
    balanceCache.clear();
    quoteCache.clear();
    priceCache.clear();
    gasEstimateCache.clear();
    
    const afterClearMemory = process.memoryUsage();
    console.log('After Cache Clear:', {
      rss: `${(afterClearMemory.rss / 1024 / 1024).toFixed(2)}MB`,
      heapUsed: `${(afterClearMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    });
    
    console.log('[PerformanceTest] ✅ Memory usage test completed!');
  }
}

export const performanceTester = new PerformanceTester();

// Export for use in browser environment
if (typeof window !== 'undefined') {
  (window as any).performanceTester = performanceTester;
}
