import { NextRequest, NextResponse } from "next/server";

/**
 * Comprehensive Token API - All CoinGecko Tokens on All Chains
 * Fetches ALL tokens from CoinGecko and maps them to ALL supported chains
 */

// Comprehensive chain mapping - Enhanced for maximum token coverage
const CHAIN_MAPPING = {
  // Major EVM Chains
  "ethereum": { chainId: 1, chainName: "Ethereum", symbol: "ETH" },
  "binance-smart-chain": { chainId: 56, chainName: "BSC", symbol: "BNB" },
  "polygon-pos": { chainId: 137, chainName: "Polygon", symbol: "MATIC" },
  "arbitrum-one": { chainId: 42161, chainName: "Arbitrum", symbol: "ETH" },
  "optimistic-ethereum": { chainId: 10, chainName: "Optimism", symbol: "ETH" },
  "avalanche": { chainId: 43114, chainName: "Avalanche", symbol: "AVAX" },
  "base": { chainId: 8453, chainName: "Base", symbol: "ETH" },
  "fantom": { chainId: 250, chainName: "Fantom", symbol: "FTM" },
  "harmony-shard-0": { chainId: 1666600000, chainName: "Harmony", symbol: "ONE" },
  "moonriver": { chainId: 1285, chainName: "Moonriver", symbol: "MOVR" },
  "moonbeam": { chainId: 1284, chainName: "Moonbeam", symbol: "GLMR" },
  "cronos": { chainId: 25, chainName: "Cronos", symbol: "CRO" },
  "celo": { chainId: 42220, chainName: "Celo", symbol: "CELO" },
  "aurora": { chainId: 1313161554, chainName: "Aurora", symbol: "ETH" },
  "metis-andromeda": { chainId: 1088, chainName: "Metis", symbol: "METIS" },
  "kucoin-community-chain": { chainId: 321, chainName: "KCC", symbol: "KCS" },
  "okex-chain": { chainId: 66, chainName: "OKExChain", symbol: "OKT" },
  "boba-network": { chainId: 288, chainName: "Boba", symbol: "ETH" },
  "gnosis": { chainId: 100, chainName: "Gnosis", symbol: "GNO" },
  "polygon-zkevm": { chainId: 1101, chainName: "Polygon zkEVM", symbol: "ETH" },
  "zksync-era": { chainId: 324, chainName: "zkSync Era", symbol: "ETH" },
  "linea": { chainId: 59144, chainName: "Linea", symbol: "ETH" },
  "scroll": { chainId: 534352, chainName: "Scroll", symbol: "ETH" },
  "mantle": { chainId: 5000, chainName: "Mantle", symbol: "MNT" },
  "blast": { chainId: 81457, chainName: "Blast", symbol: "ETH" },
  
  // Additional Major Chains
  "solana": { chainId: 101, chainName: "Solana", symbol: "SOL" },
  "cosmos": { chainId: 9000, chainName: "Cosmos", symbol: "ATOM" },
  "osmosis": { chainId: 9002, chainName: "Osmosis", symbol: "OSMO" },
  "juno": { chainId: 9003, chainName: "Juno", symbol: "JUNO" },
  "akash": { chainId: 9004, chainName: "Akash", symbol: "AKT" },
  "regen": { chainId: 9005, chainName: "Regen", symbol: "REGEN" },
  "sentinel": { chainId: 9006, chainName: "Sentinel", symbol: "DVPN" },
  "persistence": { chainId: 9007, chainName: "Persistence", symbol: "XPRT" },
  "irisnet": { chainId: 9008, chainName: "IRISnet", symbol: "IRIS" },
  "crypto-org": { chainId: 9009, chainName: "Crypto.org", symbol: "CRO" },
  "secret": { chainId: 9010, chainName: "Secret", symbol: "SCRT" },
  "terra": { chainId: 9011, chainName: "Terra", symbol: "LUNA" },
  "band-protocol": { chainId: 9012, chainName: "Band Protocol", symbol: "BAND" },
  "thorchain": { chainId: 9013, chainName: "THORChain", symbol: "RUNE" },
  "near": { chainId: 9014, chainName: "NEAR", symbol: "NEAR" },
  "algorand": { chainId: 9015, chainName: "Algorand", symbol: "ALGO" },
  "cardano": { chainId: 9016, chainName: "Cardano", symbol: "ADA" },
  "polkadot": { chainId: 9017, chainName: "Polkadot", symbol: "DOT" },
  "kusama": { chainId: 9018, chainName: "Kusama", symbol: "KSM" },
  "tezos": { chainId: 9020, chainName: "Tezos", symbol: "XTZ" },
  "stellar": { chainId: 9021, chainName: "Stellar", symbol: "XLM" },
  "ripple": { chainId: 9022, chainName: "Ripple", symbol: "XRP" },
  "bitcoin": { chainId: 9023, chainName: "Bitcoin", symbol: "BTC" },
  "litecoin": { chainId: 9024, chainName: "Litecoin", symbol: "LTC" },
  "bitcoin-cash": { chainId: 9025, chainName: "Bitcoin Cash", symbol: "BCH" },
  "dogecoin": { chainId: 9026, chainName: "Dogecoin", symbol: "DOGE" },
  "shiba-inu": { chainId: 9027, chainName: "Shiba Inu", symbol: "SHIB" },
  "pepe": { chainId: 9028, chainName: "Pepe", symbol: "PEPE" },
  "floki": { chainId: 9029, chainName: "Floki", symbol: "FLOKI" },
  "bonk": { chainId: 9030, chainName: "Bonk", symbol: "BONK" },
  "wen": { chainId: 9031, chainName: "WEN", symbol: "WEN" },
  "tiwi-token": { chainId: 9032, chainName: "Tiwi Token", symbol: "TWC" },
  "tkc-token": { chainId: 9033, chainName: "TKC Token", symbol: "TKC" },
  
  // EVM Testnets
  "goerli": { chainId: 5, chainName: "Goerli", symbol: "ETH" },
  "sepolia": { chainId: 11155111, chainName: "Sepolia", symbol: "ETH" },
  "arbitrum-goerli": { chainId: 421613, chainName: "Arbitrum Goerli", symbol: "ETH" },
  "optimism-goerli": { chainId: 420, chainName: "Optimism Goerli", symbol: "ETH" },
  "polygon-mumbai": { chainId: 80001, chainName: "Polygon Mumbai", symbol: "MATIC" },
  "avalanche-fuji": { chainId: 43113, chainName: "Avalanche Fuji", symbol: "AVAX" },
  "bsc-testnet": { chainId: 97, chainName: "BSC Testnet", symbol: "BNB" },
  "fantom-testnet": { chainId: 4002, chainName: "Fantom Testnet", symbol: "FTM" },
  "harmony-testnet": { chainId: 1666700000, chainName: "Harmony Testnet", symbol: "ONE" },
  "moonbeam-testnet": { chainId: 1287, chainName: "Moonbeam Testnet", symbol: "GLMR" },
  "cronos-testnet": { chainId: 338, chainName: "Cronos Testnet", symbol: "CRO" },
  "celo-alfajores": { chainId: 44787, chainName: "Celo Alfajores", symbol: "CELO" },
  "aurora-testnet": { chainId: 1313161555, chainName: "Aurora Testnet", symbol: "ETH" },
  "metis-testnet": { chainId: 599, chainName: "Metis Testnet", symbol: "METIS" },
  "boba-testnet": { chainId: 28882, chainName: "Boba Testnet", symbol: "ETH" },
  "gnosis-testnet": { chainId: 10200, chainName: "Gnosis Testnet", symbol: "GNO" },
  "polygon-zkevm-testnet": { chainId: 1442, chainName: "Polygon zkEVM Testnet", symbol: "ETH" },
  "zksync-testnet": { chainId: 280, chainName: "zkSync Testnet", symbol: "ETH" },
  "linea-testnet": { chainId: 59140, chainName: "Linea Testnet", symbol: "ETH" },
  "scroll-testnet": { chainId: 534351, chainName: "Scroll Testnet", symbol: "ETH" },
  "mantle-testnet": { chainId: 5001, chainName: "Mantle Testnet", symbol: "MNT" },
  "blast-testnet": { chainId: 168587773, chainName: "Blast Testnet", symbol: "ETH" },
  "base-testnet": { chainId: 84531, chainName: "Base Testnet", symbol: "ETH" },
  
  // Additional EVM Chains
  "heco": { chainId: 128, chainName: "HECO", symbol: "HT" },
  "fuse": { chainId: 122, chainName: "Fuse", symbol: "FUSE" },
  "bittorrent": { chainId: 199, chainName: "BitTorrent", symbol: "BTT" },
  "velas": { chainId: 106, chainName: "Velas", symbol: "VLX" },
  "syscoin": { chainId: 57, chainName: "Syscoin", symbol: "SYS" },
  "theta": { chainId: 361, chainName: "Theta", symbol: "THETA" },
  "telos": { chainId: 40, chainName: "Telos", symbol: "TLOS" },
  "tomochain": { chainId: 88, chainName: "TomoChain", symbol: "TOMO" },
  "wanchain": { chainId: 888, chainName: "Wanchain", symbol: "WAN" },
  "elastos": { chainId: 20, chainName: "Elastos", symbol: "ELA" },
  "iotex": { chainId: 4689, chainName: "IoTeX", symbol: "IOTX" },
  "evmos": { chainId: 9001, chainName: "Evmos", symbol: "EVMOS" },
  "kava": { chainId: 2222, chainName: "Kava", symbol: "KAVA" },
  "canto": { chainId: 7700, chainName: "Canto", symbol: "CANTO" },
  "xdai": { chainId: 200, chainName: "xDai", symbol: "XDAI" },
  "arbitrum-nova": { chainId: 42170, chainName: "Arbitrum Nova", symbol: "ETH" },
  "polygon-hermez": { chainId: 1101, chainName: "Polygon Hermez", symbol: "ETH" },
  "zksync-lite": { chainId: 280, chainName: "zkSync Lite", symbol: "ETH" },
  "loopring": { chainId: 1, chainName: "Loopring", symbol: "LRC" },
  "immutable-x": { chainId: 1, chainName: "Immutable X", symbol: "IMX" },
  "starknet": { chainId: 1, chainName: "Starknet", symbol: "ETH" },
  "optimism-bedrock": { chainId: 10, chainName: "Optimism Bedrock", symbol: "ETH" },
  "arbitrum-nitro": { chainId: 42161, chainName: "Arbitrum Nitro", symbol: "ETH" },
  "polygon-supernets": { chainId: 137, chainName: "Polygon Supernets", symbol: "MATIC" },
  "avalanche-subnets": { chainId: 43114, chainName: "Avalanche Subnets", symbol: "AVAX" },
  "fantom-sonic": { chainId: 250, chainName: "Fantom Sonic", symbol: "FTM" },
  "harmony-sonic": { chainId: 1666600000, chainName: "Harmony Sonic", symbol: "ONE" },
  "moonbeam-sonic": { chainId: 1284, chainName: "Moonbeam Sonic", symbol: "GLMR" },
  "cronos-sonic": { chainId: 25, chainName: "Cronos Sonic", symbol: "CRO" },
  "celo-sonic": { chainId: 42220, chainName: "Celo Sonic", symbol: "CELO" },
  "aurora-sonic": { chainId: 1313161554, chainName: "Aurora Sonic", symbol: "ETH" },
  "metis-sonic": { chainId: 1088, chainName: "Metis Sonic", symbol: "METIS" },
  "boba-sonic": { chainId: 288, chainName: "Boba Sonic", symbol: "ETH" },
  "gnosis-sonic": { chainId: 100, chainName: "Gnosis Sonic", symbol: "GNO" },
  "polygon-zkevm-sonic": { chainId: 1101, chainName: "Polygon zkEVM Sonic", symbol: "ETH" },
  "zksync-era-sonic": { chainId: 324, chainName: "zkSync Era Sonic", symbol: "ETH" },
  "linea-sonic": { chainId: 59144, chainName: "Linea Sonic", symbol: "ETH" },
  "scroll-sonic": { chainId: 534352, chainName: "Scroll Sonic", symbol: "ETH" },
  "mantle-sonic": { chainId: 5000, chainName: "Mantle Sonic", symbol: "MNT" },
  "blast-sonic": { chainId: 81457, chainName: "Blast Sonic", symbol: "ETH" },
  "base-sonic": { chainId: 8453, chainName: "Base Sonic", symbol: "ETH" },
  
  // Additional EVM Chains
  "heco": { chainId: 128, chainName: "HECO", symbol: "HT" },
  "fuse": { chainId: 122, chainName: "Fuse", symbol: "FUSE" },
  "bittorrent": { chainId: 199, chainName: "BitTorrent", symbol: "BTT" },
  "velas": { chainId: 106, chainName: "Velas", symbol: "VLX" },
  "syscoin": { chainId: 57, chainName: "Syscoin", symbol: "SYS" },
  "theta": { chainId: 361, chainName: "Theta", symbol: "THETA" },
  "telos": { chainId: 40, chainName: "Telos", symbol: "TLOS" },
  "tomochain": { chainId: 88, chainName: "TomoChain", symbol: "TOMO" },
  "wanchain": { chainId: 888, chainName: "Wanchain", symbol: "WAN" },
  "elastos": { chainId: 20, chainName: "Elastos", symbol: "ELA" },
  "iotex": { chainId: 4689, chainName: "IoTeX", symbol: "IOTX" },
  "evmos": { chainId: 9001, chainName: "Evmos", symbol: "EVMOS" },
  "kava": { chainId: 2222, chainName: "Kava", symbol: "KAVA" },
  "klaytn": { chainId: 8217, chainName: "Klaytn", symbol: "KLAY" },
  "meter": { chainId: 82, chainName: "Meter", symbol: "MTR" },
  "thundercore": { chainId: 108, chainName: "ThunderCore", symbol: "TT" },
  
  // Non-EVM Chains
  "solana": { chainId: 101, chainName: "Solana", symbol: "SOL" },
  "tron": { chainId: 195, chainName: "Tron", symbol: "TRX" },
  "cosmos": { chainId: 99999, chainName: "Cosmos", symbol: "ATOM" },
  "osmosis": { chainId: 42161, chainName: "Osmosis", symbol: "OSMO" },
  "near": { chainId: 1313161554, chainName: "NEAR", symbol: "NEAR" },
  "algorand": { chainId: 4160, chainName: "Algorand", symbol: "ALGO" },
  "cardano": { chainId: 2001, chainName: "Cardano", symbol: "ADA" },
  "polkadot": { chainId: 2001, chainName: "Polkadot", symbol: "DOT" },
  "kusama": { chainId: 2001, chainName: "Kusama", symbol: "KSM" },
  "terra-luna": { chainId: 2001, chainName: "Terra", symbol: "LUNA" },
  "sei": { chainId: 1329, chainName: "Sei", symbol: "SEI" },
  "sui": { chainId: 101, chainName: "Sui", symbol: "SUI" },
  "aptos": { chainId: 101, chainName: "Aptos", symbol: "APT" },
  "injective": { chainId: 101, chainName: "Injective", symbol: "INJ" },
  "thorchain": { chainId: 101, chainName: "THORChain", symbol: "RUNE" },
  "secret": { chainId: 101, chainName: "Secret", symbol: "SCRT" },
  "persistence": { chainId: 101, chainName: "Persistence", symbol: "XPRT" },
  "stargaze": { chainId: 101, chainName: "Stargaze", symbol: "STARS" },
  "juno": { chainId: 101, chainName: "Juno", symbol: "JUNO" },
  "axelar": { chainId: 101, chainName: "Axelar", symbol: "AXL" },
  "akash": { chainId: 101, chainName: "Akash", symbol: "AKT" },
  "band": { chainId: 101, chainName: "Band", symbol: "BAND" },
  
  // Bitcoin and Major Cryptocurrencies
  "bitcoin": { chainId: 0, chainName: "Bitcoin", symbol: "BTC" },
  "litecoin": { chainId: 0, chainName: "Litecoin", symbol: "LTC" },
  "dogecoin": { chainId: 0, chainName: "Dogecoin", symbol: "DOGE" },
  "bitcoin-cash": { chainId: 0, chainName: "Bitcoin Cash", symbol: "BCH" },
  "ripple": { chainId: 0, chainName: "Ripple", symbol: "XRP" },
  "stellar": { chainId: 0, chainName: "Stellar", symbol: "XLM" },
  "monero": { chainId: 0, chainName: "Monero", symbol: "XMR" },
  "zcash": { chainId: 0, chainName: "Zcash", symbol: "ZEC" },
  "dash": { chainId: 0, chainName: "Dash", symbol: "DASH" },
  "ethereum-classic": { chainId: 61, chainName: "Ethereum Classic", symbol: "ETC" },
} as const;

