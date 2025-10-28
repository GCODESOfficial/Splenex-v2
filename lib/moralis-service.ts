import { ChainConfig } from "./chains-config"

export interface MoralisTokenBalance {
  token_address: string
  symbol: string
  name: string
  decimals: string | number
  balance: string
  thumbnail?: string
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

  // Convert Moralis token balance to our format
  private convertTokenBalance(moralisToken: MoralisTokenBalance, chainName: string): TokenBalance {
    const decimals = Number(moralisToken.decimals) || 18
    const rawBalance = BigInt(moralisToken.balance || '0')
    const divisor = BigInt(10 ** Math.min(decimals, 18))
    const quotient = rawBalance / divisor
    const remainder = rawBalance % divisor
    const balance = Number(quotient) + Number(remainder) / Number(divisor)
    
    return {
      symbol: moralisToken.symbol || 'Unknown',
      name: moralisToken.name || 'Unknown Token',
      balance: balance.toString(),
      usdValue: 0, // Moralis doesn't provide USD value in free tier
      price: 0,
      address: moralisToken.token_address,
      chain: chainName,
      chainId: this.getChainId(chainName),
      decimals: decimals,
      logoUrl: moralisToken.thumbnail,
      isNative: false
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

      const url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${moralisChain}`
      
      console.log(`[Moralis] API URL: https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${moralisChain}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
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

      if (!data.result || data.result.length === 0) {
        console.log(`[Moralis] ℹ️ No tokens found for ${walletAddress} on ${moralisChain}`)
        return []
      }

      console.log(`[Moralis] ✅ Found ${data.result.length} raw tokens from API`)

      // Convert to our format
      const tokens = data.result
        .map((token: MoralisTokenBalance) => this.convertTokenBalance(token, chainName))
        .filter((token: TokenBalance) => parseFloat(token.balance) > 0) // Only include tokens with balance > 0

      console.log(`[Moralis] ✅ Returning ${tokens.length} tokens (all tokens with balance > 0)`)
      console.log(`[Moralis] 📋 Token list:`, tokens.map((t: TokenBalance) => `${t.symbol} (${t.balance})`))
      
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

