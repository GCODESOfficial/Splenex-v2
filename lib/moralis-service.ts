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
              console.log(`[Moralis] ✅ CoinGecko price by address for ${symbol} (${addressLower}): $${price}`)
              return price
            }
          } else {
            console.warn(`[Moralis] CoinGecko address lookup failed: ${response.status} for ${symbol}`)
          }
        } catch (e) {
          console.warn(`[Moralis] CoinGecko address lookup error for ${symbol}:`, e)
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
              console.log(`[Moralis] ✅ CoinGecko price by symbol for ${symbol}: $${data[coinId].usd}`)
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
                console.log(`[Moralis] ✅ CoinGecko price via search for ${symbol}: $${priceData[matchingCoin.id].usd}`)
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
      console.warn(`[Moralis] Error fetching CoinGecko price for ${symbol}:`, error)
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
    
    // Extract USD values from Moralis response
    let usdPrice = moralisToken.usd_price || 0
    let usdValue = moralisToken.usd_value || 0
    
    // ALWAYS fetch from CoinGecko to ensure accuracy, especially for non-native tokens
    // This ensures all tokens have accurate prices and USD values
    console.log(`[Moralis] 🔍 Fetching price for ${moralisToken.symbol} from CoinGecko for accuracy...`)
    const coingeckoPrice = await this.fetchPriceFromCoinGecko(
      moralisToken.token_address,
      moralisToken.symbol,
      chainName
    )
    
    if (coingeckoPrice > 0) {
      // Use CoinGecko price as primary source (more reliable)
      usdPrice = coingeckoPrice
      usdValue = balance * usdPrice
      console.log(`[Moralis] ✅ Using CoinGecko price for ${moralisToken.symbol}: $${usdPrice.toFixed(6)} → USD Value $${usdValue.toFixed(2)}`)
    } else if (usdPrice > 0 && usdValue > 0) {
      // CoinGecko failed, use Moralis values but verify calculation
      const calculatedValue = balance * usdPrice
      // If Moralis USD value doesn't match calculated value, use calculated
      const valueDifference = Math.abs(calculatedValue - usdValue)
      if (valueDifference > 0.01) { // More than 1 cent difference
        console.log(`[Moralis] ⚠️ Moralis USD value mismatch for ${moralisToken.symbol}: Using calculated value (${usdValue.toFixed(2)} vs ${calculatedValue.toFixed(2)})`)
        usdValue = calculatedValue
      }
      console.log(`[Moralis] ℹ️ Using Moralis price for ${moralisToken.symbol}: $${usdPrice.toFixed(6)} → USD Value $${usdValue.toFixed(2)}`)
    } else {
      // Both failed, try to calculate from price if we have one
      if (usdPrice > 0) {
        usdValue = balance * usdPrice
        console.log(`[Moralis] ⚠️ Calculated USD value for ${moralisToken.symbol} from price: $${usdValue.toFixed(2)}`)
      } else {
        console.warn(`[Moralis] ❌ Could not determine price for ${moralisToken.symbol}, leaving as 0`)
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
    if (!this.apiKey) {
      console.error('[Moralis] ❌ API key not configured - returning empty result')
      console.error('[Moralis] Please set MORALIS_API_KEY environment variable')
      throw new Error('Moralis API key not configured')
    }

    try {
      const moralisChain = this.getMoralisChainName(chainName)
      
      console.log(`[Moralis] 📡 Fetching token balances for ${walletAddress} on ${moralisChain}`)

      // Fetch all tokens with pagination (exclude_spam=false to get all tokens)
      let allTokens: MoralisTokenBalance[] = []
      let cursor: string | undefined = undefined
      let page = 1
      const pageSize = 100
      
      do {
        let url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${moralisChain}&limit=${pageSize}&exclude_spam=false`
        if (cursor) {
          url += `&cursor=${cursor}`
        }
        
        console.log(`[Moralis] 📄 Fetching page ${page}...`)
        console.log(`[Moralis] API URL: ${url}`)
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-API-Key': this.apiKey!,
            'Accept': 'application/json',
          }
        })

        console.log(`[Moralis] Response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error(`[Moralis] ❌ API request failed: ${response.status} - ${errorText}`)
          throw new Error(`Moralis API failed: ${response.status}`)
        }

        const data: MoralisResponse = await response.json()
        
        if (data.result && data.result.length > 0) {
          allTokens.push(...data.result)
          console.log(`[Moralis] ✅ Page ${page}: Fetched ${data.result.length} tokens (Total: ${allTokens.length})`)
        }
        
        cursor = data.cursor
        page++
        
        // Break if no more pages
        if (!cursor || data.result?.length === 0) {
          break
        }
        
      } while (cursor)
      
      console.log(`[Moralis] ✅ Completed pagination: ${allTokens.length} total tokens from ${page - 1} page(s)`)

      if (allTokens.length === 0) {
        console.log(`[Moralis] ℹ️ No tokens found for ${walletAddress} on ${moralisChain}`)
        return []
      }

      // Convert to our format (with async price fetching)
      const tokenPromises = allTokens
        .filter((token: MoralisTokenBalance) => parseFloat(token.balance || '0') > 0)
        .map((token: MoralisTokenBalance) => this.convertTokenBalance(token, chainName))
      
      const tokens = await Promise.all(tokenPromises)

      console.log(`[Moralis] ✅ Returning ${tokens.length} tokens (all tokens with balance > 0)`)
      console.log(`[Moralis] 📋 Token list:`, tokens.map((t: TokenBalance) => `${t.symbol} (${t.balance}) = $${t.usdValue.toFixed(2)} @ $${t.price.toFixed(6)}`))
      
      return tokens

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Moralis] ❌ Error fetching balances for ${walletAddress}:`, errorMessage)
      throw error
    }
  }
}

// Export singleton instance
export const moralisService = new MoralisService()