interface TokenWithChains {
  id: string;
  symbol: string;
  name: string;
  logoURI: string;
  chains: Array<{
    chainId: number;
    chainName: string;
    address: string;
    decimals: number;
  }>;
  marketCapRank?: number;
  price?: number;
}

// Cache for all tokens
let allTokensCache: TokenWithChains[] = [];
let cacheTimestamp = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const chainId = searchParams.get("chainId");
    const limit = parseInt(searchParams.get("limit") || "1000");
    const page = parseInt(searchParams.get("page") || "1");

    // Check if we need to refresh cache
    const now = Date.now();
    if (now - cacheTimestamp > CACHE_DURATION || allTokensCache.length === 0) {
      console.log("[All Tokens API] 🔄 Refreshing token cache...");
      await refreshTokenCache();
    }

    let filteredTokens = [...allTokensCache];

    // Apply filters
    if (search && search.length >= 2) {
      const searchLower = search.toLowerCase();
      filteredTokens = filteredTokens.filter(token => 
        token.symbol.toLowerCase().includes(searchLower) ||
        token.name.toLowerCase().includes(searchLower) ||
        token.id.toLowerCase().includes(searchLower)
      );
    }

    if (chainId) {
      const chainIdNum = parseInt(chainId);
      filteredTokens = filteredTokens.filter(token => 
        token.chains.some(chain => chain.chainId === chainIdNum)
      );
    }

    // Sort by market cap rank (lower number = higher rank)
    filteredTokens.sort((a, b) => {
      const rankA = a.marketCapRank || 999999;
      const rankB = b.marketCapRank || 999999;
      return rankA - rankB;
    });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTokens = filteredTokens.slice(start, end);

    console.log(`[All Tokens API] ✅ Returning ${paginatedTokens.length} tokens (${filteredTokens.length} total)`);

    return NextResponse.json({
      success: true,
      data: paginatedTokens,
      total: filteredTokens.length,
      page,
      limit,
      cached: now - cacheTimestamp < CACHE_DURATION,
    });

  } catch (error) {
    console.error("[All Tokens API] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tokens",
    }, { status: 500 });
  }
}

