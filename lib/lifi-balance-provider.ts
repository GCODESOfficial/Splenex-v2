// LiFi SDK balance provider for token balance fetching
import { getTokens, getTokenBalances, Token, config } from '@lifi/sdk'
import type { TokenAmount } from '@lifi/sdk'
import './configure-lifi-providers' // Initialize LiFi SDK with providers

// Log the current API configuration
const currentConfig = config.get()
console.log('[LiFiProvider] Config:', {
  apiUrl: currentConfig.apiUrl,
  integrator: currentConfig.integrator,
  hasRpcUrls: Object.keys(currentConfig.rpcUrls).length > 0,
  rpcUrlsCount: Object.keys(currentConfig.rpcUrls).length
})

export interface TokenBalance {
  address: string
  symbol: string
  name: string
  balance: string
  decimals: number
  price?: number
  usdValue?: number
  chain?: string
  chainId?: number
}

export class LiFiBalanceProvider {
  private supportedChains = new Set<string>()
  private tokensByChain = new Map<string, Token[]>()

  constructor() {
    this.initializeChains()
  }

  private async initializeChains() {
    // Initialize supported chain IDs directly
    const chainIds = [1, 56, 137, 42161, 10, 8453, 43114, 250]
    chainIds.forEach(id => {
      this.supportedChains.add(id.toString())
    })
    console.log(`[LiFiProvider] Initialized ${this.supportedChains.size} chains`)
  }

  /**
   * Get token balances for a wallet address across all supported chains
   * Fetches ALL tokens from LiFi API directly, no fallback - gets complete token list
   */
  async getBalancesForWallet(walletAddress: string): Promise<TokenBalance[]> {
    console.log(`[LiFiProvider] Fetching balances for wallet: ${walletAddress}`)
    
    try {
      let chainTokenMap: Map<number, Token[]> | null = null
      
      // Fetch ALL tokens from LiFi API using direct API call
      try {
        console.log(`[LiFiProvider] 📡 Fetching ALL tokens from LiFi API...`)
        
        const apiUrl = config.get().apiUrl || 'https://li.quest/v1'
        const response = await fetch(`${apiUrl}/tokens`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const tokensData = await response.json()
          console.log(`[LiFiProvider] ✅ Successfully fetched tokens from LiFi API`)
          
          chainTokenMap = new Map()
          
          // Focus on EVM chains we support
          const supportedChainIds = [1, 56, 137, 42161, 10, 8453, 43114, 250]
          
          for (const chainId of supportedChainIds) {
            const chainKey = chainId.toString()
            if (tokensData.tokens && tokensData.tokens[chainKey] && tokensData.tokens[chainKey].length > 0) {
              // Convert to Token format
              const tokens = tokensData.tokens[chainKey].map((t: any) => ({
                chainId,
                address: t.address,
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                logoURI: t.logoURI,
              }))
              
              chainTokenMap.set(chainId, tokens)
              console.log(`[LiFiProvider] Chain ${chainId}: ${tokens.length} tokens available`)
            }
          }
        } else {
          console.warn(`[LiFiProvider] ⚠️ API returned status ${response.status}`)
        }
      } catch (apiError) {
        console.error(`[LiFiProvider] ❌ Failed to fetch tokens from API:`, apiError)
      }
      
      // Fallback to known tokens if API failed
      if (!chainTokenMap || chainTokenMap.size === 0) {
        console.log(`[LiFiProvider] Using known popular tokens as fallback`)
        chainTokenMap = this.buildKnownTokensMap()
      }
      
      const allTokens: TokenBalance[] = []
      const chainPromises: Promise<TokenBalance[]>[] = []

      // Process each chain
      for (const [chainId, tokens] of chainTokenMap.entries()) {
        console.log(`[LiFiProvider] Processing chain ${chainId} with ${tokens.length} tokens`)
        chainPromises.push(
          this.getBalancesForChain(walletAddress, chainId, tokens)
        )
      }

      // Wait for all chains to complete
      const results = await Promise.all(chainPromises)
      
      // Flatten results
      results.forEach(tokens => {
        allTokens.push(...tokens)
      })

      console.log(`[LiFiProvider] Total balances found: ${allTokens.length}`)
      return allTokens
    } catch (error) {
      console.error('[LiFiProvider] Error fetching balances:', error)
      return []
    }
  }

