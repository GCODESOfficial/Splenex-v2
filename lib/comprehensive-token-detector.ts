// Comprehensive token detection service using Covalent GoldRush API only
import { tokenProviders, TokenProvider, TokenBalance } from './token-providers'

export interface ComprehensiveTokenResult {
  tokens: TokenBalance[]
  totalUsdValue: number
  detectionMethods: string[]
  errors: string[]
}

export class ComprehensiveTokenDetector {
  private covalentApiKey: string

  constructor() {
    this.covalentApiKey = process.env.COVALENT_API_KEY || ''
  }

  // Main method to detect all tokens using Covalent comprehensive strategy across multiple chains
  async detectAllTokens(address: string, chain: string): Promise<ComprehensiveTokenResult> {
    console.log(`[ComprehensiveDetector] Starting comprehensive Covalent token detection for ${address}`)
    
    const allTokens: TokenBalance[] = []
    const detectionMethods: string[] = []
    const errors: string[] = []

    // Define all supported chains to check
    const supportedChains = [
      { name: 'Ethereum', id: 'eth', native: 'ETH' },
      { name: 'BSC', id: 'bsc', native: 'BNB' },
      { name: 'Base', id: 'base', native: 'ETH' },
      { name: 'Arbitrum', id: 'arbitrum', native: 'ETH' },
      { name: 'Polygon', id: 'polygon', native: 'MATIC' },
      { name: 'Optimism', id: 'optimism', native: 'ETH' },
      { name: 'Avalanche', id: 'avalanche', native: 'AVAX' },
      { name: 'Fantom', id: 'fantom', native: 'FTM' }
    ]

    // Strategy 1: Multi-chain Covalent GoldRush API
    console.log('[ComprehensiveDetector] Strategy 1: Multi-chain Covalent GoldRush API')
    const multiChainTokens = await this.detectViaMultiChainCovalent(address, supportedChains)
    allTokens.push(...multiChainTokens.tokens)
    detectionMethods.push(...multiChainTokens.methods)
    errors.push(...multiChainTokens.errors)

    // Remove duplicates and calculate total value
    const uniqueTokens = this.removeDuplicates(allTokens)
    const totalUsdValue = uniqueTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0)

    console.log(`[ComprehensiveDetector] ✅ Detection complete: ${uniqueTokens.length} unique tokens found`)
    console.log(`[ComprehensiveDetector] 💰 Total USD value: $${totalUsdValue.toFixed(2)}`)
    console.log(`[ComprehensiveDetector] 🔍 Methods used: ${[...new Set(detectionMethods)].join(', ')}`)
    console.log(`[ComprehensiveDetector] 📊 Tokens by chain:`, this.groupTokensByChain(uniqueTokens))

