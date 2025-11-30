/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Multi-Chain Balance Service
 * Supports 52+ chains including EVM, Solana, TON, Cosmos, and more
 */

import { ChainConfig, ChainType, getAllEnabledChains } from "./chains-config"
import { covalentGoldRushService } from "./covalent-goldrush-service"
import { moralisService } from "./moralis-service"

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
  
  const allChains = getAllEnabledChains()
  const allTokens: TokenBalance[] = []
  let completedChains = 0

  // Process chains in parallel batches for better performance
  const BATCH_SIZE = 3
  const chainBatches = []
  for (let i = 0; i < allChains.length; i += BATCH_SIZE) {
    chainBatches.push(allChains.slice(i, i + BATCH_SIZE))
  }

  for (const batch of chainBatches) {
    // Process each batch in parallel
    const batchPromises = batch.map(async (chain) => {
      try {
        
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
        }

        return { chain: chain.name, tokens }
      } catch (error) {
        console.error(`[MultiChain] Error fetching ${chain.name}:`, error)
        return { chain: chain.name, tokens: [] }
      }
    })

    // Wait for batch to complete
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        allTokens.push(...result.value.tokens)
        completedChains++
        
        if (onProgress) {
          onProgress({
            chain: result.value.chain,
            done: completedChains,
            total: allChains.length,
          })
        }
      }
    })
  }

  // Calculate total USD value
  const totalUsdValue = allTokens.reduce((sum, token) => sum + token.usdValue, 0)

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
    // Try Moralis API first (primary provider - already configured and working)
    const moralisResult = await fetchFromMoralis(chain, walletAddress)
    
    // Check if Moralis returned an error (empty array with error) or no tokens
    if (moralisResult.success === false) {
      const rpcTokens = await fetchFromEVMRPC(chain, walletAddress)
      tokens.push(...rpcTokens)
    } else {
      // Moralis succeeded - use its results
      tokens.push(...moralisResult.tokens)
    }

    return tokens
  } catch (error) {
    console.error(`[MultiChain] Error fetching EVM chain ${chain.name}:`, error)
    return []
  }
}

/**
 * Fetch from Moralis API (primary provider - already configured and working)
 * Returns an object with success flag and tokens array
 */
async function fetchFromMoralis(
  chain: ChainConfig,
  walletAddress: string
): Promise<{ success: boolean; tokens: TokenBalance[]; error?: string }> {
  try {
    
    const tokens = await moralisService.getTokenBalances(walletAddress, chain.name)
    
    return { success: true, tokens }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[MultiChain] ❌ Moralis error for ${chain.name}:`, errorMessage)
    return { success: false, tokens: [], error: errorMessage }
  }
}

/**
 * Fetch from EVM RPC directly with parallel optimization
 */
async function fetchFromEVMRPC(
  chain: ChainConfig,
  walletAddress: string
): Promise<TokenBalance[]> {
  const tokens: TokenBalance[] = []

  try {
    // Try all RPC endpoints in parallel for faster response
    const rpcPromises = chain.rpc.map(async (rpcUrl) => {
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
          return { balance: balanceInEth, rpc: rpcUrl }
        }
        return null
      } catch (error) {
        return null
      }
    })

    // Wait for first successful response
    const results = await Promise.allSettled(rpcPromises)
    const successfulResult = results
      .filter((result): result is PromiseFulfilledResult<{ balance: number; rpc: string } | null> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)[0]

    if (successfulResult && successfulResult.balance > 0) {
      // Fetch price in parallel with balance check
      const pricePromise = fetchTokenPrices([chain.symbol])
      const price = (await pricePromise)[chain.symbol] || 0
      const usdValue = successfulResult.balance * price

      tokens.push({
        symbol: chain.symbol,
        name: chain.name,
        balance: successfulResult.balance.toFixed(6),
        usdValue,
        price,
        address: "native",
        chain: chain.name,
        chainId: chain.chainId as string,
        decimals: 18,
        logo: chain.logo,
      })
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

