/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import type React from "react"
import { useState, useEffect, createContext, useContext } from "react"
import { ComprehensiveTokenDetector } from "../lib/comprehensive-token-detector"

type ChainKey = "0x1" | "0x2105" | "0xa4b1" | "0x38" | "0x89" | "0xa" | "0xa86a" | "0xfa"

interface TokenBalance {
  symbol: string
  name: string
  balance: string
  usdValue: number
  price: number
  address: string
  chain?: string
  chainId?: string
  logoUrl?: string
}

interface WalletContextType {
  address: string | null
  isConnected: boolean
  chainId: string | null
  balance: string | null
  totalUsdBalance: number
  tokenBalances: TokenBalance[]
  isConnecting: boolean
  connectingWallet: string | null
  connectedWallet: string | null
  connect: (walletType?: string, providerOverride?: any) => Promise<void>
  disconnect: () => void
  switchNetwork: (chainId: string) => Promise<void>
  detectWallets: () => Array<{ id: string; name: string; provider: any }>
  refreshBalances: () => Promise<void>
  isLoadingBalances: boolean
}

const WalletContext = createContext<WalletContextType | null>(null)

const SUPPORTED_CHAINS: Record<
  ChainKey,
  { name: string; rpc: string[]; moralisChain: string; explorer: string }
> = {
  "0x1": {
    name: "Ethereum",
    rpc: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth", "https://ethereum.publicnode.com"],
    moralisChain: "eth",
    explorer: "https://etherscan.io",
  },
  "0x2105": {
    name: "Base",
    rpc: ["https://mainnet.base.org", "https://base.llamarpc.com", "https://base.publicnode.com"],
    moralisChain: "base",
    explorer: "https://basescan.org",
  },
  "0xa4b1": {
    name: "Arbitrum",
    rpc: ["https://arb1.arbitrum.io/rpc", "https://arbitrum.llamarpc.com", "https://arbitrum.publicnode.com"],
    moralisChain: "arbitrum",
    explorer: "https://arbiscan.io",
  },
  "0x38": {
    name: "BSC",
    rpc: ["https://bsc-dataseed.binance.org", "https://bsc.publicnode.com", "https://bsc.llamarpc.com", "https://rpc.ankr.com/bsc"],
    moralisChain: "bsc",
    explorer: "https://bscscan.com",
  },
  "0x89": {
    name: "Polygon",
    rpc: ["https://polygon-rpc.com", "https://polygon.llamarpc.com", "https://polygon.publicnode.com"],
    moralisChain: "polygon",
    explorer: "https://polygonscan.com",
  },
  "0xa": {
    name: "Optimism",
    rpc: ["https://mainnet.optimism.io", "https://optimism.llamarpc.com", "https://optimism.publicnode.com"],
    moralisChain: "optimism",
    explorer: "https://optimistic.etherscan.io",
  },
  "0xa86a": {
    name: "Avalanche",
    rpc: ["https://api.avax.network/ext/bc/C/rpc", "https://avalanche.publicnode.com", "https://avax.meowrpc.com"],
    moralisChain: "avalanche",
    explorer: "https://snowtrace.io",
  },
  "0xfa": {
    name: "Fantom",
    rpc: ["https://rpc.ftm.tools", "https://fantom.publicnode.com", "https://rpc.ankr.com/fantom"],
    moralisChain: "fantom",
    explorer: "https://ftmscan.com",
  },
}

// safe accessor for runtime chainId strings
function getChainConfig(id?: string) {
  if (!id) return undefined
  return SUPPORTED_CHAINS[id as ChainKey]
}