    return {
      tokens: uniqueTokens,
      totalUsdValue,
      detectionMethods: [...new Set(detectionMethods)],
      errors
    }
  }

  // Strategy 1: Multi-chain Covalent GoldRush API
  private async detectViaMultiChainCovalent(address: string, supportedChains: any[]) {
    const tokens: TokenBalance[] = []
    const methods: string[] = []
    const errors: string[] = []

    console.log(`[ComprehensiveDetector] Starting multi-chain detection across ${supportedChains.length} chains`)

    // Process chains in parallel for better performance
    const chainPromises = supportedChains.map(async (chain) => {
      try {
        console.log(`[ComprehensiveDetector] 🔄 Checking ${chain.name} (${chain.id})`)
        
        const chainTokens = await this.detectViaCovalent(address, chain.id)
        
        // Add chain information to tokens
        const tokensWithChain = chainTokens.tokens.map(token => ({
          ...token,
          chain: chain.name,
          chainId: chain.id,
          nativeSymbol: chain.native
        }))
        
        tokens.push(...tokensWithChain)
        methods.push(...chainTokens.methods.map(method => `${method} (${chain.name})`))
        errors.push(...chainTokens.errors.map(error => `${error} (${chain.name})`))
        
        console.log(`[ComprehensiveDetector] ✅ ${chain.name}: Found ${chainTokens.tokens.length} tokens (ALL tokens from Covalent API)`)
        
        // Log details of what was found
        if (tokensWithChain.length > 0) {
          console.log(`[ComprehensiveDetector] 📋 ${chain.name} token details:`)
          tokensWithChain.forEach(t => {
            console.log(`  - ${t.symbol}: ${t.balance} ($${(t.usdValue || 0).toFixed(2)}) [${t.address}]`)
          })
        }
        
        return { chain: chain.name, tokenCount: chainTokens.tokens.length }
      } catch (error) {
        const errorMsg = `${chain.name} failed: ${error}`
        errors.push(errorMsg)
        console.log(`[ComprehensiveDetector] ❌ ${errorMsg}`)
        return { chain: chain.name, tokenCount: 0 }
      }
    })

    const results = await Promise.all(chainPromises)
    
    console.log(`[ComprehensiveDetector] Multi-chain detection complete:`)
    results.forEach(result => {
      console.log(`  ${result.chain}: ${result.tokenCount} tokens`)
    })

    return { tokens, methods, errors }
  }

  // Strategy 1: Use Covalent GoldRush API for single chain
  private async detectViaCovalent(address: string, chain: string) {
    const tokens: TokenBalance[] = []
    const methods: string[] = []
    const errors: string[] = []

    console.log(`[ComprehensiveDetector] Starting Strategy 1 with Covalent provider`)

    for (const provider of tokenProviders) {
      try {
        console.log(`[ComprehensiveDetector] 🔄 Trying ${provider.name}...`)
        
        if (provider.name === 'Covalent' && !this.covalentApiKey) {
          console.log(`[ComprehensiveDetector] ⚠️ Skipping ${provider.name} - no API key`)
          continue
        }
        
        const providerTokens = await provider.fetchTokens(address, chain)
        
        if (providerTokens && providerTokens.length > 0) {
          const convertedTokens = this.convertProviderTokens(providerTokens, provider.name)
          tokens.push(...convertedTokens)
          methods.push(provider.name)
          console.log(`[ComprehensiveDetector] ✅ ${provider.name}: Found ${providerTokens.length} tokens (ALL tokens with balance)`)
          console.log(`[ComprehensiveDetector] 📋 ${provider.name} ALL TOKENS:`, convertedTokens.map(t => `${t.symbol}: ${t.balance}`))
          console.log(`[ComprehensiveDetector] 💰 Total USD: $${convertedTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0).toFixed(2)}`)
        } else {
          console.log(`[ComprehensiveDetector] ⚠️ ${provider.name}: No tokens found`)
        }
      } catch (error) {
        const errorMsg = `${provider.name} failed: ${error}`
        errors.push(errorMsg)
        console.log(`[ComprehensiveDetector] ❌ ${errorMsg}`)
      }
    }

    console.log(`[ComprehensiveDetector] Strategy 1 completed: ${tokens.length} tokens from ${methods.length} providers`)
    return { tokens, methods, errors }
  }

  // Convert provider tokens to standard format
  private convertProviderTokens(providerTokens: any[], providerName: string): TokenBalance[] {
    return providerTokens.map(token => {
      // Handle different provider formats
      let decimals: number
      let balance: string
      let usdValue: number
      let price: number

      if (providerName === 'Covalent') {
        decimals = parseInt(token.decimals) || 18
        balance = token.balance || '0'
        usdValue = parseFloat(token.usdValue) || 0
        price = parseFloat(token.price) || 0
      } else {
        // Fallback for other formats
        decimals = parseInt(token.contract_decimals || token.decimals) || 18
        balance = token.balance || '0'
        usdValue = parseFloat(token.quote || token.usdValue) || 0
        price = parseFloat(token.quote_rate || token.price) || 0
      }

      // Calculate balance in readable format
      const balanceInTokens = parseFloat(balance) / Math.pow(10, decimals)
      const formattedBalance = balanceInTokens.toFixed(6)

      return {
        address: token.address || token.contract_address || '',
        symbol: token.symbol || token.contract_ticker_symbol || 'UNKNOWN',
        name: token.name || token.contract_name || 'Unknown Token',
        balance: formattedBalance,
        decimals,
        price,
        usdValue,
        chain: this.getChainName(token.chain || 'eth')
      }
    }).filter(token => parseFloat(token.balance) > 0)
  }

  // Get chain name from chain identifier
  private getChainName(chain: string): string {
    const chainMap: { [key: string]: string } = {
      'eth': 'Ethereum',
      'bsc': 'BSC',
      'polygon': 'Polygon',
      'arbitrum': 'Arbitrum',
      'optimism': 'Optimism',
      'base': 'Base',
      'avalanche': 'Avalanche',
      'fantom': 'Fantom'
    }
    return chainMap[chain] || chain
  }

  // Remove duplicate tokens based on address
  private removeDuplicates(tokens: TokenBalance[]): TokenBalance[] {
    const seen = new Set<string>()
    return tokens.filter(token => {
      const key = `${token.address}-${token.chain}`
      if (seen.has(key)) {
        return false
      }
      seen.add(key)
      return true
    })
  }

  // Group tokens by chain for logging
  private groupTokensByChain(tokens: TokenBalance[]): { [chain: string]: number } {
    const grouped: { [chain: string]: number } = {}
    tokens.forEach(token => {
      const chain = token.chain || 'Unknown'
      grouped[chain] = (grouped[chain] || 0) + 1
    })
    return grouped
  }
}