/**
 * Address-Neutral Quote System
 * 
 * This implementation makes the quote system address-neutral by:
 * 1. Treating all addresses equally (no special handling for native vs ERC20)
 * 2. Letting the aggregators handle address interpretation
 * 3. Removing assumptions about token types
 * 4. Processing swaps based on whatever address is provided
 */

// Address-neutral quote request interface
interface AddressNeutralQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;        // Any address - native, ERC20, or custom
  toToken: string;          // Any address - native, ERC20, or custom
  fromAmount: string;       // Amount in Wei
  fromAddress: string;      // User's wallet address
  toAddress?: string;       // Optional destination address
  slippage?: number;        // Slippage tolerance
}

// Address-neutral quote response
interface AddressNeutralQuote {
  provider: string;
  toAmount: string;
  priceImpact?: number;
  estimatedGas?: string;
  path?: string[];
  swapData?: string;
  minimumReceived?: string;
  // No assumptions about token types - just raw data
}

/**
 * Address-neutral quote processor
 * Processes any address without making assumptions about token type
 */
class AddressNeutralQuoteProcessor {
  
  /**
   * Process quote request with any token addresses
   * No special handling for native vs ERC20 tokens
   */
  async processQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    console.log('[AddressNeutral] 🔄 Processing quote with any addresses');
    console.log(`[AddressNeutral] From: ${request.fromToken} (Chain ${request.fromChain})`);
    console.log(`[AddressNeutral] To: ${request.toToken} (Chain ${request.toChain})`);
    console.log(`[AddressNeutral] Amount: ${request.fromAmount}`);
    
    // No address validation or type checking - just pass through
    const quotes = await this.fetchQuotesFromAggregators(request);
    
    if (quotes.length === 0) {
      console.log('[AddressNeutral] ❌ No quotes available');
      return null;
    }
    
    // Select best quote based on output amount only
    const bestQuote = quotes.reduce((best, current) => {
      const bestAmount = BigInt(best.toAmount || '0');
      const currentAmount = BigInt(current.toAmount || '0');
      return currentAmount > bestAmount ? current : best;
    });
    