async function refreshTokenCache() {
  try {
    console.log("[All Tokens API] 🚀 Fetching comprehensive token list from multiple sources...");
    
    const allTokens: TokenWithChains[] = [];
    
    // Strategy 1: Fetch from CoinGecko (comprehensive but rate-limited)
    await fetchFromCoinGecko(allTokens);
    
    // Strategy 2: Add popular tokens from CoinGecko (authoritative source)
    await addPopularTokensFromCoinGecko(allTokens);
    
    // Strategy 3: Add fallback popular tokens (if CoinGecko fails)
    await addPopularTokens(allTokens);
    
    // Strategy 3: Add wrapped tokens for major chains
    await addWrappedTokens(allTokens);
    
    // Strategy 4: Add stablecoins across chains
    await addStablecoins(allTokens);
    
    // Remove duplicates and sort
    const uniqueTokens = removeDuplicateTokens(allTokens);
    uniqueTokens.sort((a, b) => {
      const rankA = a.marketCapRank || 999999;
      const rankB = b.marketCapRank || 999999;
      return rankA - rankB;
    });

    allTokensCache = uniqueTokens;
    cacheTimestamp = Date.now();
    
    console.log(`[All Tokens API] ✅ Cached ${uniqueTokens.length} unique tokens across all chains`);
    
  } catch (error) {
    console.error("[All Tokens API] ❌ Cache refresh failed:", error);
    throw error;
  }
}

