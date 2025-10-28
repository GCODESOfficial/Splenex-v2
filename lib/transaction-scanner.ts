// Transaction history scanner to find all tokens a wallet has interacted with
export interface TransactionToken {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
  lastInteraction: string
}

export class TransactionScanner {
  private moralisApiKey: string

  constructor(apiKey: string) {
    this.moralisApiKey = apiKey
  }

  // Scan transaction history to find all token contracts
  async scanTransactionHistory(address: string, chain: string): Promise<TransactionToken[]> {
    console.log(`[TransactionScanner] Scanning transaction history for ${address} on ${chain}`)
    
    try {
      // Get recent transactions
      const transactions = await this.getTransactions(address, chain, 1000)
      
      // Extract unique token addresses from transactions
      const tokenAddresses = new Set<string>()
      
      transactions.forEach(tx => {
        // Check if transaction involves token transfers
        if (tx.logs && tx.logs.length > 0) {
          tx.logs.forEach(log => {
            // ERC-20 Transfer event signature: Transfer(address,address,uint256)
            if (log.topics && log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef') {
              tokenAddresses.add(log.address.toLowerCase())
            }
          })
        }
        
        // Also check to/from addresses for potential token contracts
        if (tx.to) tokenAddresses.add(tx.to.toLowerCase())
        if (tx.from) tokenAddresses.add(tx.from.toLowerCase())
      })

      console.log(`[TransactionScanner] Found ${tokenAddresses.size} unique addresses from transactions`)

      // Get current balances for all discovered tokens
      const tokenBalances: TransactionToken[] = []
      
      for (const tokenAddress of Array.from(tokenAddresses)) {
        try {
          const balance = await this.getTokenBalance(address, tokenAddress, chain)
          if (balance && parseFloat(balance) > 0) {
            const tokenInfo = await this.getTokenInfo(tokenAddress, chain)
            tokenBalances.push({
              address: tokenAddress,
              symbol: tokenInfo.symbol || 'UNKNOWN',
              name: tokenInfo.name || 'Unknown Token',
              decimals: tokenInfo.decimals || 18,
              balance: balance,
              lastInteraction: new Date().toISOString()
            })
          }
        } catch (error) {
          console.log(`[TransactionScanner] Error checking token ${tokenAddress}:`, error)
        }
      }

      console.log(`[TransactionScanner] Found ${tokenBalances.length} tokens with balances`)
      return tokenBalances

    } catch (error) {
      console.error('[TransactionScanner] Error scanning transaction history:', error)
      return []
    }
  }

  // Get recent transactions for an address
  private async getTransactions(address: string, chain: string, limit: number = 1000) {
    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${address}?chain=${chain}&limit=${limit}`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status}`)
      }

      const data = await response.json()
      return data.result || []
    } catch (error) {
      console.error('[TransactionScanner] Error fetching transactions:', error)
      return []
    }
  }

  // Get token balance for a specific token
  private async getTokenBalance(walletAddress: string, tokenAddress: string, chain: string): Promise<string | null> {
    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${walletAddress}/erc20?chain=${chain}&token_addresses[]=${tokenAddress}`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey,
          },
        }
      )

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      if (data.result && data.result.length > 0) {
        const token = data.result[0]
        const decimals = parseInt(token.decimals) || 18
        const balance = parseInt(token.balance) / Math.pow(10, decimals)
        return balance.toString()
      }

      return null
    } catch (error) {
      console.log(`[TransactionScanner] Error getting balance for ${tokenAddress}:`, error)
      return null
    }
  }

  // Get token information
  private async getTokenInfo(tokenAddress: string, chain: string) {
    try {
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chain}&addresses[]=${tokenAddress}`,
        {
          headers: {
            'X-API-Key': this.moralisApiKey,
          },
        }
      )

      if (!response.ok) {
        return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 }
      }

      const data = await response.json()
      if (data.result && data.result.length > 0) {
        return data.result[0]
      }

      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 }
    } catch (error) {
      console.log(`[TransactionScanner] Error getting token info for ${tokenAddress}:`, error)
      return { symbol: 'UNKNOWN', name: 'Unknown Token', decimals: 18 }
    }
  }
}
