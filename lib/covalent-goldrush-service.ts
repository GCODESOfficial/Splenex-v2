import { GoldRushClient } from "@covalenthq/client-sdk"

export interface CovalentTokenBalance {
  contract_decimals: number
  contract_name: string
  contract_ticker_symbol: string
  contract_address: string
  contract_display_name: string
  supports_erc: string[]
  logo_url: string
  logo_urls: {
    token_logo_url: string
    protocol_logo_url: string
    chain_logo_url: string
  }
  last_transferred_at: string
  block_height: number
  native_token: boolean
  type: string
  is_spam: boolean
  balance: string
  balance_24h: string
  quote_rate: number
  quote_rate_24h: number
  quote: number
  quote_24h: number
  pretty_quote: string
  pretty_quote_24h: string
  protocol_metadata?: {
    protocol_name: string
  }
}

export interface CovalentBalanceResponse {
  address: string
  chain_id: number
  chain_name: string
  chain_tip_height: number
  chain_tip_signed_at: string
  quote_currency: string
  updated_at: string
  items: CovalentTokenBalance[]
}

export interface TokenBalance {
  symbol: string
  name: string
  balance: string
  usdValue: number
  price: number
  address: string
  chain: string
  chainId: string
  decimals: number
  logoUrl?: string
  isNative?: boolean
  type?: string
  isSpam?: boolean
  prettyQuote?: string
  prettyQuote24h?: string
}

class CovalentGoldRushService {
  private apiKey: string | null = null

  constructor() {
    this.apiKey = process.env.COVALENT_API_KEY || null
  }

  // Map chain names to Covalent chain names
  private getCovalentChainName(chainName: string): string {
    const chainMap: { [key: string]: string } = {
      'eth': 'eth-mainnet',
      'ethereum': 'eth-mainnet',
      'bsc': 'bsc-mainnet',
      'binance': 'bsc-mainnet',
      'polygon': 'matic-mainnet',
      'matic': 'matic-mainnet',
      'arbitrum': 'arbitrum-mainnet',
      'optimism': 'optimism-mainnet',
      'base': 'base-mainnet',
      'avalanche': 'avalanche-mainnet',
      'fantom': 'fantom-mainnet',
      'avax': 'avalanche-mainnet'
    }

    return chainMap[chainName.toLowerCase()] || 'eth-mainnet'
  }

  // Map chain names to chainId
  private getChainId(chainName: string): string {
    const chainMap: { [key: string]: string } = {
      'eth': '0x1',
      'ethereum': '0x1',
      'bsc': '0x38',
      'binance': '0x38',
      'polygon': '0x89',
      'matic': '0x89',
      'arbitrum': '0xa4b1',
      'optimism': '0xa',
      'base': '0x2105',
      'avalanche': '0xa86a',
      'avax': '0xa86a',
      'fantom': '0xfa'
    }

    return chainMap[chainName.toLowerCase()] || '0x1'
  }

  // Convert Covalent token balance to our format
  private convertTokenBalance(covalentToken: CovalentTokenBalance, chainName: string): TokenBalance {
    const balance = parseFloat(covalentToken.balance) / Math.pow(10, covalentToken.contract_decimals)
    const chainId = this.getChainId(chainName)
    
    return {
      symbol: covalentToken.contract_ticker_symbol || 'Unknown',
      name: covalentToken.contract_name || covalentToken.contract_display_name || 'Unknown Token',
      balance: balance.toString(),
      usdValue: covalentToken.quote || 0,
      price: covalentToken.quote_rate || 0,
      address: covalentToken.contract_address,
      chain: chainName,
      chainId,
      decimals: covalentToken.contract_decimals,
      logoUrl: covalentToken.logo_url || covalentToken.logo_urls?.token_logo_url,
      isNative: covalentToken.native_token,
      type: covalentToken.type,
      isSpam: covalentToken.is_spam,
      prettyQuote: covalentToken.pretty_quote,
      prettyQuote24h: covalentToken.pretty_quote_24h
    }
  }

