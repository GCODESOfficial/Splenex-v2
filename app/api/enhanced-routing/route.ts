/**
 * Ultra-Fast Balance Fetching System
 * Parallel fetching with caching and optimization
 */

import { NextRequest, NextResponse } from "next/server";

// Balance cache with TTL
const balanceCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

// Chain-specific RPC endpoints for faster access
const CHAIN_RPC_ENDPOINTS = {
  1: "https://eth-mainnet.g.alchemy.com/v2/demo",
  56: "https://bsc-dataseed.binance.org/",
  137: "https://polygon-rpc.com/",
  42161: "https://arb1.arbitrum.io/rpc",
  10: "https://mainnet.optimism.io",
  43114: "https://api.avax.network/ext/bc/C/rpc",
  250: "https://rpc.ftm.tools/",
  8453: "https://mainnet.base.org",
  101: "https://api.mainnet-beta.solana.com"
};

// Common token contracts for each chain
const COMMON_TOKENS_BY_CHAIN = {
  1: [ // Ethereum
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
    "0x6B175474E89094C44Da98b954EedeAC495271d0F", // DAI
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933", // PEPE
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", // SHIB
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E", // FLOKI
  ],
  56: [ // BSC
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USDC
    "0x55d398326f99059fF775485246999027B3197955", // USDT
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56", // BUSD
    "0xda1060158f7d593667cce0a15db346bb3ffb3596", // TWC
    "0x4b0f1812e5df2a09796481ff14017e6005508003", // TWT
  ],
  137: [ // Polygon
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // USDC
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", // USDT
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", // DAI
  ],
  42161: [ // Arbitrum
    "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC
    "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
  ],
  10: [ // Optimism
    "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // USDC
    "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT
  ],
  43114: [ // Avalanche
    "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // USDC
    "0xc7198437980c041c805A1EDcbA50c1Ce5db95118", // USDT
  ],
  250: [ // Fantom
    "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", // USDC
  ],
  8453: [ // Base
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
  ],
  101: [ // Solana
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263", // BONK
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R", // RAY
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!address) {
      return NextResponse.json({ error: "Address required" }, { status: 400 });
    }

    console.log(`[Fast Balance] 🚀 Fetching balances for ${address} on chain ${chainId}`);

    // Check cache first
    const cacheKey = `${address}-${chainId}`;
    if (!forceRefresh && balanceCache.has(cacheKey)) {
      const cached = balanceCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Fast Balance] ⚡ Returning cached balances (${cached.balances.length} tokens)`);
        return NextResponse.json({
          success: true,
          balances: cached.balances,
          cached: true,
          timestamp: cached.timestamp
        });
      }
    }

    // Fetch balances in parallel
    const startTime = Date.now();
    const balances = await fetchBalancesParallel(address, chainId);
    const fetchTime = Date.now() - startTime;

    console.log(`[Fast Balance] ✅ Fetched ${balances.length} balances in ${fetchTime}ms`);

    // Cache the results
    balanceCache.set(cacheKey, {
      balances,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      balances,
      cached: false,
      fetchTime,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error("[Fast Balance] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Balance fetch failed"
    }, { status: 500 });
  }
}

async function fetchBalancesParallel(address: string, chainId: number) {
  const tokens = COMMON_TOKENS_BY_CHAIN[chainId] || [];
  
  if (chainId === 101) {
    // Solana-specific fetching
    return await fetchSolanaBalances(address, tokens);
  } else {
    // EVM chain fetching
    return await fetchEVMBalances(address, chainId, tokens);
  }
}

async function fetchEVMBalances(address: string, chainId: number, tokens: string[]) {
  const rpcUrl = CHAIN_RPC_ENDPOINTS[chainId];
  if (!rpcUrl) {
    throw new Error(`Unsupported chain: ${chainId}`);
  }

  // Fetch native balance and token balances in parallel
  const [nativeBalance, tokenBalances] = await Promise.all([
    fetchNativeBalance(address, rpcUrl),
    fetchTokenBalances(address, tokens, rpcUrl)
  ]);

  const balances = [];

  // Add native balance
  if (nativeBalance && parseFloat(nativeBalance) > 0) {
    balances.push({
      symbol: getNativeSymbol(chainId),
      name: getNativeName(chainId),
      address: "native",
      balance: nativeBalance,
      usdValue: 0, // Will be calculated separately
      decimals: 18,
      chain: getChainName(chainId)
    });
  }

  // Add token balances
  balances.push(...tokenBalances);

  return balances;
}

async function fetchSolanaBalances(address: string, tokens: string[]) {
  try {
    const response = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          {
            programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
          },
          {
            encoding: "jsonParsed"
          }
        ]
      })
    });

    const data = await response.json();
    
    if (!data.result || !data.result.value) {
      return [];
    }

    const balances = [];
    
    for (const account of data.result.value) {
      const tokenInfo = account.account.data.parsed.info;
      const balance = parseFloat(tokenInfo.tokenAmount.uiAmountString || "0");
      
      if (balance > 0) {
        balances.push({
          symbol: getTokenSymbol(tokenInfo.mint),
          name: getTokenName(tokenInfo.mint),
          address: tokenInfo.mint,
          balance: balance.toString(),
          usdValue: 0,
          decimals: tokenInfo.tokenAmount.decimals,
          chain: "Solana"
        });
      }
    }

    return balances;
  } catch (error) {
    console.error("[Fast Balance] Solana fetch error:", error);
    return [];
  }
}

async function fetchNativeBalance(address: string, rpcUrl: string): Promise<string> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1
      })
    });

    const data = await response.json();
    const wei = BigInt(data.result || "0");
    const eth = Number(wei) / Math.pow(10, 18);
    
    return eth.toFixed(6);
  } catch (error) {
    console.error("[Fast Balance] Native balance error:", error);
    return "0";
  }
}

async function fetchTokenBalances(address: string, tokens: string[], rpcUrl: string) {
  // Create batch request for all tokens
  const batchRequests = tokens.map((token, index) => ({
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: token,
        data: `0x70a08231000000000000000000000000${address.slice(2)}`
      },
      "latest"
    ],
    id: index + 1
  }));

  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(batchRequests)
    });

    const results = await response.json();
    const balances = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.result && result.result !== "0x") {
        const balance = BigInt(result.result);
        const decimals = getTokenDecimals(tokens[i]);
        const formattedBalance = Number(balance) / Math.pow(10, decimals);
        
        if (formattedBalance > 0.000001) { // Only include meaningful balances
          balances.push({
            symbol: getTokenSymbol(tokens[i]),
            name: getTokenName(tokens[i]),
            address: tokens[i],
            balance: formattedBalance.toFixed(6),
            usdValue: 0,
            decimals,
            chain: getChainName(1) // Will be updated based on chainId
          });
        }
      }
    }

    return balances;
  } catch (error) {
    console.error("[Fast Balance] Token balance error:", error);
    return [];
  }
}

function getNativeSymbol(chainId: number): string {
  const symbols = {
    1: "ETH",
    56: "BNB", 
    137: "MATIC",
    42161: "ETH",
    10: "ETH",
    43114: "AVAX",
    250: "FTM",
    8453: "ETH"
  };
  return symbols[chainId] || "ETH";
}

function getNativeName(chainId: number): string {
  const names = {
    1: "Ethereum",
    56: "BNB",
    137: "Polygon",
    42161: "Ethereum",
    10: "Ethereum", 
    43114: "Avalanche",
    250: "Fantom",
    8453: "Ethereum"
  };
  return names[chainId] || "Ethereum";
}

function getChainName(chainId: number): string {
  const names = {
    1: "Ethereum",
    56: "BSC",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    43114: "Avalanche",
    250: "Fantom",
    8453: "Base",
    101: "Solana"
  };
  return names[chainId] || "Unknown";
}

function getTokenSymbol(address: string): string {
  // Token symbol mapping - in production, this would be fetched from contract
  const symbols = {
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "USDT",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": "DAI",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "WBTC",
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933": "PEPE",
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE": "SHIB",
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E": "FLOKI",
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": "USDC",
    "0x55d398326f99059fF775485246999027B3197955": "USDT",
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": "BUSD",
    "0xda1060158f7d593667cce0a15db346bb3ffb3596": "TWC",
    "0x4b0f1812e5df2a09796481ff14017e6005508003": "TWT",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USDC",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "USDT",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "BONK",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY"
  };
  return symbols[address] || "UNKNOWN";
}

function getTokenName(address: string): string {
  const names = {
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USD Coin",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": "Tether USD",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": "Dai Stablecoin",
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": "Wrapped Bitcoin",
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933": "Pepe",
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE": "Shiba Inu",
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E": "Floki",
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": "USD Coin",
    "0x55d398326f99059fF775485246999027B3197955": "Tether USD",
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": "Binance USD",
    "0xda1060158f7d593667cce0a15db346bb3ffb3596": "Tiwi Token",
    "0x4b0f1812e5df2a09796481ff14017e6005508003": "Trust Wallet Token",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": "USD Coin",
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": "Tether USD",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": "Bonk",
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "Raydium"
  };
  return names[address] || "Unknown Token";
}

function getTokenDecimals(address: string): number {
  const decimals = {
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": 6, // USDC
    "0xdAC17F958D2ee523a2206206994597C13D831ec7": 6, // USDT
    "0x6B175474E89094C44Da98b954EedeAC495271d0F": 18, // DAI
    "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599": 8, // WBTC
    "0x6982508145454Ce325dDbE47a25d4ec3d2311933": 18, // PEPE
    "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE": 18, // SHIB
    "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E": 9, // FLOKI
    "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d": 18, // USDC BSC
    "0x55d398326f99059fF775485246999027B3197955": 18, // USDT BSC
    "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56": 18, // BUSD
    "0xda1060158f7d593667cce0a15db346bb3ffb3596": 18, // TWC
    "0x4b0f1812e5df2a09796481ff14017e6005508003": 18, // TWT
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v": 6, // USDC Solana
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB": 6, // USDT Solana
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": 5, // BONK
    "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": 6 // RAY
  };
  return decimals[address] || 18;
}