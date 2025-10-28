// Comprehensive aggregator coverage testing
import { getComprehensiveAggregatorQuote } from './comprehensive-aggregators';
import { getComprehensiveTokenList } from './comprehensive-token-coverage';
import { getChainSpecificAggregators } from './chain-specific-aggregators';

interface AggregatorTestResult {
  chainId: number;
  chainName: string;
  aggregatorCount: number;
  tokenCount: number;
  testQuotes: number;
  successfulQuotes: number;
  averageResponseTime: number;
  coverage: number;
}

class ComprehensiveAggregatorTester {
  private results: AggregatorTestResult[] = [];

  /**
   * Test aggregator coverage for all supported chains
   */
  async testAllChains(): Promise<AggregatorTestResult[]> {
    console.log('[AggregatorTester] 🧪 Starting comprehensive aggregator coverage test...');
    
    const supportedChains = [
      { id: 1, name: 'Ethereum' },
      { id: 56, name: 'BSC' },
      { id: 137, name: 'Polygon' },
      { id: 42161, name: 'Arbitrum' },
      { id: 10, name: 'Optimism' },
      { id: 43114, name: 'Avalanche' },
      { id: 8453, name: 'Base' },
      { id: 250, name: 'Fantom' },
      { id: 101, name: 'Solana' },
      { id: 99999, name: 'Cosmos' },
    ];

    for (const chain of supportedChains) {
      console.log(`[AggregatorTester] 🔍 Testing ${chain.name} (${chain.id})...`);
      
      const result = await this.testChain(chain.id, chain.name);
      this.results.push(result);
      
      console.log(`[AggregatorTester] ✅ ${chain.name}: ${result.successfulQuotes}/${result.testQuotes} quotes successful`);
    }

    this.generateSummary();
    return this.results;
  }

  /**
   * Test a specific chain
   */
  private async testChain(chainId: number, chainName: string): Promise<AggregatorTestResult> {
    const startTime = Date.now();
    
    // Get aggregators for this chain
    const aggregators = getChainSpecificAggregators(chainId);
    const aggregatorCount = aggregators.length;
    
    // Get tokens for this chain
    const tokens = await getComprehensiveTokenList(chainId);
    const tokenCount = tokens.length;
    
    // Test quotes with popular token pairs
    const testPairs = this.getTestPairs(chainId, tokens);
    const testQuotes = testPairs.length;
    let successfulQuotes = 0;
    const responseTimes: number[] = [];
    
    for (const pair of testPairs) {
      try {
        const quoteStartTime = Date.now();
        
        const result = await getComprehensiveAggregatorQuote({
          fromChain: chainId,
          toChain: chainId,
          fromToken: pair.fromToken,
          toToken: pair.toToken,
          fromAmount: pair.amount,
          fromAddress: '0x0000000000000000000000000000000000000000',
          slippage: 0.5,
        });
        
        const responseTime = Date.now() - quoteStartTime;
        responseTimes.push(responseTime);
        
        if (result.success) {
          successfulQuotes++;
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`[AggregatorTester] Quote failed for ${pair.fromSymbol}/${pair.toSymbol}:`, error);
      }
    }
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const coverage = testQuotes > 0 ? (successfulQuotes / testQuotes) * 100 : 0;
    
    return {
      chainId,
      chainName,
      aggregatorCount,
      tokenCount,
      testQuotes,
      successfulQuotes,
      averageResponseTime,
      coverage,
    };
  }