  // Get token balances for a wallet address using direct API
  async getTokenBalances(
    walletAddress: string, 
    chainName: string, 
    quoteCurrency: string = 'USD',
    noSpam: boolean = true
  ): Promise<TokenBalance[]> {
    if (!this.apiKey) {
      console.error('[CovalentGoldRush] ❌ API key not configured - returning empty result')
      console.error('[CovalentGoldRush] Please set COVALENT_API_KEY environment variable')
      throw new Error('Covalent API key not configured')
    }

    try {
      const covalentChainName = this.getCovalentChainName(chainName)
      
      console.log(`[CovalentGoldRush] 📡 Fetching ALL token balances for ${walletAddress} on ${covalentChainName}`)

      // Use direct API call to Covalent balances_v2 endpoint
      // This endpoint returns ALL tokens in the wallet, not just popular ones
      const url = `https://api.covalenthq.com/v1/${covalentChainName}/address/${walletAddress}/balances_v2/?key=${this.apiKey}&quote-currency=${quoteCurrency}&no-spam=${noSpam}&nft=false`
      
      console.log(`[CovalentGoldRush] API URL: https://api.covalenthq.com/v1/${covalentChainName}/address/${walletAddress}/balances_v2/`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      })

      console.log(`[CovalentGoldRush] Response status: ${response.status}`)

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        console.error(`[CovalentGoldRush] ❌ API request failed: ${response.status} - ${errorText}`)
        throw new Error(`Covalent API failed: ${response.status}`)
      }

      const data = await response.json()

      if (!data.data?.items || data.data.items.length === 0) {
        console.log(`[CovalentGoldRush] ℹ️ No tokens found for ${walletAddress} on ${covalentChainName}`)
        return []
      }

      console.log(`[CovalentGoldRush] ✅ Found ${data.data.items.length} raw tokens from API`)

      // Convert to our format
      // IMPORTANT: We fetch ALL tokens returned by Covalent - they already return complete token list
      const tokens = data.data.items
        .filter((token: CovalentTokenBalance) => !noSpam || !token.is_spam) // Filter spam if requested
        .map((token: CovalentTokenBalance) => this.convertTokenBalance(token, chainName))
        .filter((token: TokenBalance) => parseFloat(token.balance) > 0) // Only include tokens with balance > 0

      console.log(`[CovalentGoldRush] ✅ Returning ${tokens.length} tokens (ALL tokens with balance > 0)`)
      console.log(`[CovalentGoldRush] 📋 Token list:`, tokens.map((t: TokenBalance) => `${t.symbol} (${t.balance})`))
      
      return tokens

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[CovalentGoldRush] ❌ Error fetching balances for ${walletAddress}:`, errorMessage)
      throw error // Re-throw to distinguish between error and empty wallet
    }
  }

  // Get balances for multiple chains
  async getMultiChainBalances(
    walletAddress: string,
    chains: string[],
    quoteCurrency: string = 'USD',
    noSpam: boolean = true
  ): Promise<TokenBalance[]> {
    const allTokens: TokenBalance[] = []
    const tokenMap = new Map<string, TokenBalance>() // To prevent duplicates

    for (const chain of chains) {
      try {
        const chainTokens = await this.getTokenBalances(walletAddress, chain, quoteCurrency, noSpam)
        
        for (const token of chainTokens) {
          // Create a unique key based on contract address and chain
          const key = `${token.address.toLowerCase()}-${token.chain.toLowerCase()}`
          
          if (!tokenMap.has(key)) {
            tokenMap.set(key, token)
          } else {
            // If token exists, combine balances (for tokens that exist on multiple chains)
            const existingToken = tokenMap.get(key)!
            const combinedBalance = parseFloat(existingToken.balance) + parseFloat(token.balance)
            const combinedUsdValue = existingToken.usdValue + token.usdValue
            
            tokenMap.set(key, {
              ...existingToken,
              balance: combinedBalance.toString(),
              usdValue: combinedUsdValue
            })
          }
        }
      } catch (error) {
        console.error(`[CovalentGoldRush] Error fetching balances for chain ${chain}:`, error)
      }
    }

    return Array.from(tokenMap.values())
  }

  // Get total USD value across all chains
  async getTotalUsdValue(
    walletAddress: string,
    chains: string[],
    quoteCurrency: string = 'USD',
    noSpam: boolean = true
  ): Promise<number> {
    const tokens = await this.getMultiChainBalances(walletAddress, chains, quoteCurrency, noSpam)
    return tokens.reduce((total, token) => total + token.usdValue, 0)
  }
}

// Export singleton instance
export const covalentGoldRushService = new CovalentGoldRushService()