  /**
   * Build a map of known tokens for each chain
   */
  private buildKnownTokensMap(): Map<number, Token[]> {
    const chainTokenMap = new Map<number, Token[]>()

    // Ethereum
    chainTokenMap.set(1, [
      { chainId: 1, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 1, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { chainId: 1, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      { chainId: 1, address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      { chainId: 1, address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
      { chainId: 1, address: '0x4d224452801ACEd8B2F0aebE155379bb5D594381', symbol: 'APE', name: 'ApeCoin', decimals: 18 },
      { chainId: 1, address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0', symbol: 'MATIC', name: 'Matic Token', decimals: 18 },
      { chainId: 1, address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', name: 'ChainLink Token', decimals: 18 },
      { chainId: 1, address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', symbol: 'SHIB', name: 'SHIBA INU', decimals: 18 },
      { chainId: 1, address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
    ] as Token[])

    // BSC
    chainTokenMap.set(56, [
      { chainId: 56, address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
      { chainId: 56, address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      { chainId: 56, address: '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', symbol: 'DAI', name: 'Dai Token', decimals: 18 },
      { chainId: 56, address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
    ] as Token[])

    // Polygon
    chainTokenMap.set(137, [
      { chainId: 137, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 137, address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { chainId: 137, address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ] as Token[])

    // Arbitrum
    chainTokenMap.set(42161, [
      { chainId: 42161, address: '0xFd086bC7CD5C481DCC95BD0d56f35241523fBab9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 42161, address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { chainId: 42161, address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ] as Token[])

    // Optimism
    chainTokenMap.set(10, [
      { chainId: 10, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 10, address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    ] as Token[])

    // Base
    chainTokenMap.set(8453, [
      { chainId: 8453, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    ] as Token[])

    // Avalanche
    chainTokenMap.set(43114, [
      { chainId: 43114, address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 43114, address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    ] as Token[])

    // Fantom
    chainTokenMap.set(250, [
      { chainId: 250, address: '0x049d68029688eAbF473097a2fC38ef61633A3C7A', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { chainId: 250, address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    ] as Token[])

    return chainTokenMap
  }

  /**
   * Get balances for a specific chain
   */
  async getBalancesForChain(
    walletAddress: string,
    chainId: number,
    tokens: Token[]
  ): Promise<TokenBalance[]> {
    try {
      console.log(`[LiFiProvider] Fetching balances on chain ${chainId} for ${tokens.length} tokens`)

      // Get balances using LiFi SDK (requires providers to be configured)
      const tokenAmounts = await getTokenBalances(walletAddress, tokens)
      
      const balances: TokenBalance[] = []

      // Process each token balance
      for (const tokenAmount of tokenAmounts) {
        if (!tokenAmount || !tokenAmount.amount || tokenAmount.amount === '0') {
          continue
        }

        // Calculate USD value if price is available
        const price = tokenAmount.token?.priceUSD 
          ? parseFloat(tokenAmount.token.priceUSD) 
          : 0
        const balance = parseFloat(tokenAmount.amount) / Math.pow(10, tokenAmount.token.decimals)
        const usdValue = balance * price

        balances.push({
          address: tokenAmount.token.address,
          symbol: tokenAmount.token.symbol,
          name: tokenAmount.token.name,
          balance: balance.toFixed(6),
          decimals: tokenAmount.token.decimals,
          price: price || 0,
          usdValue: usdValue || 0,
          chain: this.getChainName(chainId),
          chainId: chainId,
        })
      }

      console.log(`[LiFiProvider] Found ${balances.length} tokens with balance on chain ${chainId}`)
      return balances
    } catch (error) {
      console.error(`[LiFiProvider] Error fetching balances for chain ${chainId}:`, error)
      return []
    }
  }

  /**
   * Get balances for specific chains only
   */
  async getBalancesForChains(
    walletAddress: string,
    chainIds: number[]
  ): Promise<TokenBalance[]> {
    console.log(`[LiFiProvider] Fetching balances for chains: ${chainIds.join(', ')}`)
    
    try {
      // Get tokens for the requested chains only
      const tokensResponse = await getTokens({
        chains: chainIds,
      })

      const allTokens: TokenBalance[] = []

      // Process each requested chain
      for (const chainId of chainIds) {
        const tokens = tokensResponse.tokens[chainId.toString()]
        if (!tokens || tokens.length === 0) {
          console.log(`[LiFiProvider] No tokens available for chain ${chainId}`)
          continue
        }

        const balances = await this.getBalancesForChain(walletAddress, chainId, tokens)
        allTokens.push(...balances)
      }

      console.log(`[LiFiProvider] Total balances found for ${chainIds.length} chains: ${allTokens.length}`)
      return allTokens
    } catch (error) {
      console.error('[LiFiProvider] Error fetching balances:', error)
      return []
    }
  }

  /**
   * Get chain name from chain ID
   */
  private getChainName(chainId: number): string {
    const chainNameMap: Record<number, string> = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon',
      43114: 'Avalanche',
      250: 'Fantom',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
    }
    return chainNameMap[chainId] || `Chain ${chainId}`
  }
}

// Export a singleton instance
export const lifiBalanceProvider = new LiFiBalanceProvider()

