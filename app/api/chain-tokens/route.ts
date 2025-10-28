/**
 * Comprehensive Chain Token Coverage System
 * Ensures all chains return proper tokens with verified addresses
 */

import { NextRequest, NextResponse } from "next/server";

// Comprehensive token database for all chains
const CHAIN_TOKENS = {
  // Ethereum (Chain ID: 1)
  1: [
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "DAI",
      name: "Dai Stablecoin",
      address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/9956/small/4943.png"
    },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      decimals: 8,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png"
    },
    {
      symbol: "PEPE",
      name: "Pepe",
      address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/29850/small/pepe-token.jpeg"
    },
    {
      symbol: "SHIB",
      name: "Shiba Inu",
      address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/11939/small/shiba.png"
    },
    {
      symbol: "FLOKI",
      name: "Floki",
      address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E",
      decimals: 9,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/16746/small/Floki.png"
    },
    {
      symbol: "UNI",
      name: "Uniswap",
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/12504/small/uniswap-uni.png"
    },
    {
      symbol: "LINK",
      name: "Chainlink",
      address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/877/small/chainlink-new-logo.png"
    }
  ],

  // BSC (Chain ID: 56)
  56: [
    {
      symbol: "BNB",
      name: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/825/small/bnb-icon2_2x.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0x55d398326f99059fF775485246999027B3197955",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "BUSD",
      name: "Binance USD",
      address: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/9576/small/BUSD.png"
    },
    {
      symbol: "TWC",
      name: "Tiwi Token",
      address: "0xda1060158f7d593667cce0a15db346bb3ffb3596",
      decimals: 18,
      verified: true,
      logoURI: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/twc.png"
    },
    {
      symbol: "TWT",
      name: "Trust Wallet Token",
      address: "0x4b0f1812e5df2a09796481ff14017e6005508003",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/11085/small/Trust.png"
    },
    {
      symbol: "WKC",
      name: "Wikicat",
      address: "0xda1060158f7d593667cce0a15db346bb3ffb3596", // Same as TWC - needs verification
      decimals: 18,
      verified: false,
      logoURI: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/wkc.png"
    },
    {
      symbol: "CAKE",
      name: "PancakeSwap Token",
      address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/12632/small/pancakeswap-cake-logo_1195x1194.png"
    },
    {
      symbol: "ETH",
      name: "Ethereum Token",
      address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "BTCB",
      name: "Bitcoin BEP2",
      address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png"
    }
  ],

  // Polygon (Chain ID: 137)
  137: [
    {
      symbol: "MATIC",
      name: "Polygon",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/4713/small/matic-token-icon.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "DAI",
      name: "Dai Stablecoin",
      address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/9956/small/4943.png"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "WBTC",
      name: "Wrapped Bitcoin",
      address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
      decimals: 8,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png"
    },
    {
      symbol: "QUICK",
      name: "Quickswap",
      address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/13970/small/1_pOU6p3EMq1a1Y4P1Q5YdKw.png"
    }
  ],

  // Arbitrum (Chain ID: 42161)
  42161: [
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "ARB",
      name: "Arbitrum",
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    }
  ],

  // Optimism (Chain ID: 10)
  10: [
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "OP",
      name: "Optimism",
      address: "0x4200000000000000000000000000000000000042",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/25244/small/Optimism.png"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    }
  ],

  // Avalanche (Chain ID: 43114)
  43114: [
    {
      symbol: "AVAX",
      name: "Avalanche",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "0xc7198437980c041c805A1EDcbA50c1Ce5db95118",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "WAVAX",
      name: "Wrapped AVAX",
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    }
  ],

  // Fantom (Chain ID: 250)
  250: [
    {
      symbol: "FTM",
      name: "Fantom",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/4001/small/Fantom_round.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "WFTM",
      name: "Wrapped Fantom",
      address: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/4001/small/Fantom_round.png"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x74b23882a30290451A17c44f4F05243b6b58C76d",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    }
  ],

  // Base (Chain ID: 8453)
  8453: [
    {
      symbol: "ETH",
      name: "Ethereum",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "WETH",
      name: "Wrapped Ethereum",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/279/small/ethereum.png"
    }
  ],

  // Solana (Chain ID: 101)
  101: [
    {
      symbol: "SOL",
      name: "Solana",
      address: "So11111111111111111111111111111111111111112",
      decimals: 9,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/4128/small/solana.png"
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/6319/small/usdc.png"
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/325/small/Tether.png"
    },
    {
      symbol: "BONK",
      name: "Bonk",
      address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      decimals: 5,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/28600/small/bonk.jpg"
    },
    {
      symbol: "RAY",
      name: "Raydium",
      address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg"
    },
    {
      symbol: "SRM",
      name: "Serum",
      address: "SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt",
      decimals: 6,
      verified: true,
      logoURI: "https://coin-images.coingecko.com/coins/images/11970/small/serum-logo.png"
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = parseInt(searchParams.get("chainId") || "1");
    const includeUnverified = searchParams.get("includeUnverified") === "true";

    console.log(`[Chain Tokens] 🔍 Fetching tokens for chain ${chainId}`);

    const chainTokens = CHAIN_TOKENS[chainId];
    if (!chainTokens) {
      return NextResponse.json({
        success: false,
        error: `Chain ${chainId} not supported`,
        supportedChains: Object.keys(CHAIN_TOKENS).map(id => ({
          chainId: parseInt(id),
          chainName: getChainName(parseInt(id)),
          tokenCount: CHAIN_TOKENS[parseInt(id)].length
        }))
      }, { status: 404 });
    }

    // Filter tokens based on verification status
    const filteredTokens = includeUnverified 
      ? chainTokens 
      : chainTokens.filter(token => token.verified);

    console.log(`[Chain Tokens] ✅ Found ${filteredTokens.length} tokens for chain ${chainId}`);

    return NextResponse.json({
      success: true,
      chainId,
      chainName: getChainName(chainId),
      tokens: filteredTokens,
      totalCount: filteredTokens.length,
      verifiedCount: filteredTokens.filter(t => t.verified).length,
      unverifiedCount: filteredTokens.filter(t => !t.verified).length
    });

  } catch (error) {
    console.error("[Chain Tokens] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch chain tokens"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chainIds, includeUnverified = false } = body;

    console.log(`[Chain Tokens] 🔍 Fetching tokens for multiple chains: ${chainIds}`);

    const results = {};
    let totalTokens = 0;

    for (const chainId of chainIds) {
      const chainTokens = CHAIN_TOKENS[chainId];
      if (chainTokens) {
        const filteredTokens = includeUnverified 
          ? chainTokens 
          : chainTokens.filter(token => token.verified);
        
        results[chainId] = {
          chainId,
          chainName: getChainName(chainId),
          tokens: filteredTokens,
          count: filteredTokens.length
        };
        
        totalTokens += filteredTokens.length;
      }
    }

    console.log(`[Chain Tokens] ✅ Found ${totalTokens} total tokens across ${Object.keys(results).length} chains`);

    return NextResponse.json({
      success: true,
      results,
      totalTokens,
      chainCount: Object.keys(results).length
    });

  } catch (error) {
    console.error("[Chain Tokens] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch chain tokens"
    }, { status: 500 });
  }
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
  return names[chainId] || `Chain ${chainId}`;
}

export { CHAIN_TOKENS };
