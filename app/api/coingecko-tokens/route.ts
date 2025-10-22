import { type NextRequest, NextResponse } from "next/server"

// Cache for token contract addresses
const tokenAddressCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

// Rate limiting
let lastApiCall = 0;
const MIN_API_INTERVAL = 1000; // 1 second between calls

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const chainId = searchParams.get("chainId");

    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const cacheKey = `${symbol.toLowerCase()}-${chainId || 'all'}`;
    const cached = tokenAddressCache.get(cacheKey);
    const now = Date.now();

    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`[CoinGecko Tokens] 📋 Returning cached data for ${symbol}`);
      return NextResponse.json({ success: true, data: cached.data });
    }

    console.log(`[CoinGecko Tokens] 🔍 Fetching contract addresses for ${symbol} from CoinGecko`);

    // CoinGecko coin ID mapping
    const coinIdMap: { [symbol: string]: string } = {
      // Major cryptocurrencies
      "BTC": "bitcoin",
      "ETH": "ethereum", 
      "BNB": "binancecoin",
      "ADA": "cardano",
      "SOL": "solana",
      "DOT": "polkadot",
      "MATIC": "matic-network",
      "AVAX": "avalanche-2",
      "FTM": "fantom",
      "ATOM": "cosmos",
      
      // Stablecoins
      "USDT": "tether",
      "USDC": "usd-coin",
      "DAI": "dai",
      "BUSD": "binance-usd",
      "USDD": "usdd",
      "TUSD": "true-usd",
      "USDP": "paxos-standard",
      "GUSD": "gemini-dollar",
      "LUSD": "liquity-usd",
      "FRAX": "frax",
      
      // Wrapped tokens
      "WETH": "weth",
      "WBTC": "wrapped-bitcoin",
      "WBNB": "wbnb",
      "WAVAX": "wrapped-avax",
      "WMATIC": "wrapped-matic",
      
      // DeFi tokens
      "UNI": "uniswap",
      "AAVE": "aave",
      "LINK": "chainlink",
      "CRV": "curve-dao-token",
      "SUSHI": "sushi",
      "CAKE": "pancakeswap-token",
      "RAY": "raydium",
      "SRM": "serum",
      
      // Meme tokens
      "PEPE": "pepe",
      "SHIB": "shiba-inu",
      "DOGE": "dogecoin",
      "FLOKI": "floki",
      "BONK": "bonk",
      
      // Low-cap tokens
      "TWC": "tiwi-token",
      "TKC": "tkc-token", 
      "WKC": "wikicat",
      
      // Cosmos ecosystem
      "OSMO": "osmosis",
      "JUNO": "juno-network",
      "SCRT": "secret",
    };

    const coinId = coinIdMap[symbol.toUpperCase()];
    if (!coinId) {
      console.log(`[CoinGecko Tokens] ❌ Unknown symbol: ${symbol}`);
      return NextResponse.json({ error: `Unknown symbol: ${symbol}` }, { status: 404 });
    }

    // Rate limiting - wait if needed
    const currentTime = Date.now();
    const timeSinceLastCall = currentTime - lastApiCall;
    if (timeSinceLastCall < MIN_API_INTERVAL) {
      const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
      console.log(`[CoinGecko Tokens] ⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastApiCall = Date.now();

    // Fetch token data from CoinGecko
    console.log(`[CoinGecko Tokens] 🌐 Fetching ${coinId} from CoinGecko API...`);
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0',
      },
    });

    if (!response.ok) {
      console.log(`[CoinGecko Tokens] ❌ CoinGecko API failed with status: ${response.status}`);
      return NextResponse.json({ error: `CoinGecko API failed: ${response.status}` }, { status: response.status });
    }

    const tokenData = await response.json();
    console.log(`[CoinGecko Tokens] ✅ Fetched data for ${symbol}:`, tokenData.id);

    // Extract contract addresses by platform
    const contractAddresses: { [chainId: string]: { address: string; decimals: number; platform: string } } = {};

    if (tokenData.platforms) {
      for (const [platform, address] of Object.entries(tokenData.platforms)) {
        if (address && typeof address === 'string') {
          // Map platform names to chain IDs
          const platformToChainId: { [platform: string]: string } = {
            'ethereum': '1',
            'binance-smart-chain': '56',
            'polygon-pos': '137',
            'arbitrum-one': '42161',
            'optimistic-ethereum': '10',
            'avalanche': '43114',
            'fantom': '250',
            'base': '8453',
            'solana': '99998',
            'cosmos': '99999',
          };

          const chainId = platformToChainId[platform];
          if (chainId) {
            contractAddresses[chainId] = {
              address: address.toLowerCase(),
              decimals: tokenData.detail_platforms?.[platform]?.decimal_place || 18,
              platform: platform,
            };
          }
        }
      }
    }

    // For native tokens, add native address
    if (tokenData.id === 'ethereum') {
      contractAddresses['1'] = { address: '0x0000000000000000000000000000000000000000', decimals: 18, platform: 'ethereum' };
    } else if (tokenData.id === 'binancecoin') {
      contractAddresses['56'] = { address: '0x0000000000000000000000000000000000000000', decimals: 18, platform: 'binance-smart-chain' };
    } else if (tokenData.id === 'solana') {
      // Solana native token - use the correct native address format
      contractAddresses['99998'] = { address: 'native', decimals: 9, platform: 'solana' };
    } else if (tokenData.id === 'cosmos') {
      contractAddresses['99999'] = { address: 'native', decimals: 6, platform: 'cosmos' };
    }

    const result = {
      symbol: symbol.toUpperCase(),
      name: tokenData.name,
      id: tokenData.id,
      logoURI: tokenData.image?.large || tokenData.image?.small,
      contractAddresses,
      marketCapRank: tokenData.market_cap_rank,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    tokenAddressCache.set(cacheKey, { data: result, timestamp: now });

    console.log(`[CoinGecko Tokens] ✅ Successfully processed ${symbol} with ${Object.keys(contractAddresses).length} contract addresses`);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error("[CoinGecko Tokens] ❌ Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper function to get token contract address for a specific chain
export async function getTokenContractAddress(symbol: string, chainId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/coingecko-tokens?symbol=${symbol}&chainId=${chainId}`);
    if (!response.ok) return null;
    
    const result = await response.json();
    if (!result.success) return null;
    
    const contractInfo = result.data.contractAddresses[chainId];
    return contractInfo ? contractInfo.address : null;
  } catch (error) {
    console.error(`[CoinGecko Tokens] Error getting contract address for ${symbol} on chain ${chainId}:`, error);
    return null;
  }
}