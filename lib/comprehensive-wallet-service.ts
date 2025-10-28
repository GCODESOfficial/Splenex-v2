import { covalentGoldRushService, TokenBalance } from './covalent-goldrush-service'

export interface ComprehensiveWalletData {
  totalUsdValue: number
  tokens: TokenBalance[]
  tokensByChain: { [chain: string]: TokenBalance[] }
  chainTotals: { [chain: string]: number }
  lastUpdated: Date
}

export interface WalletServiceConfig {
  supportedChains: string[]
  quoteCurrency: string
  noSpam: boolean
  minUsdValue: number // Minimum USD value to show token
}

class ComprehensiveWalletService {
  private config: WalletServiceConfig

  constructor(config: Partial<WalletServiceConfig> = {}) {
    this.config = {
      supportedChains: ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base', 'avalanche', 'fantom'],
      quoteCurrency: 'USD',
      noSpam: true,
      minUsdValue: 0.01, // Show tokens worth at least $0.01
      ...config
    }
  }

  /**
   * Get comprehensive wallet data across all supported chains
   * Ensures no duplicate tokens and provides complete holdings
   */
  async getComprehensiveWalletData(walletAddress: string): Promise<ComprehensiveWalletData> {
    console.log(`[WalletService] Getting comprehensive wallet data for ${walletAddress}`)
    
    try {
      // Get tokens from all supported chains
      const allTokens = await covalentGoldRushService.getMultiChainBalances(
        walletAddress,
        this.config.supportedChains,
        this.config.quoteCurrency,
        this.config.noSpam
      )

      // Filter out tokens below minimum USD value
      const filteredTokens = allTokens.filter(token => token.usdValue >= this.config.minUsdValue)

      // Group tokens by chain
      const tokensByChain: { [chain: string]: TokenBalance[] } = {}
      filteredTokens.forEach(token => {
        if (!tokensByChain[token.chain]) {
          tokensByChain[token.chain] = []
        }
        tokensByChain[token.chain].push(token)
      })

      // Sort tokens within each chain by USD value (highest first)
      Object.keys(tokensByChain).forEach(chain => {
        tokensByChain[chain].sort((a, b) => b.usdValue - a.usdValue)
      })

      // Calculate chain totals
      const chainTotals: { [chain: string]: number } = {}
      Object.entries(tokensByChain).forEach(([chain, tokens]) => {
        chainTotals[chain] = tokens.reduce((sum, token) => sum + token.usdValue, 0)
      })

      // Calculate total USD value
      const totalUsdValue = filteredTokens.reduce((sum, token) => sum + token.usdValue, 0)

      // Sort all tokens by USD value (highest first)
      const sortedTokens = filteredTokens.sort((a, b) => b.usdValue - a.usdValue)

      const result: ComprehensiveWalletData = {
        totalUsdValue,
        tokens: sortedTokens,
        tokensByChain,
        chainTotals,
        lastUpdated: new Date()
      }

      console.log(`[WalletService] Found ${sortedTokens.length} tokens across ${Object.keys(tokensByChain).length} chains`)
      console.log(`[WalletService] Total USD value: $${totalUsdValue.toFixed(2)}`)
      
      return result

    } catch (error) {
      console.error(`[WalletService] Error getting comprehensive wallet data:`, error)
      
      // Return empty data structure on error
      return {
        totalUsdValue: 0,
        tokens: [],
        tokensByChain: {},
        chainTotals: {},
        lastUpdated: new Date()
      }
    }
  }

  /**
   * Get tokens for a specific chain
   */
  async getChainTokens(walletAddress: string, chain: string): Promise<TokenBalance[]> {
    try {
      const tokens = await covalentGoldRushService.getTokenBalances(
        walletAddress,
        chain,
        this.config.quoteCurrency,
        this.config.noSpam
      )

      return tokens.filter(token => token.usdValue >= this.config.minUsdValue)
    } catch (error) {
      console.error(`[WalletService] Error getting tokens for chain ${chain}:`, error)
      return []
    }
  }

  /**
   * Get total USD value for a specific chain
   */
  async getChainTotalUsdValue(walletAddress: string, chain: string): Promise<number> {
    const tokens = await this.getChainTokens(walletAddress, chain)
    return tokens.reduce((sum, token) => sum + token.usdValue, 0)
  }

  /**
   * Get top N tokens by USD value
   */
  async getTopTokens(walletAddress: string, limit: number = 10): Promise<TokenBalance[]> {
    const walletData = await this.getComprehensiveWalletData(walletAddress)
    return walletData.tokens.slice(0, limit)
  }

  /**
   * Search tokens by symbol or name
   */
  async searchTokens(walletAddress: string, query: string): Promise<TokenBalance[]> {
    const walletData = await this.getComprehensiveWalletData(walletAddress)
    const lowerQuery = query.toLowerCase()
    
    return walletData.tokens.filter(token => 
      token.symbol.toLowerCase().includes(lowerQuery) ||
      token.name.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get tokens by type (cryptocurrency, stablecoin, nft, dust)
   */
  async getTokensByType(walletAddress: string, type: string): Promise<TokenBalance[]> {
    const walletData = await this.getComprehensiveWalletData(walletAddress)
    return walletData.tokens.filter(token => token.type === type)
  }

  /**
   * Get native tokens only
   */
  async getNativeTokens(walletAddress: string): Promise<TokenBalance[]> {
    const walletData = await this.getComprehensiveWalletData(walletAddress)
    return walletData.tokens.filter(token => token.isNative)
  }

  /**
   * Get non-native tokens only
   */
  async getNonNativeTokens(walletAddress: string): Promise<TokenBalance[]> {
    const walletData = await this.getComprehensiveWalletData(walletAddress)
    return walletData.tokens.filter(token => !token.isNative)
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<WalletServiceConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): WalletServiceConfig {
    return { ...this.config }
  }
}

// Export singleton instance
export const comprehensiveWalletService = new ComprehensiveWalletService()

// Export the class for custom instances
export { ComprehensiveWalletService }