const POPULAR_TOKENS: {
  [chainId in ChainKey]: Array<{ address: string; symbol: string; name: string; decimals: number }>
} = {
  "0x1": [
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  "0x2105": [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDbC", name: "USD Base Coin", decimals: 6 },
    { address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", decimals: 18 },
    { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome Finance", decimals: 18 },
  ],
  "0xa4b1": [
    { address: "0xFd086bC7CD5C481DCC95BD0d56f35241523fBab9", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  "0x38": [
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18 },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18 },
    { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Token", decimals: 18 },
    { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Bitcoin BEP2", decimals: 18 },
    { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum Token", decimals: 18 },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18 },
    { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap Token", decimals: 18 },
    { address: "0x8f0528ce5ef7b51152a59745befdd91d97091d2f", symbol: "ALPACA", name: "AlpacaToken", decimals: 18 },
    { address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", symbol: "XRP", name: "XRP Token", decimals: 18 },
    { address: "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", symbol: "LTC", name: "Litecoin Token", decimals: 18 },
    { address: "0x1ce0c2827e2ef14d5c4f29a091d735a204794041", symbol: "AVAX", name: "Avalanche Token", decimals: 18 },
  ],
  "0x89": [
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  "0xa": [
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
  "0xa86a": [
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    { address: "0x50b7545627a5162F82A992c33b87aDc75187B218", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
  ],
  "0xfa": [
    { address: "0x049d68029688eAbF473097a2fC38ef61633A3C7A", symbol: "USDT", name: "Tether USD", decimals: 6 },
    { address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", symbol: "USDC", name: "USD Coin", decimals: 6 },
    { address: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
    { address: "0x74b23882a30290451A17c44f4F05243b6b58C76d", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
  ],
}

// No caching - wallet connections are temporary and require fresh authentication
const INACTIVITY_TIMEOUT = 30 * 60 * 1000 // 30 minutes of inactivity

// Helper function to detect current wallet from provider
const detectCurrentWallet = (): string | null => {
  if (typeof window === "undefined" || !window.ethereum) {
    return null
  }
  
  const ethereum = window.ethereum
  
  // Check if there are multiple providers
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    // When multiple providers exist, check which one is currently active
    // Priority: Rabby > Others > MetaMask (since Rabby usually overrides)
    const rabby = ethereum.providers.find((p: any) => p.isRabby)
    if (rabby) return "rabby"
    
    const brave = ethereum.providers.find((p: any) => p.isBraveWallet)
    if (brave) return "brave"
    
    const coinbase = ethereum.providers.find((p: any) => p.isCoinbaseWallet)
    if (coinbase) return "coinbase"
    
    const okx = ethereum.providers.find((p: any) => p.isOkxWallet)
    if (okx) return "okx"
    
    const trust = ethereum.providers.find((p: any) => p.isTrust)
    if (trust) return "trust"
    
    const zerion = ethereum.providers.find((p: any) => p.isZerion)
    if (zerion) return "zerion"
    
    const tokenpocket = ethereum.providers.find((p: any) => p.isTokenPocket)
    if (tokenpocket) return "tokenpocket"
    
    const bitkeep = ethereum.providers.find((p: any) => p.isBitKeep)
    if (bitkeep) return "bitkeep"
    
    const mathwallet = ethereum.providers.find((p: any) => p.isMathWallet)
    if (mathwallet) return "mathwallet"
    
    const tokenary = ethereum.providers.find((p: any) => p.isTokenary)
    if (tokenary) return "tokenary"
    
    const frame = ethereum.providers.find((p: any) => p.isFrame)
    if (frame) return "frame"
    
    const frontier = ethereum.providers.find((p: any) => p.isFrontier)
    if (frontier) return "frontier"
    
    const metamask = ethereum.providers.find((p: any) => p.isMetaMask && !p.isRabby)
    if (metamask) return "metamask"
  }
  
  // IMPORTANT: Check Rabby FIRST (Rabby sets isMetaMask=true for compatibility)
  if (ethereum.isRabby) return "rabby"
  if (ethereum.isBraveWallet && !ethereum.isMetaMask) return "brave"
  if (ethereum.isCoinbaseWallet || ethereum.isCoinbaseBrowser) return "coinbase"
  if (ethereum.isOkxWallet) return "okx"
  if (ethereum.isTrust) return "trust"
  if (ethereum.isZerion) return "zerion"
  if (ethereum.isTokenPocket) return "tokenpocket"
  if (ethereum.isBitKeep) return "bitkeep"
  if (ethereum.isMathWallet) return "mathwallet"
  if (ethereum.isTokenary) return "tokenary"
  if (ethereum.isFrame) return "frame"
  if (ethereum.isFrontier) return "frontier"
  // Only return MetaMask if it's NOT Rabby (Rabby masquerades as MetaMask)
  if (ethereum.isMetaMask && !ethereum.isRabby) return "metamask"
  if (window.solana?.isPhantom) return "phantom"
  if (window.solana?.isSolflare) return "solflare"
  if (window.solflare?.isSlope) return "slope"
  
  return "injected"
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [chainId, setChainId] = useState<string | null>(null)
  const [balance, setBalance] = useState<string | null>(null)
  const [totalUsdBalance, setTotalUsdBalance] = useState<number>(0)
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null)
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  
  // Inactivity tracking
  const [lastActivity, setLastActivity] = useState<number>(Date.now())
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(null)

  // Update activity timestamp
  const updateActivity = () => {
    setLastActivity(Date.now())
  }

  // Start inactivity timer
  const startInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
    }
    
    const timer = setTimeout(() => {
      disconnect()
    }, INACTIVITY_TIMEOUT)
    
    setInactivityTimer(timer)
  }

  // Clear inactivity timer
  const clearInactivityTimer = () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      setInactivityTimer(null)
    }
  }

  // Deduplicate tokens based on symbol + chain + address
  const deduplicateTokens = (tokens: TokenBalance[]): TokenBalance[] => {
    const seen = new Map<string, TokenBalance>()
    
    for (const token of tokens) {
      // Create unique key: symbol-chain-address
      const key = `${token.symbol}-${token.chain}-${token.address.toLowerCase()}`
      
      if (!seen.has(key)) {
        seen.set(key, token)
      } else {
        // If duplicate found, keep the one with higher usdValue
        const existing = seen.get(key)!
        const existingValue = existing.usdValue || 0
        const newValue = token.usdValue || 0
        
        if (newValue > existingValue) {
          seen.set(key, token)
        }
      }
    }
    
    return Array.from(seen.values())
  }

  const fetchTokenPrices = async (symbols: string[]): Promise<{ [symbol: string]: number }> => {
    try {
      const symbolsParam = symbols.join(",")

      const response = await fetch(`/api/prices?symbols=${symbolsParam}`)

      if (!response.ok) {
        return {}
      }

      const prices = await response.json()
      return prices
    } catch (error) {
      console.error("[v0] Error fetching token prices:", error)
      return {}
    }
  }

  const getTokenBalance = async (tokenAddress: string, walletAddress: string, decimals: number) => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        // ERC20 balanceOf function signature
        const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`

        const result = await window.ethereum.request({
          method: "eth_call",
          params: [
            {
              to: tokenAddress,
              data: data,
            },
            "latest",
          ],
        })

        if (result && result !== "0x") {
          const balance = Number.parseInt(result, 16) / Math.pow(10, decimals)
          return balance
        }
      }
    } catch (error) {
      console.error(`[v0] Error getting token balance for ${tokenAddress}:`, error)
    }
    return 0
  }

  // Universal function to fetch popular tokens across all chains (NO API REQUIRED)
  const fetchPopularTokensForChain = async (walletAddress: string, chainConfig: any, allTokenBalances: TokenBalance[]) => {
    try {
      
      // Use the main POPULAR_TOKENS configuration instead of duplicating
      const popularTokensByChain = POPULAR_TOKENS

      const chainTokens = popularTokensByChain[chainConfig.chainId as ChainKey] || []
      if (chainConfig.name === "BSC") {
        const cakeToken = chainTokens.find((t: any) => t.symbol === "CAKE")
        if (cakeToken) {
        }
      }
      
      // Process tokens in parallel for faster detection using enhanced cross-chain function
      const tokenPromises = chainTokens.map(async (token: any) => {
        try {
          const balance = await getErc20BalanceCrossChain(token.address, walletAddress, chainConfig.rpc, token.decimals)
          
          if (balance > 0.000000000001) { // Much lower threshold to detect very small amounts
            
            // Fetch price (this might fail but we still show the token)
            let price = 0
            let usdValue = 0
            try {
              const prices = await fetchTokenPrices([token.symbol])
              price = prices[token.symbol] || 0
              usdValue = balance * price
            } catch (priceError) {
            }
            
            return {
              symbol: token.symbol,
              name: `${token.name} (${chainConfig.name})`,
              balance: balance.toFixed(12), // Show more decimal places for small amounts
              usdValue,
              price,
              address: token.address,
              chain: chainConfig.name,
            }
          } else {
          }
          return null
        } catch (tokenError) {
          return null
        }
      })
      
      const results = await Promise.all(tokenPromises)
      const validTokens = results.filter((token: any) => token !== null) as TokenBalance[]
      
      if (validTokens.length > 0) {
        allTokenBalances.push(...validTokens)
      }
      
    } catch (error) {
      console.error("[v0] Error in fetchPopularTokensForChain:", error)
    }
  }

  // === Accurate fetchAllTokenBalances (kept intact) ===
  const fetchAllTokenBalances = async (walletAddress: string, currentChainId: string) => {
    try {
      
      if (!walletAddress) {
        return
      }
      
      setIsLoadingBalances(true)
      const allTokenBalances: TokenBalance[] = []

      // PRIMARY METHOD: Use Moralis service directly for all chains
      // This matches the pattern from CDSLabsxyz/LIFI-TEST repository
      // Moralis provides accurate, verified token balances across all supported chains

      // iterate using typed keys so TS knows the union type
      const chainKeys = Object.keys(SUPPORTED_CHAINS) as ChainKey[]

      const chainPromises = chainKeys.map(async (cId) => {
        const chainConfig = SUPPORTED_CHAINS[cId]
        try {
          // Use API route to fetch token balances (server-side Moralis)
          try {
            const response = await fetch(
              `/api/tokens?address=${walletAddress}&chain=${chainConfig.moralisChain}`
            )

            if (response.ok) {
              const data = await response.json()

              if (data.success && data.result && data.result.length > 0) {
                // Convert API response to our TokenBalance format
                // API already filters for verified tokens with balance > 0
                data.result.forEach((token: any) => {
                  const balance = parseFloat(token.balance || "0")
                  
                  // STRICT FILTER: Only add tokens that actually have balance > 0
                  // This ensures we only show tokens that are actually in the wallet
                  if (balance > 0.00000001) {
                    const tokenBalance: TokenBalance = {
                      symbol: token.symbol || "UNKNOWN",
                      name: token.name || "Unknown Token",
                      balance: token.balance || "0",
                      usdValue: token.usdValue || 0,
                      price: token.price || 0,
                      address: token.token_address || token.contract_address || "native",
                      chain: chainConfig.name,
                      chainId: token.chainId || cId, // Use chainId from API response if available, otherwise use cId
                      // Include logoUrl from API response (API returns 'logo' field)
                      logoUrl: token.logo || token.logoUrl,
                    }
                    
                    allTokenBalances.push(tokenBalance)
                  }
                })
              }
            } else {
              // API returned error, but continue with other chains
              const errorData = await response.json().catch(() => ({}))
              if (errorData.error && !errorData.error.includes("API key not configured")) {
                // Only log non-config errors
              }
            }
          } catch (apiError: any) {
            // API call failed, but continue with other chains
            const errorMsg = apiError?.message || String(apiError)
            if (!errorMsg.includes("Failed to fetch") && !errorMsg.includes("API key")) {
              // Only log unexpected errors
            }
          }
        } catch (chainError) {
          console.error(`[v0] Error fetching balances for ${chainConfig.name}:`, chainError)
        }
      })

      await Promise.all(chainPromises)

      // If Moralis didn't return any tokens, try comprehensive detector as fallback
      if (allTokenBalances.length === 0) {
        try {
          const detector = new ComprehensiveTokenDetector()
          const currentChainConfig = SUPPORTED_CHAINS[currentChainId as ChainKey]
          
          // Use multi-chain detection (passes current chain but detects across all chains)
          const result = await detector.detectAllTokens(walletAddress, currentChainConfig.moralisChain)

          // Convert to our format - preserve chain information
          const convertedTokens = result.tokens.map(token => ({
            symbol: token.symbol,
            name: token.name,
            balance: token.balance,
            usdValue: token.usdValue || 0,
            price: token.price || 0,
            address: token.address,
            chain: (token as any).chain || 'Unknown', // Use the chain from multi-chain detection
          }))
          
          allTokenBalances.push(...convertedTokens)
        } catch (error) {
          // Comprehensive detector also failed, continue with empty array
        }
      }

      // Deduplicate tokens before setting state
      const deduplicatedTokens = deduplicateTokens(allTokenBalances)
      
      const total = deduplicatedTokens.reduce((sum: number, token: TokenBalance) => sum + token.usdValue, 0)

      // Show tokens grouped by chain
      const tokensByChain = deduplicatedTokens.reduce((acc: Record<string, TokenBalance[]>, token: TokenBalance) => {
        const chain = token.chain || "Unknown"
        if (!acc[chain]) acc[chain] = []
        acc[chain].push(token)
        return acc
      }, {} as Record<string, TokenBalance[]>)

      // Show L2 tokens specifically
      const l2Tokens = deduplicatedTokens.filter((token: TokenBalance) => token.chain !== "Ethereum")

      setTokenBalances(deduplicatedTokens)
      setTotalUsdBalance(total)
    } catch (error) {
      console.error("[v0] ❌ Error in fetchAllTokenBalances:", error)
      if (address) {
        const ethBalance = await getBalance(address)
        const ethPrices = await fetchTokenPrices(["ETH"])
        const ethPrice = ethPrices["ETH"] || 0
        const ethUsdValue = Number.parseFloat(ethBalance) * ethPrice

        const fallbackTokens: TokenBalance[] = [
          {
            symbol: "ETH",
            name: "Ethereum",
            balance: ethBalance,
            usdValue: ethUsdValue,
            price: ethPrice,
            address: "native",
            chain: getChainConfig(chainId || "0x1")?.name ?? "Ethereum",
          },
        ]

        setTokenBalances(fallbackTokens)
        setTotalUsdBalance(ethUsdValue)
      } else {
        setTokenBalances([])
        setTotalUsdBalance(0)
      }
    } finally {
      setIsLoadingBalances(false)
    }
  }

  const getBalanceForChain = async (address: string, chainId: string, rpcUrls: string[]) => {
    for (const rpcUrl of rpcUrls) {
      try {

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout (reduced from 10s)

        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getBalance",
            params: [address, "latest"],
            id: 1,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          continue
        }

        const data = await response.json()
        if (data.result) {
          const balanceInEth = Number.parseInt(data.result, 16) / Math.pow(10, 18)
          return balanceInEth.toFixed(4)
        } else if (data.error) {
          continue
        }
      } catch (error) {
        if (error instanceof Error) {
        } else {
        }
        continue
      }
    }

    return "0.0000"
  }

  const getTokenBalanceForChain = async (
    tokenAddress: string,
    walletAddress: string,
    decimals: number,
    rpcUrls: string[],
  ) => {
    
    for (const rpcUrl of rpcUrls) {
      try {
        const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout (reduced from 10s)

        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: tokenAddress,
                data: data,
              },
              "latest",
            ],
            id: 1,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          continue
        }

        const result = await response.json()
        
        if (result.result && result.result !== "0x") {
          const balance = Number.parseInt(result.result, 16) / Math.pow(10, decimals)
          return balance
        } else if (result.error) {
          continue
        } else {
        }
      } catch (error) {
        if (error instanceof Error) {
        } else {
        }
        continue
      }
    }

    return 0
  }

  // Enhanced cross-chain ERC-20 balance function (GPT suggestion)
  const getErc20BalanceCrossChain = async (tokenAddress: string, walletAddress: string, rpcUrls: string[], decimals: number): Promise<number> => {
    
    for (const rpc of rpcUrls) {
      try {
        
        const response = await fetch(rpc, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_call",
            params: [
              {
                to: tokenAddress,
                data: `0x70a08231000000000000000000000000${walletAddress.substring(2)}`,
              },
              "latest",
            ],
            id: 1,
          }),
        })

        if (!response.ok) {
          continue
        }

        const data = await response.json()
        
        if (data.error) {
          continue
        }

        if (data.result && data.result !== "0x" && data.result !== "0x0") {
          const balanceRaw = BigInt(data.result)
          const balance = Number(balanceRaw) / Math.pow(10, decimals)
          return balance
        }
      } catch (err) {
        continue
      }
    }
    
    return 0
  }

  // add refreshBalances utility used by the UI
  const refreshBalances = async () => {
    if (!address) return
    await fetchAllTokenBalances(address, chainId || "")
  }

  const connect = async (walletType?: string, providerOverride?: any) => {
    try {
      setIsConnecting(true)
      setConnectingWallet(walletType || "default")

      if (typeof window !== "undefined") {

        let ethereum = providerOverride || window.ethereum

        // If no provider override, find the specific provider
        if (!providerOverride) {
          // Handle multiple wallet providers (e.g., Rabby + MetaMask installed together)
          if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
            
            // Find the specific provider based on walletType
            if (walletType === "metamask") {
              const metamaskProvider = window.ethereum.providers.find((p: any) => {
                // MetaMask: has isMetaMask but NOT isRabby (Rabby also sets isMetaMask=true)
                return p.isMetaMask === true && p.isRabby !== true
              })
              ethereum = metamaskProvider || window.ethereum
            } else if (walletType === "rabby") {
              const rabbyProvider = window.ethereum.providers.find((p: any) => p.isRabby === true)
              ethereum = rabbyProvider || window.ethereum
            } else if (walletType === "coinbase") {
              ethereum = window.ethereum.providers.find((p: any) => p.isCoinbaseWallet) || window.ethereum
            } else if (walletType === "brave") {
              ethereum = window.ethereum.providers.find((p: any) => p.isBraveWallet) || window.ethereum
            } else if (walletType === "trust") {
              ethereum = window.ethereum.providers.find((p: any) => p.isTrust) || window.ethereum
            } else if (walletType === "okx") {
              ethereum = window.ethereum.providers.find((p: any) => p.isOkxWallet) || window.ethereum
            }
          } else {
            // Single provider - use the existing logic
            if (walletType === "metamask" && window.ethereum?.isMetaMask) {
              ethereum = window.ethereum
            } else if (walletType === "coinbase" && window.ethereum?.isCoinbaseWallet) {
              ethereum = window.ethereum
            } else if (walletType === "brave" && window.ethereum?.isBraveWallet) {
              ethereum = window.ethereum
            } else if (walletType === "trust" && window.ethereum?.isTrust) {
              ethereum = window.ethereum
            } else if (walletType === "rabby" && window.ethereum?.isRabby) {
              ethereum = window.ethereum
            } else if (walletType === "okx" && window.ethereum?.isOkxWallet) {
              ethereum = window.ethereum
            }
          }
        }

        if (!ethereum) {
          throw new Error("No wallet detected. Please install a Web3 wallet.")
        }

        // Force fresh authentication by checking and clearing existing permissions
        try {
          // Check if wallet already has permissions
          const permissions = await ethereum.request({
            method: "wallet_getPermissions",
          })
          
          if (permissions && permissions.length > 0) {
            // Try to revoke existing permissions to force fresh auth
            try {
              await ethereum.request({
                method: "wallet_revokePermissions",
                params: [{ eth_accounts: {} }]
              })
            } catch (revokeError) {
            }
          }
        } catch (e) {
        }

        // Request accounts from the wallet - this should always prompt for user consent
        const accounts = await ethereum.request({
          method: "eth_requestAccounts",
        })

        if (accounts.length > 0) {
          const account = accounts[0]
          setAddress(account)
          setIsConnected(true)

          const cId = await ethereum.request({
            method: "eth_chainId",
          })
          setChainId(cId)

          const bal = await getBalance(account)
          setBalance(bal)

          // ALWAYS detect wallet from the actual connected provider (never trust walletType parameter)
          // This ensures we show the correct wallet even if Rabby intercepts MetaMask requests
          let detectedWallet: string
          
          // Check in order of specificity (most specific first)
          if (ethereum.isRabby === true) {
            detectedWallet = "rabby"
          } else if (ethereum.isBraveWallet === true && ethereum.isMetaMask !== true) {
            detectedWallet = "brave"
          } else if (ethereum.isCoinbaseWallet === true || ethereum.isCoinbaseBrowser === true) {
            detectedWallet = "coinbase"
          } else if (ethereum.isOkxWallet === true) {
            detectedWallet = "okx"
          } else if (ethereum.isTrust === true) {
            detectedWallet = "trust"
          } else if (ethereum.isZerion === true) {
            detectedWallet = "zerion"
          } else if (ethereum.isMetaMask === true && ethereum.isRabby !== true) {
            // Only MetaMask if has isMetaMask but NOT isRabby
            detectedWallet = "metamask"
          } else {
            detectedWallet = "injected"
          }
          
          setConnectedWallet(detectedWallet)

          await fetchAllTokenBalances(account, cId)

          // Start inactivity timer for automatic disconnection
          startInactivityTimer()
          updateActivity()

        }
      }
    } catch (error) {
      console.error("[v0] Connection error:", error)
      throw error
    } finally {
      setIsConnecting(false)
      setConnectingWallet(null)
    }
  }

  const disconnect = () => {
    // Clear all wallet state
    setAddress(null)
    setChainId(null)
    setBalance(null)
    setTotalUsdBalance(0)
    setTokenBalances([])
    setIsConnected(false)
    setIsConnecting(false)
    setConnectingWallet(null)
    setConnectedWallet(null)
    
    // Clear inactivity timer
    clearInactivityTimer()
    
    // Try to revoke wallet permissions to prevent auto-reconnection
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }]
        }).catch(() => {
          // Ignore errors - some wallets don't support this method
        })
      } catch (e) {
        // Ignore errors
      }
    }
    
    // Clear any cached data from localStorage
    try {
      // Remove any wallet-related data
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.includes('wallet') || key.includes('session') || key.includes('balance'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (e) {
    }
    
  }

  const switchNetwork = async (targetChainId: string) => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        })
      }
    } catch (error) {
      console.error("[v0] Network switch error:", error)
    }
  }

  const getBalance = async (address: string) => {
    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const balance = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        })
        const balanceInEth = Number.parseInt(balance, 16) / Math.pow(10, 18)
        return balanceInEth.toFixed(4)
      }
    } catch (error) {
      console.error("[v0] Error getting balance:", error)
    }
    return "0.0000"
  }

  useEffect(() => {
    // No session restoration - wallet connections are temporary

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect()
        } else {
          setAddress(accounts[0])
          getBalance(accounts[0]).then(setBalance)
          const detectedWallet = detectCurrentWallet()
          setConnectedWallet(detectedWallet)
          if (chainId) {
            fetchAllTokenBalances(accounts[0], chainId)
          }
          // Update activity and restart timer
          updateActivity()
          startInactivityTimer()
        }
      }

      const handleChainChanged = (newChainId: string) => {
        setChainId(newChainId)
        if (address) {
          getBalance(address).then(setBalance)
          fetchAllTokenBalances(address, newChainId)
        }
        // Update activity and restart timer
        updateActivity()
        startInactivityTimer()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [address, chainId, isConnected])

  // Activity tracking effect
  useEffect(() => {
    if (!isConnected) {
      clearInactivityTimer()
      return
    }

    // Set up activity listeners
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    const handleActivity = () => {
      updateActivity()
      startInactivityTimer()
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true)
    })

    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true)
      })
    }
  }, [isConnected])

  const detectWallets = () => {
    const detectedWallets: Array<{ id: string; name: string; provider: any }> = []

    if (typeof window !== "undefined" && window.ethereum) {
      if (window.ethereum.isMetaMask) {
        detectedWallets.push({ id: "metamask", name: "MetaMask", provider: window.ethereum })
      }

      if (window.ethereum.isCoinbaseWallet) {
        detectedWallets.push({ id: "coinbase", name: "Coinbase Wallet", provider: window.ethereum })
      }

      if (window.ethereum.isBraveWallet) {
        detectedWallets.push({ id: "brave", name: "Brave Wallet", provider: window.ethereum })
      }

      if (window.ethereum.isTrust) {
        detectedWallets.push({ id: "trust", name: "Trust Wallet", provider: window.ethereum })
      }

      if (window.ethereum.isRabby) {
        detectedWallets.push({ id: "rabby", name: "Rabby Wallet", provider: window.ethereum })
      }

      if (window.ethereum.isOkxWallet) {
        detectedWallets.push({ id: "okx", name: "OKX Wallet", provider: window.ethereum })
      }

      if (window.solana && window.solana.isPhantom) {
        detectedWallets.push({ id: "phantom", name: "Phantom", provider: window.solana })
      }

      if (detectedWallets.length === 0 && window.ethereum) {
        detectedWallets.push({ id: "injected", name: "Injected Wallet", provider: window.ethereum })
      }
    }

    return detectedWallets
  }

  const value: WalletContextType = {
    address,
    isConnected,
    chainId,
    balance,
    totalUsdBalance,
    tokenBalances,
    isConnecting,
    connectingWallet,
    connectedWallet,
    connect,
    disconnect,
    switchNetwork,
    detectWallets,
    refreshBalances,
    isLoadingBalances,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
declare global {
  interface Window {
    ethereum?: any
    solana?: any
    solflare?: any
  }
}