    console.log(`[AddressNeutral] ✅ Best quote from: ${bestQuote.provider}`);
    return bestQuote;
  }
  
  /**
   * Fetch quotes from multiple aggregators
   * Each aggregator handles address interpretation independently
   */
  private async fetchQuotesFromAggregators(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote[]> {
    const aggregators = [
      () => this.fetch1inchQuote(request),
      () => this.fetch0xQuote(request),
      () => this.fetchParaSwapQuote(request),
      () => this.fetchUniswapQuote(request),
      () => this.fetchSushiSwapQuote(request),
    ];
    
    const quotes = await Promise.allSettled(
      aggregators.map(aggregator => aggregator())
    );
    
    return quotes
      .filter((result): result is PromiseFulfilledResult<AddressNeutralQuote | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value);
  }
  
  /**
   * Fetch quote from 1inch
   * Passes addresses directly without interpretation
   */
  private async fetch1inchQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    try {
      console.log('[1inch] 🔥 Fetching quote with addresses:', request.fromToken, '→', request.toToken);
      
      const chainName = this.getChainName(request.fromChain);
      const baseUrl = `https://api.1inch.io/v5.2/${chainName}`;
      
      // Direct API call with provided addresses
      const quoteUrl = `${baseUrl}/quote?fromTokenAddress=${request.fromToken}&toTokenAddress=${request.toToken}&amount=${request.fromAmount}&slippage=${request.slippage || 1}`;
      
      const response = await fetch(quoteUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      });
      
      if (!response.ok) {
        console.log('[1inch] ❌ Quote failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      return {
        provider: '1inch',
        toAmount: data.toTokenAmount || '0',
        priceImpact: data.estimatedGas ? parseFloat(data.estimatedGas) : 0,
        estimatedGas: data.estimatedGas || '150000',
        path: this.extractPathFrom1inch(data),
        swapData: data.tx?.data || '',
        minimumReceived: data.toTokenAmount || '0'
      };
      
    } catch (error) {
      console.log('[1inch] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * Fetch quote from 0x
   * Passes addresses directly without interpretation
   */
  private async fetch0xQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    try {
      console.log('[0x] ⚡ Fetching quote with addresses:', request.fromToken, '→', request.toToken);
      
      const chainName = this.getChainName(request.fromChain);
      const baseUrl = `https://${chainName}.api.0x.org/swap/v1`;
      
      // Direct API call with provided addresses
      const quoteUrl = `${baseUrl}/quote?sellToken=${request.fromToken}&buyToken=${request.toToken}&sellAmount=${request.fromAmount}&slippagePercentage=${(request.slippage || 1) / 100}`;
      
      const response = await fetch(quoteUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      });
      
      if (!response.ok) {
        console.log('[0x] ❌ Quote failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      return {
        provider: '0x',
        toAmount: data.buyAmount || '0',
        priceImpact: data.priceImpact ? parseFloat(data.priceImpact) : 0,
        estimatedGas: data.estimatedGas || '150000',
        path: this.extractPathFrom0x(data),
        swapData: data.data || '',
        minimumReceived: data.minimumProtocolFee ? (BigInt(data.buyAmount) - BigInt(data.minimumProtocolFee)).toString() : data.buyAmount
      };
      
    } catch (error) {
      console.log('[0x] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * Fetch quote from ParaSwap
   * Passes addresses directly without interpretation
   */
  private async fetchParaSwapQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    try {
      console.log('[ParaSwap] 🦄 Fetching quote with addresses:', request.fromToken, '→', request.toToken);
      
      const baseUrl = 'https://apiv5.paraswap.io';
      
      // Direct API call with provided addresses
      const quoteUrl = `${baseUrl}/prices/?srcToken=${request.fromToken}&destToken=${request.toToken}&amount=${request.fromAmount}&srcDecimals=18&destDecimals=18&side=SELL&network=${request.fromChain}`;
      
      const response = await fetch(quoteUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      });
      
      if (!response.ok) {
        console.log('[ParaSwap] ❌ Quote failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.priceRoute) {
        return null;
      }
      
      return {
        provider: 'paraswap',
        toAmount: data.priceRoute.destAmount || '0',
        priceImpact: data.priceRoute.priceImpact ? parseFloat(data.priceRoute.priceImpact) : 0,
        estimatedGas: data.priceRoute.gasCostUSD ? '150000' : '150000',
        path: this.extractPathFromParaSwap(data.priceRoute),
        swapData: '',
        minimumReceived: data.priceRoute.destAmount || '0'
      };
      
    } catch (error) {
      console.log('[ParaSwap] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * Fetch quote from Uniswap
   * Passes addresses directly without interpretation
   */
  private async fetchUniswapQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    try {
      console.log('[Uniswap] 🦄 Fetching quote with addresses:', request.fromToken, '→', request.toToken);
      
      // Use Uniswap V3 subgraph for quote
      const subgraphUrls: { [key: number]: string } = {
        1: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
        42161: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-v3",
        10: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-optimism-v3",
        137: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-polygon-v3",
      };
      
      const subgraphUrl = subgraphUrls[request.fromChain];
      if (!subgraphUrl) {
        return null;
      }
      
      const query = `
        query GetTokenPair($token0: String!, $token1: String!) {
          pools(
            where: {
              or: [
                { token0: $token0, token1: $token1 },
                { token0: $token1, token1: $token0 }
              ],
              liquidity_gt: "0"
            },
            orderBy: liquidity,
            orderDirection: desc,
            first: 1
          ) {
            id
            liquidity
            token0Price
            token1Price
            feeTier
          }
        }
      `;
      
      const response = await fetch(subgraphUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: {
            token0: request.fromToken.toLowerCase(),
            token1: request.toToken.toLowerCase(),
          }
        })
      });
      
      if (!response.ok) {
        console.log('[Uniswap] ❌ Subgraph failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      if (!data.data || !data.data.pools || data.data.pools.length === 0) {
        return null;
      }
      
      const pool = data.data.pools[0];
      const fromAmount = BigInt(request.fromAmount);
      const estimatedOutput = fromAmount; // Simplified calculation
      
      return {
        provider: 'uniswap',
        toAmount: estimatedOutput.toString(),
        priceImpact: 0.5, // Simplified
        estimatedGas: '150000',
        path: [request.fromToken, request.toToken],
        swapData: '',
        minimumReceived: estimatedOutput.toString()
      };
      
    } catch (error) {
      console.log('[Uniswap] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * Fetch quote from SushiSwap
   * Passes addresses directly without interpretation
   */
  private async fetchSushiSwapQuote(request: AddressNeutralQuoteRequest): Promise<AddressNeutralQuote | null> {
    try {
      console.log('[SushiSwap] 🍣 Fetching quote with addresses:', request.fromToken, '→', request.toToken);
      
      const baseUrl = "https://api.sushi.com";
      
      // Direct API call with provided addresses
      const quoteUrl = `${baseUrl}/swap/v1/quote?chainId=${request.fromChain}&tokenIn=${request.fromToken}&tokenOut=${request.toToken}&amount=${request.fromAmount}&slippagePercentage=${request.slippage || 1}`;
      
      const response = await fetch(quoteUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Splenex-DEX/1.0'
        }
      });
      
      if (!response.ok) {
        console.log('[SushiSwap] ❌ Quote failed:', response.status);
        return null;
      }
      
      const data = await response.json();
      
      return {
        provider: 'sushiswap',
        toAmount: data.amountOut || '0',
        priceImpact: data.priceImpact ? parseFloat(data.priceImpact) : 0,
        estimatedGas: data.gasEstimate || '150000',
        path: this.extractPathFromSushiSwap(data),
        swapData: '',
        minimumReceived: data.amountOut || '0'
      };
      
    } catch (error) {
      console.log('[SushiSwap] ❌ Error:', error);
      return null;
    }
  }
  
  /**
   * Helper methods for path extraction
   */
  private extractPathFrom1inch(data: any): string[] {
    const path: string[] = [];
    if (data.protocols && data.protocols.length > 0) {
      data.protocols.forEach((protocol: any) => {
        protocol.forEach((step: any) => {
          if (step.fromTokenAddress) path.push(step.fromTokenAddress);
          if (step.toTokenAddress) path.push(step.toTokenAddress);
        });
      });
    }
    return [...new Set(path)];
  }
  
  private extractPathFrom0x(data: any): string[] {
    const path: string[] = [];
    if (data.orders && data.orders.length > 0) {
      data.orders.forEach((order: any) => {
        if (order.makerToken) path.push(order.makerToken);
        if (order.takerToken) path.push(order.takerToken);
      });
    }
    return [...new Set(path)];
  }
  
  private extractPathFromParaSwap(priceRoute: any): string[] {
    const path: string[] = [];
    if (priceRoute.bestRoute && priceRoute.bestRoute.length > 0) {
      priceRoute.bestRoute.forEach((route: any) => {
        if (route.swaps && route.swaps.length > 0) {
          route.swaps.forEach((swap: any) => {
            if (swap.srcToken) path.push(swap.srcToken);
            if (swap.destToken) path.push(swap.destToken);
          });
        }
      });
    }
    return [...new Set(path)];
  }
  
  private extractPathFromSushiSwap(data: any): string[] {
    const path: string[] = [];
    if (data.route && data.route.length > 0) {
      data.route.forEach((token: any) => {
        if (token.address) path.push(token.address);
      });
    }
    return [...new Set(path)];
  }
  
  /**
   * Get chain name from chain ID
   */
  private getChainName(chainId: number): string {
    const chainMap: { [key: number]: string } = {
      1: 'ethereum',
      56: 'bsc',
      137: 'polygon',
      42161: 'arbitrum',
      10: 'optimism',
      43114: 'avalanche',
      8453: 'base',
      250: 'fantom',
    };
    return chainMap[chainId] || 'ethereum';
  }
}

/**
 * Address-neutral API endpoint
 * Processes any token addresses without assumptions
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    const fromChain = parseInt(searchParams.get("fromChain") || "0");
    const toChain = parseInt(searchParams.get("toChain") || "0");
    const fromToken = searchParams.get("fromToken") || "";
    const toToken = searchParams.get("toToken") || "";
    const fromAmount = searchParams.get("fromAmount") || "";
    const fromAddress = searchParams.get("fromAddress") || "";
    const toAddress = searchParams.get("toAddress") || undefined;
    const slippage = parseFloat(searchParams.get("slippage") || "0.5");
    
    // Basic validation - no address type checking
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return Response.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }
    
    if (fromAmount === "0" || parseFloat(fromAmount) <= 0) {
      return Response.json({
        success: false,
        error: "Amount must be greater than 0",
      }, { status: 400 });
    }
    
    console.log("[AddressNeutral API] 🎯 Processing quote with any addresses");
    console.log(`[AddressNeutral API] ${fromToken} (${fromChain}) → ${toToken} (${toChain})`);
    console.log(`[AddressNeutral API] Amount: ${fromAmount}`);
    
    const processor = new AddressNeutralQuoteProcessor();
    const quote = await processor.processQuote({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage,
    });
    
    if (!quote) {
      console.log("[AddressNeutral API] ❌ No quotes available");
      return Response.json({
        success: false,
        error: "No quotes available for this token pair",
      }, { status: 404 });
    }
    
    console.log(`[AddressNeutral API] ✅ Quote from: ${quote.provider}`);
    
    return Response.json({
      success: true,
      data: quote,
      provider: quote.provider,
    });
    
  } catch (error) {
    console.error("[AddressNeutral API] Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get quote",
      },
      { status: 500 }
    );
  }
}

/**
 * Address-neutral POST endpoint
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const {
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage = 0.5,
    } = body;
    
    // Basic validation - no address type checking
    if (!fromChain || !toChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      return Response.json({
        success: false,
        error: "Missing required parameters",
      }, { status: 400 });
    }
    
    console.log("[AddressNeutral API] 🎯 POST Processing quote with any addresses");
    
    const processor = new AddressNeutralQuoteProcessor();
    const quote = await processor.processQuote({
      fromChain,
      toChain,
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress,
      slippage,
    });
    
    if (!quote) {
      return Response.json({
        success: false,
        error: "No quotes available for this token pair",
      }, { status: 404 });
    }
    
    return Response.json({
      success: true,
      data: quote,
      provider: quote.provider,
    });
    
  } catch (error) {
    console.error("[AddressNeutral API] Error:", error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get quote",
      },
      { status: 500 }
    );
  }
}

// Export the processor for use in other modules
export { AddressNeutralQuoteProcessor, AddressNeutralQuoteRequest, AddressNeutralQuote };