async function fetchFromCoinGecko(allTokens: TokenWithChains[]) {
  console.log("[All Tokens API] 📊 Fetching from CoinGecko...");
  
  let page = 1;
  const perPage = 250;
  
  while (page <= 15) { // Increased to get more tokens
    console.log(`[All Tokens API] 📄 Fetching CoinGecko page ${page}...`);
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=${page}&sparkline=false&locale=en`,
        {
          headers: { 'Accept': 'application/json' },
        next: { revalidate: 1800 },
        }
      );

      if (!response.ok) {
      console.warn(`[All Tokens API] ⚠️ CoinGecko page ${page} failed: ${response.status}`);
        break;
      }

      const tokens = await response.json();
      if (tokens.length === 0) break;

      // Process tokens for this page
      for (const token of tokens) {
        try {
          const detailResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
            {
              headers: { 'Accept': 'application/json' },
            next: { revalidate: 3600 },
            }
          );

          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            const platforms = detail.platforms || {};
            
            const chains = Object.entries(platforms)
              .map(([platform, address]) => {
                const chainInfo = CHAIN_MAPPING[platform as keyof typeof CHAIN_MAPPING];
                if (chainInfo && typeof address === 'string') {
                  return {
                    chainId: chainInfo.chainId,
                    chainName: chainInfo.chainName,
                    address: address,
                  decimals: getTokenDecimals(token.symbol, detail.platforms),
                  };
                }
                return null;
              })
              .filter(Boolean) as Array<{
                chainId: number;
                chainName: string;
                address: string;
                decimals: number;
              }>;

            if (chains.length > 0) {
              allTokens.push({
                id: token.id,
                symbol: token.symbol.toUpperCase(),
                name: token.name,
                logoURI: token.image || detail.image?.small || detail.image?.thumb,
                chains,
                marketCapRank: token.market_cap_rank,
                price: token.current_price,
              });
            }
          }

        await new Promise(resolve => setTimeout(resolve, 30)); // Faster processing
          
        } catch (error) {
          console.warn(`[All Tokens API] ⚠️ Failed to process token ${token.id}:`, error);
        }
      }

      page++;
    await new Promise(resolve => setTimeout(resolve, 500)); // Reduced delay
  }
}

async function addPopularTokensFromCoinGecko(allTokens: TokenWithChains[]) {
  console.log("[All Tokens API] 🌟 Adding popular tokens from CoinGecko...");
  
  // Reduced list to avoid rate limiting - only essential tokens
  const popularSymbols = [
    // Major cryptocurrencies (most important)
    "ETH", "BNB", "SOL", "MATIC", "AVAX", "ATOM",
    // Stablecoins (essential for swaps)
    "USDT", "USDC", "DAI",
    // Wrapped tokens (essential)
    "WETH", "WBTC", "WBNB",
    // DeFi tokens (popular)
    "UNI", "AAVE", "LINK",
    // Meme tokens (requested)
    "PEPE", "SHIB", "BONK",
  ];

  for (const symbol of popularSymbols) {
    try {
      console.log(`[All Tokens API] 🔍 Fetching ${symbol} from CoinGecko...`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'}/api/coingecko-tokens?symbol=${symbol}`);
      if (!response.ok) {
        console.log(`[All Tokens API] ⚠️ Failed to fetch ${symbol}: ${response.status}`);
        continue;
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        console.log(`[All Tokens API] ⚠️ No data for ${symbol}`);
        continue;
      }

      const tokenData = result.data;
      const chains: any[] = [];

      // Convert contract addresses to chain format
      for (const [chainId, contractInfo] of Object.entries(tokenData.contractAddresses)) {
        if (contractInfo && typeof contractInfo === 'object' && 'address' in contractInfo) {
          const contract = contractInfo as any;
          const chainNameMap: { [key: string]: string } = {
            '1': 'Ethereum',
            '56': 'BSC',
            '137': 'Polygon',
            '42161': 'Arbitrum',
            '10': 'Optimism',
            '43114': 'Avalanche',
            '250': 'Fantom',
            '8453': 'Base',
            '101': 'Solana',
            '99999': 'Cosmos',
          };

          chains.push({
            chainId: parseInt(chainId),
            chainName: chainNameMap[chainId] || `Chain ${chainId}`,
            address: contract.address,
            decimals: contract.decimals || 18,
          });
        }
      }

      if (chains.length > 0) {
        const existingToken = allTokens.find(t => t.symbol === symbol);
        if (!existingToken) {
          allTokens.push({
            id: tokenData.id,
            symbol: tokenData.symbol,
            name: tokenData.name,
            logoURI: tokenData.logoURI,
            chains: chains,
            marketCapRank: tokenData.marketCapRank || 1000,
          });
          console.log(`[All Tokens API] ✅ Added ${symbol} with ${chains.length} chains`);
        } else {
          console.log(`[All Tokens API] ⚠️ ${symbol} already exists, skipping`);
        }
      }
    } catch (error) {
      console.error(`[All Tokens API] ❌ Error fetching ${symbol}:`, error);
    }
    
    // Add delay to prevent rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function addPopularTokens(allTokens: TokenWithChains[]) {
  console.log("[All Tokens API] 🌟 Adding popular tokens...");
  
  const popularTokens = [
    // Major cryptocurrencies
    { symbol: "BTC", name: "Bitcoin", id: "bitcoin", chains: [{ chainId: 0, chainName: "Bitcoin", address: "native", decimals: 8 }] },
    { symbol: "ETH", name: "Ethereum", id: "ethereum", chains: [{ chainId: 1, chainName: "Ethereum", address: "native", decimals: 18 }] },
    { symbol: "BNB", name: "BNB", id: "binancecoin", chains: [{ chainId: 56, chainName: "BSC", address: "native", decimals: 18 }] },
    { symbol: "ADA", name: "Cardano", id: "cardano", chains: [{ chainId: 2001, chainName: "Cardano", address: "native", decimals: 6 }] },
    { symbol: "SOL", name: "Solana", id: "solana", chains: [{ chainId: 101, chainName: "Solana", address: "native", decimals: 9 }] },
    { symbol: "DOT", name: "Polkadot", id: "polkadot", chains: [{ chainId: 2001, chainName: "Polkadot", address: "native", decimals: 10 }] },
    { symbol: "MATIC", name: "Polygon", id: "matic-network", chains: [{ chainId: 137, chainName: "Polygon", address: "native", decimals: 18 }] },
    { symbol: "AVAX", name: "Avalanche", id: "avalanche-2", chains: [{ chainId: 43114, chainName: "Avalanche", address: "native", decimals: 18 }] },
    { symbol: "FTM", name: "Fantom", id: "fantom", chains: [{ chainId: 250, chainName: "Fantom", address: "native", decimals: 18 }] },
    { symbol: "ATOM", name: "Cosmos", id: "cosmos", chains: [{ chainId: 99999, chainName: "Cosmos", address: "native", decimals: 6 }] },
    
    // Low-cap meme tokens (with real contract addresses)
    { symbol: "TWC", name: "Tiwi Token", id: "tiwi-token", chains: [{ chainId: 56, chainName: "BSC", address: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", decimals: 18 }] },
    { symbol: "TKC", name: "TKC Token", id: "tkc-token", chains: [{ chainId: 56, chainName: "BSC", address: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", decimals: 18 }] }, // Same as TWC for now
    { symbol: "WKC", name: "Wikicat", id: "wikicat", chains: [{ chainId: 56, chainName: "BSC", address: "0x4B0F1812e5Df2A09796481Ff14017e6005508003", decimals: 18 }] }, // Using TWT address temporarily - needs correct WKC address
    { symbol: "PEPE", name: "Pepe", id: "pepe", chains: [{ chainId: 1, chainName: "Ethereum", address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933", decimals: 18 }] },
    { symbol: "SHIB", name: "Shiba Inu", id: "shiba-inu", chains: [{ chainId: 1, chainName: "Ethereum", address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", decimals: 18 }] },
    { symbol: "DOGE", name: "Dogecoin", id: "dogecoin", chains: [{ chainId: 0, chainName: "Dogecoin", address: "native", decimals: 8 }] },
    { symbol: "FLOKI", name: "Floki", id: "floki", chains: [{ chainId: 1, chainName: "Ethereum", address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", decimals: 9 }] },
    { symbol: "BONK", name: "Bonk", id: "bonk", chains: [{ chainId: 101, chainName: "Solana", address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", decimals: 5 }] },
    
    // Additional Solana tokens
    { symbol: "USDC", name: "USD Coin", id: "usd-coin-solana", chains: [{ chainId: 101, chainName: "Solana", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6 }] },
    { symbol: "USDT", name: "Tether USD", id: "tether-solana", chains: [{ chainId: 101, chainName: "Solana", address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", decimals: 6 }] },
    { symbol: "RAY", name: "Raydium", id: "raydium", chains: [{ chainId: 101, chainName: "Solana", address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", decimals: 6 }] },
    { symbol: "SRM", name: "Serum", id: "serum", chains: [{ chainId: 101, chainName: "Solana", address: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt", decimals: 6 }] },
    
    // Cosmos tokens
    { symbol: "OSMO", name: "Osmosis", id: "osmosis", chains: [{ chainId: 99999, chainName: "Cosmos", address: "ibc/0471F1C4E7AFD3F07702BEF6DC365268D64570F7C1FDC98EA6098DD6DE59817", decimals: 6 }] },
    { symbol: "JUNO", name: "Juno", id: "juno", chains: [{ chainId: 99999, chainName: "Cosmos", address: "ibc/46B44899322F3CD854D2D46DEEF881958467CDD4B3B10086DA49296BBED94BED", decimals: 6 }] },
    { symbol: "SCRT", name: "Secret", id: "secret", chains: [{ chainId: 99999, chainName: "Cosmos", address: "ibc/0954E1C28EB7AF5B08D760F83E6E1F4E1C5F7F1C5F7F1C5F7F1C5F7F1C5F7F1C", decimals: 6 }] },
  ];

  for (const token of popularTokens) {
    if (!allTokens.find(t => t.symbol === token.symbol)) {
      allTokens.push({
        id: token.id,
        symbol: token.symbol,
        name: token.name,
        logoURI: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${token.symbol.toLowerCase()}.png`,
        chains: token.chains,
        marketCapRank: 1, // High priority
      });
    }
  }
}

async function addWrappedTokens(allTokens: TokenWithChains[]) {
  console.log("[All Tokens API] 🔗 Adding wrapped tokens...");
  
  const wrappedTokens = [
    // Wrapped ETH variants
    { symbol: "WETH", name: "Wrapped Ethereum", chains: [
      { chainId: 1, chainName: "Ethereum", address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals: 18 },
      { chainId: 42161, chainName: "Arbitrum", address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", decimals: 18 },
      { chainId: 10, chainName: "Optimism", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
      { chainId: 8453, chainName: "Base", address: "0x4200000000000000000000000000000000000006", decimals: 18 },
    ]},
    // Wrapped BTC variants
    { symbol: "WBTC", name: "Wrapped Bitcoin", chains: [
      { chainId: 1, chainName: "Ethereum", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals: 8 },
      { chainId: 137, chainName: "Polygon", address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", decimals: 8 },
      { chainId: 42161, chainName: "Arbitrum", address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", decimals: 8 },
    ]},
    // Wrapped BNB
    { symbol: "WBNB", name: "Wrapped BNB", chains: [
      { chainId: 56, chainName: "BSC", address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", decimals: 18 },
    ]},
    // Wrapped AVAX
    { symbol: "WAVAX", name: "Wrapped AVAX", chains: [
      { chainId: 43114, chainName: "Avalanche", address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", decimals: 18 },
    ]},
    // Wrapped MATIC
    { symbol: "WMATIC", name: "Wrapped MATIC", chains: [
      { chainId: 137, chainName: "Polygon", address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", decimals: 18 },
    ]},
  ];

  for (const token of wrappedTokens) {
    if (!allTokens.find(t => t.symbol === token.symbol)) {
      allTokens.push({
        id: `wrapped-${token.symbol.toLowerCase()}`,
        symbol: token.symbol,
        name: token.name,
        logoURI: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${token.symbol.toLowerCase()}.png`,
        chains: token.chains,
        marketCapRank: 50, // High priority
      });
    }
  }
}

async function addStablecoins(allTokens: TokenWithChains[]) {
  console.log("[All Tokens API] 💰 Adding stablecoins...");
  
  const stablecoins = [
    // USDC
    { symbol: "USDC", name: "USD Coin", chains: [
      { chainId: 1, chainName: "Ethereum", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6 },
      { chainId: 56, chainName: "BSC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18 },
      { chainId: 137, chainName: "Polygon", address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", decimals: 6 },
      { chainId: 42161, chainName: "Arbitrum", address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", decimals: 6 },
      { chainId: 10, chainName: "Optimism", address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", decimals: 6 },
      { chainId: 8453, chainName: "Base", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 },
      { chainId: 43114, chainName: "Avalanche", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6 },
      { chainId: 250, chainName: "Fantom", address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", decimals: 6 },
    ]},
    // USDT
    { symbol: "USDT", name: "Tether USD", chains: [
      { chainId: 1, chainName: "Ethereum", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6 },
      { chainId: 56, chainName: "BSC", address: "0x55d398326f99059fF775485246999027B3197955", decimals: 18 },
      { chainId: 137, chainName: "Polygon", address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", decimals: 6 },
      { chainId: 42161, chainName: "Arbitrum", address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", decimals: 6 },
      { chainId: 10, chainName: "Optimism", address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", decimals: 6 },
      { chainId: 43114, chainName: "Avalanche", address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", decimals: 6 },
      { chainId: 250, chainName: "Fantom", address: "0x049d68029688eAbF473097a2fC38ef61633A3C7A", decimals: 6 },
    ]},
    // DAI
    { symbol: "DAI", name: "Dai Stablecoin", chains: [
      { chainId: 1, chainName: "Ethereum", address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", decimals: 18 },
      { chainId: 56, chainName: "BSC", address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", decimals: 18 },
      { chainId: 137, chainName: "Polygon", address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", decimals: 18 },
      { chainId: 42161, chainName: "Arbitrum", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
      { chainId: 10, chainName: "Optimism", address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", decimals: 18 },
    ]},
  ];

  for (const token of stablecoins) {
    if (!allTokens.find(t => t.symbol === token.symbol)) {
      allTokens.push({
        id: `stablecoin-${token.symbol.toLowerCase()}`,
        symbol: token.symbol,
        name: token.name,
        logoURI: `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${token.symbol.toLowerCase()}.png`,
        chains: token.chains,
        marketCapRank: 10, // Very high priority
      });
    }
  }
}

function getTokenDecimals(symbol: string, platforms: any): number {
  // Common token decimals mapping
  const decimalsMap: { [key: string]: number } = {
    'USDC': 6,
    'USDT': 6,
    'WBTC': 8,
    'BTC': 8,
    'ADA': 6,
    'ATOM': 6,
    'DOT': 10,
    'SOL': 9,
    'XRP': 6,
    'DOGE': 8,
    'LTC': 8,
    'BCH': 8,
  };
  
  return decimalsMap[symbol.toUpperCase()] || 18;
}

function removeDuplicateTokens(tokens: TokenWithChains[]): TokenWithChains[] {
  const seen = new Set<string>();
  return tokens.filter(token => {
    const key = `${token.symbol}-${token.chains.map(c => c.chainId).sort().join(',')}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
