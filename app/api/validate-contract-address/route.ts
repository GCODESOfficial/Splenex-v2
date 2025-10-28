import { NextRequest, NextResponse } from "next/server";

/**
 * Contract Address Validation API
 * Validates and corrects token contract addresses using CoinGecko
 * This ensures we always have the correct, verified contract addresses
 */

interface ContractValidationResult {
  symbol: string;
  name: string;
  correctAddress: string;
  chainId: number;
  chainName: string;
  decimals: number;
  logoURI: string;
  isVerified: boolean;
  source: string;
}

// Cache for contract validations
const validationCache = new Map<string, { data: ContractValidationResult; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol");
    const chainId = searchParams.get("chainId");
    const address = searchParams.get("address");

    if (!symbol) {
      return NextResponse.json({ 
        success: false, 
        error: "Symbol parameter is required" 
      }, { status: 400 });
    }

    const cacheKey = `${symbol.toLowerCase()}-${chainId || 'all'}-${address || 'none'}`;
    const cached = validationCache.get(cacheKey);
    const now = Date.now();

    // Return cached data if still valid
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`[Contract Validation] 📋 Returning cached validation for ${symbol}`);
      return NextResponse.json({ success: true, data: cached.data });
    }

    console.log(`[Contract Validation] 🔍 Validating contract address for ${symbol}...`);

    // CoinGecko coin ID mapping for common tokens
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
      
      // Wrapped tokens
      "WETH": "weth",
      "WBTC": "wrapped-bitcoin",
      "WBNB": "wbnb",
      
      // DeFi tokens
      "UNI": "uniswap",
      "AAVE": "aave",
      "LINK": "chainlink",
      "COMP": "compound-governance-token",
      "MKR": "maker",
      "CRV": "curve-dao-token",
      "SUSHI": "sushi",
      "1INCH": "1inch",
      
      // Meme tokens
      "DOGE": "dogecoin",
      "SHIB": "shiba-inu",
      "PEPE": "pepe",
      "FLOKI": "floki",
      "BONK": "bonk",
      "WEN": "wen",
      
      // BSC specific tokens
      "TWC": "tiwi-token",
      "TWT": "trust-wallet-token",
      "WKC": "wikicat",
      "CAKE": "pancakeswap-token",
      "BABYDOGE": "baby-doge-coin",
      
      // Solana tokens
      "RAY": "raydium",
      "SRM": "serum",
      "ORCA": "orca",
      "JUP": "jupiter-exchange-solana",
      
      // Cosmos tokens
      "OSMO": "osmosis",
      "JUNO": "juno-network",
      "SCRT": "secret",
      "AKT": "akash-network",
      "BAND": "band-protocol",
      "RUNE": "thorchain",
    };

    const coinId = coinIdMap[symbol.toUpperCase()];
    if (!coinId) {
      return NextResponse.json({
        success: false,
        error: `Unknown token symbol: ${symbol}`
      }, { status: 404 });
    }

    // Fetch token data from CoinGecko
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Splenex-DEX/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `CoinGecko API failed: ${response.status}`
      }, { status: response.status });
    }

    const tokenData = await response.json();
    
    // Platform to chain mapping
    const platformToChain: { [key: string]: { chainId: number; chainName: string } } = {
      "ethereum": { chainId: 1, chainName: "Ethereum" },
      "binance-smart-chain": { chainId: 56, chainName: "BSC" },
      "polygon-pos": { chainId: 137, chainName: "Polygon" },
      "arbitrum-one": { chainId: 42161, chainName: "Arbitrum" },
      "optimistic-ethereum": { chainId: 10, chainName: "Optimism" },
      "avalanche": { chainId: 43114, chainName: "Avalanche" },
      "base": { chainId: 8453, chainName: "Base" },
      "fantom": { chainId: 250, chainName: "Fantom" },
      "solana": { chainId: 101, chainName: "Solana" },
      "cosmos": { chainId: 99999, chainName: "Cosmos" },
    };

    const platforms = tokenData.platforms || {};
    const contractAddresses: ContractValidationResult[] = [];

    // Extract contract addresses for all platforms
    for (const [platform, contractAddress] of Object.entries(platforms)) {
      const chainInfo = platformToChain[platform];
      
      if (chainInfo && contractAddress && typeof contractAddress === 'string') {
        const decimals = getTokenDecimals(symbol.toUpperCase(), chainInfo.chainId);
        
        contractAddresses.push({
          symbol: symbol.toUpperCase(),
          name: tokenData.name,
          correctAddress: contractAddress,
          chainId: chainInfo.chainId,
          chainName: chainInfo.chainName,
          decimals: decimals,
          logoURI: tokenData.image?.small || tokenData.image?.thumb || '',
          isVerified: true,
          source: 'coingecko',
        });
      }
    }

    // If specific chain requested, filter results
    let result = contractAddresses;
    if (chainId) {
      const chainIdNum = parseInt(chainId);
      result = contractAddresses.filter(addr => addr.chainId === chainIdNum);
    }

    // If specific address provided, check if it matches
    if (address && result.length > 0) {
      const addressMatches = result.some(addr => 
        addr.correctAddress.toLowerCase() === address.toLowerCase()
      );
      
      if (!addressMatches) {
        console.log(`[Contract Validation] ⚠️ Address mismatch for ${symbol}: provided ${address}, correct ${result[0].correctAddress}`);
      }
    }

    if (result.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No contract addresses found for ${symbol}`
      }, { status: 404 });
    }

    // Cache the result
    validationCache.set(cacheKey, { data: result[0], timestamp: now });

    console.log(`[Contract Validation] ✅ Validated ${symbol}: ${result[0].correctAddress} on ${result[0].chainName}`);

    return NextResponse.json({
      success: true,
      data: result[0],
      allAddresses: contractAddresses, // Include all addresses for reference
    });

  } catch (error) {
    console.error("[Contract Validation] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Validation failed"
    }, { status: 500 });
  }
}

function getTokenDecimals(symbol: string, chainId: number): number {
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
    'BONK': 5,
    'PEPE': 18,
    'SHIB': 18,
    'FLOKI': 9,
  };
  
  return decimalsMap[symbol.toUpperCase()] || 18;
}
