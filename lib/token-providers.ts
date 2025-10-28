// Comprehensive token balance provider using Covalent GoldRush API

import { covalentGoldRushService } from './covalent-goldrush-service'

export interface TokenProvider {
  name: string
  fetchTokens: (address: string, chain: string) => Promise<any[]>
}

export interface TokenBalance {
  address: string
  symbol: string
  name: string
  balance: string
  decimals: number
  price?: number
  usdValue?: number
}

// Covalent GoldRush Provider
export const covalentProvider: TokenProvider = {
  name: 'Covalent',
  async fetchTokens(address: string, chain: string) {
    try {
      console.log(`[CovalentProvider] Fetching comprehensive token balances for ${address} on ${chain}`)
      
      const tokens = await covalentGoldRushService.getTokenBalances(address, chain, 'USD', true)
      
      console.log(`[CovalentProvider] Found ${tokens.length} tokens`)
      console.log(`[CovalentProvider] Tokens:`, tokens.map(t => `${t.symbol}: ${t.balance}`))

      return tokens
    } catch (error) {
      console.log('[CovalentProvider] Error:', error)
      return []
    }
  }
}

// Only Covalent provider for comprehensive balance fetching
export const tokenProviders: TokenProvider[] = [
  covalentProvider     // Comprehensive Covalent-only balance fetching
]