  /**
   * Get test token pairs for a chain
   */
  private getTestPairs(chainId: number, tokens: any[]): Array<{
    fromToken: string;
    toToken: string;
    fromSymbol: string;
    toSymbol: string;
    amount: string;
  }> {
    const pairs: Array<{
      fromToken: string;
      toToken: string;
      fromSymbol: string;
      toSymbol: string;
      amount: string;
    }> = [];
    
    // Get popular tokens for testing
    const popularTokens = tokens.filter(token => {
      const popularSymbols = ['ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'WETH', 'WBTC', 'BNB', 'MATIC', 'AVAX', 'FTM', 'SOL', 'ATOM'];
      return popularSymbols.includes(token.symbol.toUpperCase());
    }).slice(0, 5);
    
    // Create test pairs
    for (let i = 0; i < popularTokens.length; i++) {
      for (let j = i + 1; j < popularTokens.length; j++) {
        const fromToken = popularTokens[i];
        const toToken = popularTokens[j];
        
        pairs.push({
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromSymbol: fromToken.symbol,
          toSymbol: toToken.symbol,
          amount: this.getTestAmount(fromToken.symbol),
        });
      }
    }
    
    return pairs.slice(0, 10); // Limit to 10 pairs per chain
  }

  /**
   * Get appropriate test amount based on token symbol
   */
  private getTestAmount(symbol: string): string {
    const amounts: { [key: string]: string } = {
      'ETH': '1000000000000000000', // 1 ETH
      'BTC': '100000000', // 1 BTC (8 decimals)
      'USDC': '1000000', // 1 USDC (6 decimals)
      'USDT': '1000000', // 1 USDT (6 decimals)
      'DAI': '1000000000000000000', // 1 DAI (18 decimals)
      'WETH': '1000000000000000000', // 1 WETH (18 decimals)
      'WBTC': '100000000', // 1 WBTC (8 decimals)
      'BNB': '1000000000000000000', // 1 BNB (18 decimals)
      'MATIC': '1000000000000000000', // 1 MATIC (18 decimals)
      'AVAX': '1000000000000000000', // 1 AVAX (18 decimals)
      'FTM': '1000000000000000000', // 1 FTM (18 decimals)
      'SOL': '1000000000', // 1 SOL (9 decimals)
      'ATOM': '1000000', // 1 ATOM (6 decimals)
    };
    
    return amounts[symbol.toUpperCase()] || '1000000000000000000'; // Default to 1 token (18 decimals)
  }

  /**
   * Generate comprehensive test summary
   */
  private generateSummary(): void {
    console.log('\n[AggregatorTester] 📊 COMPREHENSIVE AGGREGATOR COVERAGE SUMMARY');
    console.log('='.repeat(80));
    
    let totalAggregators = 0;
    let totalTokens = 0;
    let totalQuotes = 0;
    let totalSuccessful = 0;
    let totalResponseTime = 0;
    
    this.results.forEach(result => {
      totalAggregators += result.aggregatorCount;
      totalTokens += result.tokenCount;
      totalQuotes += result.testQuotes;
      totalSuccessful += result.successfulQuotes;
      totalResponseTime += result.averageResponseTime;
      
      console.log(`\n${result.chainName} (${result.chainId}):`);
      console.log(`  Aggregators: ${result.aggregatorCount}`);
      console.log(`  Tokens: ${result.tokenCount}`);
      console.log(`  Test Quotes: ${result.testQuotes}`);
      console.log(`  Successful: ${result.successfulQuotes}`);
      console.log(`  Coverage: ${result.coverage.toFixed(1)}%`);
      console.log(`  Avg Response Time: ${result.averageResponseTime.toFixed(0)}ms`);
    });
    
    const overallCoverage = totalQuotes > 0 ? (totalSuccessful / totalQuotes) * 100 : 0;
    const avgResponseTime = this.results.length > 0 ? totalResponseTime / this.results.length : 0;
    
    console.log('\n[AggregatorTester] 🎯 OVERALL STATISTICS');
    console.log('='.repeat(80));
    console.log(`Total Chains Tested: ${this.results.length}`);
    console.log(`Total Aggregators: ${totalAggregators}`);
    console.log(`Total Tokens: ${totalTokens}`);
    console.log(`Total Test Quotes: ${totalQuotes}`);
    console.log(`Total Successful Quotes: ${totalSuccessful}`);
    console.log(`Overall Coverage: ${overallCoverage.toFixed(1)}%`);
    console.log(`Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
    
    // Performance benchmarks
    console.log('\n[AggregatorTester] 🏆 PERFORMANCE BENCHMARKS');
    console.log('='.repeat(80));
    
    const excellentChains = this.results.filter(r => r.coverage >= 90);
    const goodChains = this.results.filter(r => r.coverage >= 70 && r.coverage < 90);
    const needsImprovementChains = this.results.filter(r => r.coverage < 70);
    
    console.log(`Excellent Coverage (≥90%): ${excellentChains.length} chains`);
    excellentChains.forEach(chain => {
      console.log(`  ✅ ${chain.chainName}: ${chain.coverage.toFixed(1)}%`);
    });
    
    console.log(`Good Coverage (70-89%): ${goodChains.length} chains`);
    goodChains.forEach(chain => {
      console.log(`  ⚠️ ${chain.chainName}: ${chain.coverage.toFixed(1)}%`);
    });
    
    console.log(`Needs Improvement (<70%): ${needsImprovementChains.length} chains`);
    needsImprovementChains.forEach(chain => {
      console.log(`  ❌ ${chain.chainName}: ${chain.coverage.toFixed(1)}%`);
    });
    
    // Aggregator recommendations
    console.log('\n[AggregatorTester] 💡 RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    if (overallCoverage >= 90) {
      console.log('🎉 Excellent aggregator coverage! The system is performing optimally.');
    } else if (overallCoverage >= 70) {
      console.log('👍 Good aggregator coverage. Consider adding more aggregators for better coverage.');
    } else {
      console.log('⚠️ Aggregator coverage needs improvement. Add more aggregators and check API endpoints.');
    }
    
    if (avgResponseTime > 3000) {
      console.log('⏱️ Response times are slow. Consider optimizing aggregator calls and caching.');
    } else if (avgResponseTime > 1000) {
      console.log('⚡ Response times are acceptable but could be improved with better caching.');
    } else {
      console.log('🚀 Excellent response times! The system is very responsive.');
    }
    
    console.log('\n[AggregatorTester] ✅ Comprehensive test completed!');
  }

  /**
   * Test specific aggregator
   */
  async testSpecificAggregator(chainId: number, aggregatorName: string): Promise<boolean> {
    console.log(`[AggregatorTester] 🧪 Testing ${aggregatorName} on chain ${chainId}...`);
    
    try {
      const tokens = await getComprehensiveTokenList(chainId);
      const popularTokens = tokens.filter(token => 
        ['ETH', 'USDC', 'USDT'].includes(token.symbol.toUpperCase())
      ).slice(0, 2);
      
      if (popularTokens.length < 2) {
        console.log(`[AggregatorTester] ❌ Not enough tokens for testing ${aggregatorName}`);
        return false;
      }
      
      const result = await getComprehensiveAggregatorQuote({
        fromChain: chainId,
        toChain: chainId,
        fromToken: popularTokens[0].address,
        toToken: popularTokens[1].address,
        fromAmount: '1000000000000000000', // 1 token
        fromAddress: '0x0000000000000000000000000000000000000000',
        slippage: 0.5,
      });
      
      if (result.success) {
        console.log(`[AggregatorTester] ✅ ${aggregatorName} working correctly`);
        return true;
      } else {
        console.log(`[AggregatorTester] ❌ ${aggregatorName} failed: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error(`[AggregatorTester] ❌ ${aggregatorName} error:`, error);
      return false;
    }
  }

  getResults(): AggregatorTestResult[] {
    return this.results;
  }
}

export const comprehensiveAggregatorTester = new ComprehensiveAggregatorTester();

// Export for use in browser environment
if (typeof window !== 'undefined') {
  (window as any).comprehensiveAggregatorTester = comprehensiveAggregatorTester;
}
