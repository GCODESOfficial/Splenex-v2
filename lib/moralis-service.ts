import { ChainConfig } from "./chains-config"

export interface MoralisTokenBalance {
  token_address: string
  symbol: string
  name: string
  decimals: string | number
  balance: string
  thumbnail?: string
  logo?: string
  balance_formatted?: string
  usd_price?: number
  usd_value?: number
  native_token?: boolean
  possible_spam?: boolean
  verified_contract?: boolean
}

export interface MoralisResponse {
  total: number
  cursor?: string
  page: number
  page_size: number
  result: MoralisTokenBalance[]
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
}

class MoralisService {
  private apiKey: string | null = null

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || null
  }

  // Map chain names to Moralis chain identifiers
  private getMoralisChainName(chainName: string): string {
    const chainMap: { [key: string]: string } = {
      'eth': 'eth',
      'ethereum': 'eth',
      'bsc': 'bsc',
      'binance': 'bsc',
      'polygon': 'polygon',
      'matic': 'polygon',
      'arbitrum': 'arbitrum',
      'optimism': 'optimism',
      'base': 'base',
      'avalanche': 'avalanche',
      'avax': 'avalanche',
      'fantom': 'fantom'
    }

    return chainMap[chainName.toLowerCase()] || 'eth'
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

  // Fetch token price from CoinGecko by contract address and chain
  private async fetchPriceFromCoinGecko(
    tokenAddress: string,
    symbol: string,
    chainName: string
  ): Promise<number> {
    try {
      // Map chain names to CoinGecko platform IDs
      const chainToPlatform: { [key: string]: string } = {
        'eth': 'ethereum',
        'ethereum': 'ethereum',
        'bsc': 'binance-smart-chain',
        'binance': 'binance-smart-chain',
        'polygon': 'polygon-pos',
        'matic': 'polygon-pos',
        'arbitrum': 'arbitrum-one',
        'optimism': 'optimistic-ethereum',
        'base': 'base',
        'avalanche': 'avalanche',
        'avax': 'avalanche',
        'fantom': 'fantom'
      }

      const platform = chainToPlatform[chainName.toLowerCase()] || 'ethereum'
      
      // Try to get price by contract address first (most accurate for tokens like PROVE)
      if (tokenAddress && 
          tokenAddress !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' && 
          tokenAddress !== 'native' &&
          tokenAddress.startsWith('0x')) {
        try {
          const addressLower = tokenAddress.toLowerCase()
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${addressLower}&vs_currencies=usd`,
            {
              headers: { 'Accept': 'application/json' },
            }
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data[addressLower]?.usd) {
              const price = data[addressLower].usd
              return price
            }
          } else {
          }
        } catch (e) {
          // Continue to symbol-based lookup
        }
      }
      
      // Fallback: Try by symbol
      const symbolUpper = symbol.toUpperCase()
      const coinIdMap: { [symbol: string]: string } = {
        'ETH': 'ethereum',
        'WETH': 'ethereum',
        'BNB': 'binancecoin',
        'USDT': 'tether',
        'USDC': 'usd-coin',
        'DAI': 'dai',
        'WBTC': 'wrapped-bitcoin',
        'MATIC': 'matic-network',
        'POL': 'matic-network', // Polygon's new token
        'AVAX': 'avalanche-2',
        'ARB': 'arbitrum',
        'OP': 'optimism',
        'FTM': 'fantom',
        'CAKE': 'pancakeswap-token',
      }
      
      // Stablecoins always $1
      const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'GUSD', 'USDP']
      if (stablecoins.includes(symbolUpper)) {
        return 1.0
      }
      
      const coinId = coinIdMap[symbolUpper]
      if (coinId) {
        try {
          const response = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`,
            {
              headers: { 'Accept': 'application/json' },
            }
          )
          
          if (response.ok) {
            const data = await response.json()
            if (data[coinId]?.usd) {
              return data[coinId].usd
            }
          }
        } catch (e) {
          // Continue to search
        }
      }
      
      // Last resort: Search for the token (for newer tokens like PROVE)
      try {
        const searchResponse = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`,
          {
            headers: { 'Accept': 'application/json' },
          }
        )
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          if (searchData.coins && searchData.coins.length > 0) {
            // Try to find match on the same platform
            const matchingCoin = searchData.coins.find((coin: any) => 
              coin.symbol?.toUpperCase() === symbolUpper
            ) || searchData.coins[0]
            
            const priceResponse = await fetch(
              `https://api.coingecko.com/api/v3/simple/price?ids=${matchingCoin.id}&vs_currencies=usd`,
              {
                headers: { 'Accept': 'application/json' },
              }
            )
            
            if (priceResponse.ok) {
              const priceData = await priceResponse.json()
              if (priceData[matchingCoin.id]?.usd) {
                return priceData[matchingCoin.id].usd
              }
            }
          }
        }
      } catch (e) {
        // Search failed
      }
      
      return 0
    } catch (error) {
      return 0
    }
  }

  // Convert Moralis token balance to our format
  private async convertTokenBalance(moralisToken: MoralisTokenBalance, chainName: string): Promise<TokenBalance> {
    const decimals = Number(moralisToken.decimals) || 18
    
    // Use formatted balance if available, otherwise calculate from raw balance
    let balance: number
    if (moralisToken.balance_formatted) {
      balance = parseFloat(moralisToken.balance_formatted)
    } else {
      const rawBalance = BigInt(moralisToken.balance || '0')
      const divisor = BigInt(10 ** Math.min(decimals, 18))
      const quotient = rawBalance / divisor
      const remainder = rawBalance % divisor
      balance = Number(quotient) + Number(remainder) / Number(divisor)
    }
    
    // STRICT CHECK: If balance is 0 or negative, this token shouldn't be included
    // (This is a safety check - tokens with 0 balance should already be filtered)
    if (balance <= 0) {
      // Return token with 0 balance - will be filtered out in finalTokens
      balance = 0
    }
    
    // Extract USD values from Moralis response
    let usdPrice = moralisToken.usd_price || 0
    let usdValue = moralisToken.usd_value || 0
    
    // ALWAYS fetch from CoinGecko to ensure accuracy, especially for non-native tokens
    // This ensures all tokens have accurate prices and USD values
    const coingeckoPrice = await this.fetchPriceFromCoinGecko(
      moralisToken.token_address,
      moralisToken.symbol,
      chainName
    )
    
    if (coingeckoPrice > 0) {
      // Use CoinGecko price as primary source (more reliable)
      usdPrice = coingeckoPrice
      usdValue = balance * usdPrice
    } else if (usdPrice > 0 && usdValue > 0) {
      // CoinGecko failed, use Moralis values but verify calculation
      const calculatedValue = balance * usdPrice
      // If Moralis USD value doesn't match calculated value, use calculated
      const valueDifference = Math.abs(calculatedValue - usdValue)
      if (valueDifference > 0.01) { // More than 1 cent difference
        usdValue = calculatedValue
      }
    } else {
      // Both failed, try to calculate from price if we have one
      if (usdPrice > 0) {
        usdValue = balance * usdPrice
      } else {
      }
    }
    
    return {
      symbol: moralisToken.symbol || 'Unknown',
      name: moralisToken.name || 'Unknown Token',
      balance: balance.toString(),
      usdValue: usdValue,
      price: usdPrice,
      address: moralisToken.token_address,
      chain: chainName,
      chainId: this.getChainId(chainName),
      decimals: decimals,
      logoUrl: moralisToken.thumbnail || moralisToken.logo,
      isNative: moralisToken.native_token || false
    }
  }

  // Get token balances for a wallet address using Moralis API
  async getTokenBalances(
    walletAddress: string, 
    chainName: string
  ): Promise<TokenBalance[]> {
    // Re-check API key on each call (in case env var was updated)
    this.apiKey = process.env.MORALIS_API_KEY || null
    
    if (!this.apiKey) {
      console.error('[Moralis] ❌ API key not configured - returning empty result')
      console.error('[Moralis] Please set MORALIS_API_KEY environment variable in your .env file')
      console.error('[Moralis] Make sure the .env file is in the Splenex directory and restart the dev server')
      throw new Error('Moralis API key not configured. Please set MORALIS_API_KEY in your .env file and restart the server.')
    }

    try {
      const moralisChain = this.getMoralisChainName(chainName)

      // Fetch all tokens with pagination (exclude_spam=false to get all tokens)
      let allTokens: MoralisTokenBalance[] = []
      let cursor: string | undefined = undefined
      let page = 1
      const pageSize = 100
      
      do {
        // STRICT FILTERING: Only fetch verified tokens with balances
        // exclude_spam=true: Exclude spam tokens
        // exclude_unverified_contracts=true: Only include verified contracts
        // This ensures we only get tokens that are actually legitimate and in the wallet
        let url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${moralisChain}&limit=${pageSize}&exclude_spam=true&exclude_unverified_contracts=true`
        if (cursor) {
          url += `&cursor=${cursor}`
        }

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey!,
            'Accept': 'application/json',
          }
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error(`[Moralis] ❌ API request failed: ${response.status} - ${errorText}`)
          
          // Handle specific error cases
          if (response.status === 401) {
            throw new Error('Moralis API key is invalid or expired')
          } else if (response.status === 429) {
            throw new Error('Moralis API rate limit exceeded. Please try again later.')
          } else if (response.status === 400) {
            // Bad request - might be invalid address or chain
            console.error(`[Moralis] Bad request for ${walletAddress} on ${moralisChain}`)
            return [] // Return empty array instead of throwing
          } else {
            throw new Error(`Moralis API failed: ${response.status} - ${errorText}`)
          }
        }

        const data: MoralisResponse = await response.json()
        
        if (data.result && data.result.length > 0) {
          allTokens.push(...data.result)
        }
        
        cursor = data.cursor
        page++
        
        // Break if no more pages
        if (!cursor || data.result?.length === 0) {
          break
        }
        
      } while (cursor)

      if (allTokens.length === 0) {
        return []
      }

      // Only keep verified / recognized tokens with actual balances
      // STRICT FILTERING: Only verified tokens that actually have balance > 0
      const tokensWithBalance = allTokens.filter((token: MoralisTokenBalance) => {
        // Check if token has actual balance first
        // Moralis returns balance as raw string (in wei) - check if it's > 0
        const rawBalance = token.balance || '0'
        const balanceBigInt = BigInt(rawBalance)
        
        // If balance is 0, don't include
        if (balanceBigInt === 0n) {
          return false
        }

        // Native tokens are always included if they have balance
        if (token.native_token) {
          return true
        }

        // For ERC20 tokens, must be:
        // 1. Not spam
        // 2. Verified contract
        // 3. Has balance > 0 (already checked above)
        const notSpam = token.possible_spam !== true
        const verified = token.verified_contract === true
        
        if (!notSpam || !verified) {
          return false // Filter out unverified or spam tokens
        }
        
        return true
      })

      // Convert to our format (with async price fetching)
      const tokenPromises = tokensWithBalance.map((token: MoralisTokenBalance) => 
        this.convertTokenBalance(token, chainName)
      )
      
      const tokens = await Promise.all(tokenPromises)

      // STRICT FILTER: Only return tokens that actually have balance > 0
      // This ensures we only show tokens that are actually in the wallet
      const finalTokens = tokens.filter((token) => {
        const balance = parseFloat(token.balance)
        // Only include tokens with actual balance > 0
        // Use a very small threshold to filter out dust (0.00000001)
        return balance > 0.00000001
      })

      return finalTokens

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Moralis] ❌ Error fetching balances for ${walletAddress}:`, errorMessage)
      throw error
    }
  }
}

// Export singleton instance
export const moralisService = new MoralisService()

