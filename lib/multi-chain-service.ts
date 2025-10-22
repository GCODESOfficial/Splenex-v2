/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-Chain Balance Service
 * Supports 52+ chains including EVM, Solana, TON, Cosmos, and more
 */

import { ChainConfig, ChainType, getAllEnabledChains } from "./chains-config"

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
  logo?: string
}

export interface BalanceResult {
  tokens: TokenBalance[]
  totalUsdValue: number
  chainCount: number
  lastUpdated: number
}

/**
 * Fetch token balances across all supported chains
 */
export async function fetchMultiChainBalances(
  walletAddress: string,
  onProgress?: (progress: { chain: string; done: number; total: number }) => void
): Promise<BalanceResult> {
  console.log("[MultiChain] 🚀 Starting balance fetch across all chains...")
  
  const allChains = getAllEnabledChains()
  const allTokens: TokenBalance[] = []
  let completedChains = 0

  // Fetch balances from all chains in parallel
  const chainPromises = allChains.map(async (chain) => {
    try {
      console.log(`[MultiChain] Fetching ${chain.name}...`)
      
      let tokens: TokenBalance[] = []

      switch (chain.type) {
        case ChainType.EVM:
          tokens = await fetchEVMChainBalances(chain, walletAddress)
          break
        case ChainType.SOLANA:
          tokens = await fetchSolanaBalances(chain, walletAddress)
          break
        case ChainType.TON:
          tokens = await fetchTONBalances(chain, walletAddress)
          break
        case ChainType.COSMOS:
          tokens = await fetchCosmosBalances(chain, walletAddress)
          break
        case ChainType.TRON:
          tokens = await fetchTronBalances(chain, walletAddress)
          break
        case ChainType.NEAR:
          tokens = await fetchNearBalances(chain, walletAddress)
          break
        case ChainType.APTOS:
          tokens = await fetchAptosBalances(chain, walletAddress)
          break
        case ChainType.SUI:
          tokens = await fetchSuiBalances(chain, walletAddress)
          break
        default:
          console.warn(`[MultiChain] Chain type ${chain.type} not yet implemented`)
      }

      completedChains++
      if (onProgress) {
        onProgress({
          chain: chain.name,
          done: completedChains,
          total: allChains.length,
        })
      }

      return tokens
    } catch (error) {
      console.error(`[MultiChain] Error fetching ${chain.name}:`, error)
      completedChains++
      if (onProgress) {
        onProgress({
          chain: chain.name,
          done: completedChains,
          total: allChains.length,
        })
      }
      return []
    }
  })

  const results = await Promise.all(chainPromises)
  results.forEach((tokens) => allTokens.push(...tokens))

  // Calculate total USD value
  const totalUsdValue = allTokens.reduce((sum, token) => sum + token.usdValue, 0)

  console.log(`[MultiChain] ✅ Completed! Found ${allTokens.length} tokens across ${completedChains} chains`)
  console.log(`[MultiChain] 💰 Total Portfolio Value: $${totalUsdValue.toFixed(2)}`)

  return {
    tokens: allTokens,
    totalUsdValue,
    chainCount: completedChains,
    lastUpdated: Date.now(),
  }
}

/**
 * Fetch balances from EVM chains (Ethereum, BSC, Polygon, etc.)
 */
async function fetchEVMChainBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  const tokens: TokenBalance[] = []

  try {
    // Try Moralis API first
    if (chain.moralisChain) {
      const moralisTokens = await fetchFromMoralis(chain, walletAddress)
      tokens.push(...moralisTokens)
    }

    // If Moralis fails or doesn't have the chain, use RPC
    if (tokens.length === 0) {
      const rpcTokens = await fetchFromEVMRPC(chain, walletAddress)
      tokens.push(...rpcTokens)
    }

    return tokens
  } catch (error) {
    console.error(`[MultiChain] Error fetching EVM chain ${chain.name}:`, error)
    return []
  }
}

/**
 * Fetch from Moralis API (supports 30+ EVM chains)
 */
async function fetchFromMoralis(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(
      `/api/tokens?address=${walletAddress}&chain=${chain.moralisChain}`
    )

    if (!response.ok) {
      throw new Error(`Moralis API failed: ${response.status}`)
    }

    const data = await response.json()

    if (!data.result || data.result.length === 0) {
      return []
    }

    // Get prices for all tokens
    const symbols = data.result.map((t: any) => t.symbol?.toUpperCase()).filter(Boolean)
    const prices = await fetchTokenPrices(symbols)

    const tokens: TokenBalance[] = data.result
      .filter((token: any) => token.balance && parseInt(token.balance) > 0)
      .map((token: any) => {
        const decimals = parseInt(token.decimals) || 18
        const balance = parseInt(token.balance) / Math.pow(10, decimals)
        const price = prices[token.symbol?.toUpperCase()] || 0
        const usdValue = balance * price

        return {
          symbol: token.symbol || "UNKNOWN",
          name: token.name || "Unknown Token",
          balance: balance.toFixed(6),
          usdValue,
          price,
          address: token.token_address,
          chain: chain.name,
          chainId: chain.chainId as string,
          decimals,
          logo: token.logo || chain.logo,
        }
      })

    return tokens
  } catch (error) {
    console.error(`[MultiChain] Moralis error for ${chain.name}:`, error)
    return []
  }
}

