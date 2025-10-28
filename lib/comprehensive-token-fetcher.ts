/**
 * Comprehensive Token Fetcher
 * Fetches ALL tokens across all chains dynamically from multiple sources
 */

interface Token {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

// Fetch tokens from CoinGecko token lists for each chain
async function fetchChainTokens(chainId: string): Promise<Token[]> {
  const tokenListUrls: Record<string, string> = {
    "0x1": "https://tokens.coingecko.com/ethereum/all.json",
    "0x38": "https://tokens.coingecko.com/binance-smart-chain/all.json",
    "0x89": "https://tokens.coingecko.com/polygon-pos/all.json",
    "0xa4b1": "https://tokens.coingecko.com/arbitrum-one/all.json",
    "0xa": "https://tokens.coingecko.com/optimistic-ethereum/all.json",
    "0x2105": "https://tokens.coingecko.com/base/all.json",
    "0xa86a": "https://tokens.coingecko.com/avalanche/all.json",
    "0xfa": "https://tokens.coingecko.com/fantom/all.json",
  }

  const url = tokenListUrls[chainId]
  if (!url) return []

  try {
    console.log(`[TokenFetcher] 📡 Fetching tokens from CoinGecko for chain ${chainId}...`)
    const response = await fetch(url, { next: { revalidate: 86400 } }) // Cache 24 hours
    
    if (!response.ok) {
      console.log(`[TokenFetcher] ⚠️ Failed to fetch tokens for chain ${chainId}: ${response.status}`)
      return []
    }

    const data = await response.json()
    const tokens: Token[] = (data.tokens || []).map((token: any) => ({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      logoURI: token.logoURI,
    }))

    console.log(`[TokenFetcher] ✅ Fetched ${tokens.length} tokens for chain ${chainId}`)
    return tokens
  } catch (error) {
    console.error(`[TokenFetcher] Error fetching tokens for chain ${chainId}:`, error)
    return []
  }
}

/**
 * Get ALL tokens for a specific chain
 * Fetches from CoinGecko's comprehensive token lists
 */
export async function getAllTokensForChain(chainId: string): Promise<Token[]> {
  return await fetchChainTokens(chainId)
}

/**
 * Get ALL tokens across all supported chains
 */
export async function getAllTokens(): Promise<Record<string, Token[]>> {
  const chainIds = ["0x1", "0x38", "0x89", "0xa4b1", "0xa", "0x2105", "0xa86a", "0xfa"]
  
  console.log(`[TokenFetcher] 🚀 Fetching ALL tokens across ${chainIds.length} chains...`)
  
  const tokenPromises = chainIds.map(async (chainId) => {
    const tokens = await fetchChainTokens(chainId)
    return { chainId, tokens }
  })

  const results = await Promise.all(tokenPromises)
  
  const allTokensMap: Record<string, Token[]> = {}
  let totalTokens = 0
  
  results.forEach(({ chainId, tokens }) => {
    allTokensMap[chainId] = tokens
    totalTokens += tokens.length
  })

  console.log(`[TokenFetcher] ✅ Fetched ${totalTokens} total tokens across all chains`)
  
  return allTokensMap
}

/**
 * Get comprehensive popular tokens (enhanced list)
 * Includes major tokens, DeFi tokens, stablecoins, etc.
 */
export function getComprehensivePopularTokens(): Record<string, Token[]> {
  return {
    "0x1": [
      // Stablecoins
      { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53", symbol: "BUSD", name: "Binance USD", decimals: 18 },
      { address: "0x0000000000085d4780B73119b644AE5ecd22b376", symbol: "TUSD", name: "TrueUSD", decimals: 18 },
      
      // Major Crypto
      { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
      { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0xe2f2a5C287993345a840Db3B0845fbC70f5935a5", symbol: "MUSD", name: "mStable USD", decimals: 18 },
      
      // DeFi Major
      { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18 },
      { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "SHIBA INU", decimals: 18 },
      { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "ChainLink Token", decimals: 18 },
      { address: "0x4d224452801ACEd8B2F0aebE155379bb5D594381", symbol: "APE", name: "ApeCoin", decimals: 18 },
      { address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", symbol: "MATIC", name: "Matic Token", decimals: 18 },
      { address: "0xD533a949740bb3306d119CC777fa900bA034cd52", symbol: "CRV", name: "Curve DAO Token", decimals: 18 },
      { address: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", symbol: "SUSHI", name: "SushiToken", decimals: 18 },
      { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR", name: "Maker", decimals: 18 },
      { address: "0x0bc529c00C6401aEF6D220BE8c6Ea1667F6Ad93e", symbol: "YFI", name: "yearn.finance", decimals: 18 },
      { address: "0xBA11D00c5f74255f56a5E366F4F77f5A186d7f55", symbol: "BAND", name: "Band Protocol", decimals: 18 },
      { address: "0xDe30da39c46104798bB5aA7fe8fBE9DfB81f2e", symbol: "COMP", name: "Compound", decimals: 18 },
      { address: "0xc944E90C64B2c07662A292be6244BDf05Cda44a7", symbol: "GRT", name: "The Graph", decimals: 18 },
      { address: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F", symbol: "SNX", name: "Synthetix Network Token", decimals: 18 },
      
      // Aave tokens
      { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave Token", decimals: 18 },
      
      // Lido
      { address: "0x5A98FcBEA509Cf8b6A3dC83BeDb8DCFf1716b738", symbol: "LDO", name: "Lido DAO Token", decimals: 18 },
    ],
    "0x38": [
      // BSC Tokens - Expanded
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
      { address: "0x833F307aC507D47309Dd8CE6B5E6bE5FbE5b9dDf", symbol: "ADA", name: "Cardano Token", decimals: 18 },
      { address: "0x101d82428437127bF1608F21C0b1E56B4e0c4b4C", symbol: "DOT", name: "Polkadot Token", decimals: 18 },
      { address: "0x7420715d633E353d71C4EB6d3C7d0799F1D6B77F", symbol: "SOL", name: "Solana Token", decimals: 18 },
      { address: "0x3EE2200Efb3400fAbB9AacF31297cBdD1d435d47", symbol: "ATOM", name: "Cosmos Token", decimals: 18 },
    ],
    "0xa4b1": [
      // Arbitrum
      { address: "0xFd086bC7CD5C481DCC95BD0d56f35241523fBab9", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0x539bdE0d7Dbd336b79148AA742883198BBF60342", symbol: "MAGIC", name: "Magic", decimals: 18 },
    ],
    "0x89": [
      // Polygon
      { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
      { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", name: "Wrapped MATIC", decimals: 18 },
    ],
    "0xa": [
      // Optimism
      { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0x4200000000000000000000000000000000000006", symbol: "OP", name: "Optimism", decimals: 18 },
    ],
    "0x2105": [
      // Base
      { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome Finance", decimals: 18 },
    ],
    "0xa86a": [
      // Avalanche
      { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
      { address: "0x50b7545627a5162F82A992c33b87aDc75187B218", symbol: "WBTC", name: "Wrapped BTC", decimals: 8 },
    ],
    "0xfa": [
      // Fantom
      { address: "0x049d68029688eAbF473097a2fC38ef61633A3C7A", symbol: "USDT", name: "Tether USD", decimals: 6 },
      { address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", symbol: "USDC", name: "USD Coin", decimals: 6 },
      { address: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E", symbol: "DAI", name: "Dai Stablecoin", decimals: 18 },
      { address: "0x74b23882a30290451A17c44f4F05243b6b58C76d", symbol: "WETH", name: "Wrapped Ether", decimals: 18 },
    ],
  }
}