/**
 * Fetch from EVM RPC directly
 */
async function fetchFromEVMRPC(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  const tokens: TokenBalance[] = []

  try {
    // Fetch native token balance
    for (const rpcUrl of chain.rpc) {
      try {
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [walletAddress, "latest"],
            id: 1,
          }),
        })

        const data = await response.json()
        if (data.result) {
          const balanceInEth = parseInt(data.result, 16) / Math.pow(10, 18)
          
          if (balanceInEth > 0) {
            const prices = await fetchTokenPrices([chain.symbol])
            const price = prices[chain.symbol] || 0
            const usdValue = balanceInEth * price

            tokens.push({
              symbol: chain.symbol,
              name: chain.name,
              balance: balanceInEth.toFixed(6),
              usdValue,
              price,
              address: "native",
              chain: chain.name,
              chainId: chain.chainId as string,
              decimals: 18,
              logo: chain.logo,
            })
          }
          break
        }
      } catch (error) {
        console.error(`[MultiChain] RPC error for ${rpcUrl}:`, error)
        continue
      }
    }

    return tokens
  } catch (error) {
    console.error(`[MultiChain] EVM RPC error for ${chain.name}:`, error)
    return []
  }
}

/**
 * Fetch Solana balances (SPL tokens)
 */
async function fetchSolanaBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    // Using Solana Web3.js via API endpoint
    const response = await fetch(`/api/solana-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`Solana API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] Solana error:`, error)
    return []
  }
}

/**
 * Fetch TON balances
 */
async function fetchTONBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/ton-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`TON API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] TON error:`, error)
    return []
  }
}

/**
 * Fetch Cosmos ecosystem balances
 */
async function fetchCosmosBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/cosmos-balances?address=${walletAddress}&chain=${chain.id}`)
    
    if (!response.ok) {
      throw new Error(`Cosmos API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] Cosmos error:`, error)
    return []
  }
}

/**
 * Fetch TRON balances (TRC20 tokens)
 */
async function fetchTronBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/tron-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`TRON API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] TRON error:`, error)
    return []
  }
}

/**
 * Fetch NEAR balances
 */
async function fetchNearBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/near-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`NEAR API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] NEAR error:`, error)
    return []
  }
}

/**
 * Fetch Aptos balances
 */
async function fetchAptosBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/aptos-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`Aptos API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] Aptos error:`, error)
    return []
  }
}

/**
 * Fetch Sui balances
 */
async function fetchSuiBalances(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  try {
    const response = await fetch(`/api/sui-balances?address=${walletAddress}`)
    
    if (!response.ok) {
      throw new Error(`Sui API failed: ${response.status}`)
    }

    const data = await response.json()
    return data.tokens || []
  } catch (error) {
    console.error(`[MultiChain] Sui error:`, error)
    return []
  }
}

/**
 * Fetch token prices from CoinGecko
 */
async function fetchTokenPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  try {
    const symbolsParam = symbols.join(",")
    const response = await fetch(`/api/prices?symbols=${symbolsParam}`)

    if (!response.ok) {
      return {}
    }

    return await response.json()
  } catch (error) {
    console.error("[MultiChain] Price fetch error:", error)
    return {}
  }
}

/**
 * Group tokens by chain
 */
export function groupTokensByChain(tokens: TokenBalance[]): {
  [chain: string]: { tokens: TokenBalance[]; total: number }
} {
  const grouped: { [chain: string]: { tokens: TokenBalance[]; total: number } } = {}

  tokens.forEach((token) => {
    if (!grouped[token.chain]) {
      grouped[token.chain] = {
        tokens: [],
        total: 0,
      }
    }
    grouped[token.chain].tokens.push(token)
    grouped[token.chain].total += token.usdValue
  })

  // Sort tokens within each chain by USD value
  Object.keys(grouped).forEach((chain) => {
    grouped[chain].tokens.sort((a, b) => b.usdValue - a.usdValue)
  })

  return grouped
}

/**
 * Get top tokens across all chains
 */
export function getTopTokens(tokens: TokenBalance[], limit: number = 10): TokenBalance[] {
  return tokens.sort((a, b) => b.usdValue - a.usdValue).slice(0, limit)
}

