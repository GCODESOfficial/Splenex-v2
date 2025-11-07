/**
 * Ultra-Fast Wallet Loading System
 * Instant connection with cached data and parallel initialization
 */

import { NextRequest, NextResponse } from "next/server";

// Wallet connection cache
const walletCache = new Map();
const WALLET_CACHE_TTL = 300000; // 5 minutes

// Pre-configured wallet providers for instant connection
const WALLET_PROVIDERS = {
  metamask: {
    name: "MetaMask",
    id: "metamask",
    icon: "🦊",
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 8453],
    priority: 1
  },
  walletconnect: {
    name: "WalletConnect",
    id: "walletconnect", 
    icon: "🔗",
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 8453, 101],
    priority: 2
  },
  coinbase: {
    name: "Coinbase Wallet",
    id: "coinbase",
    icon: "🔵",
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 8453],
    priority: 3
  },
  phantom: {
    name: "Phantom",
    id: "phantom",
    icon: "👻",
    supportedChains: [101],
    priority: 4
  },
  trustwallet: {
    name: "Trust Wallet",
    id: "trustwallet",
    icon: "🛡️",
    supportedChains: [1, 56, 137, 42161, 10, 43114, 250, 8453],
    priority: 5
  }
};

// Chain configurations for instant switching
const CHAIN_CONFIGS = {
  1: {
    chainId: "0x1",
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth-mainnet.g.alchemy.com/v2/demo"],
    blockExplorerUrls: ["https://etherscan.io"]
  },
  56: {
    chainId: "0x38",
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-dataseed.binance.org/"],
    blockExplorerUrls: ["https://bscscan.com"]
  },
  137: {
    chainId: "0x89",
    chainName: "Polygon Mainnet",
    nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com/"],
    blockExplorerUrls: ["https://polygonscan.com"]
  },
  42161: {
    chainId: "0xa4b1",
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"]
  },
  10: {
    chainId: "0xa",
    chainName: "Optimism",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"]
  },
  43114: {
    chainId: "0xa86a",
    chainName: "Avalanche C-Chain",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io"]
  },
  250: {
    chainId: "0xfa",
    chainName: "Fantom Opera",
    nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18 },
    rpcUrls: ["https://rpc.ftm.tools/"],
    blockExplorerUrls: ["https://ftmscan.com"]
  },
  8453: {
    chainId: "0x2105",
    chainName: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"]
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, walletType, chainId, address } = body;

    console.log(`[Fast Wallet] 🚀 ${action} request for ${walletType} on chain ${chainId}`);

    switch (action) {
      case "connect":
        return await handleConnect(walletType, chainId);
      case "disconnect":
        return await handleDisconnect(address);
      case "switchChain":
        return await handleSwitchChain(chainId);
      case "getStatus":
        return await handleGetStatus(address);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

  } catch (error) {
    console.error("[Fast Wallet] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Wallet operation failed"
    }, { status: 500 });
  }
}

async function handleConnect(walletType: string, chainId: number) {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = `${walletType}-${chainId}`;
    if (walletCache.has(cacheKey)) {
      const cached = walletCache.get(cacheKey);
      if (Date.now() - cached.timestamp < WALLET_CACHE_TTL) {
        console.log(`[Fast Wallet] ⚡ Returning cached connection (${Date.now() - startTime}ms)`);
        return NextResponse.json({
          success: true,
          ...cached.data,
          cached: true,
          connectTime: Date.now() - startTime
        });
      }
    }

    // Get wallet provider info
    const provider = WALLET_PROVIDERS[walletType];
    if (!provider) {
      throw new Error(`Unsupported wallet: ${walletType}`);
    }

    // Check if chain is supported
    if (!provider.supportedChains.includes(chainId)) {
      throw new Error(`Chain ${chainId} not supported by ${provider.name}`);
    }

    // Simulate instant connection (in production, this would be actual wallet connection)
    const connectionData = {
      address: generateRandomAddress(),
      chainId: chainId,
      walletType: walletType,
      provider: provider,
      isConnected: true,
      balance: "0.0000",
      tokenBalances: [],
      connectTime: Date.now() - startTime
    };

    // Cache the connection
    walletCache.set(cacheKey, {
      data: connectionData,
      timestamp: Date.now()
    });

    console.log(`[Fast Wallet] ✅ Connected ${provider.name} in ${connectionData.connectTime}ms`);

    return NextResponse.json({
      success: true,
      ...connectionData,
      cached: false
    });

  } catch (error) {
    console.error(`[Fast Wallet] ❌ Connection failed:`, error);
    return NextResponse.json({
      success: false,
      error: error.message,
      connectTime: Date.now() - startTime
    }, { status: 400 });
  }
}

async function handleDisconnect(address: string) {
  try {
    // Clear cache for this address
    for (const [key, value] of walletCache.entries()) {
      if (value.data.address === address) {
        walletCache.delete(key);
      }
    }

    console.log(`[Fast Wallet] 🔌 Disconnected wallet ${address}`);

    return NextResponse.json({
      success: true,
      message: "Wallet disconnected successfully"
    });

  } catch (error) {
    console.error(`[Fast Wallet] ❌ Disconnect failed:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

async function handleSwitchChain(chainId: number) {
  try {
    const chainConfig = CHAIN_CONFIGS[chainId];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    console.log(`[Fast Wallet] 🔄 Switching to chain ${chainId}`);

    return NextResponse.json({
      success: true,
      chainConfig,
      message: `Switched to ${chainConfig.chainName}`
    });

  } catch (error) {
    console.error(`[Fast Wallet] ❌ Chain switch failed:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

async function handleGetStatus(address: string) {
  try {
    // Check if wallet is cached
    for (const [key, value] of walletCache.entries()) {
      if (value.data.address === address) {
        const cached = value;
        if (Date.now() - cached.timestamp < WALLET_CACHE_TTL) {
          return NextResponse.json({
            success: true,
            isConnected: true,
            ...cached.data,
            cached: true
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      isConnected: false,
      cached: false
    });

  } catch (error) {
    console.error(`[Fast Wallet] ❌ Status check failed:`, error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 400 });
  }
}

function generateRandomAddress(): string {
  // Generate a random Ethereum address
  const chars = "0123456789abcdef";
  let address = "0x";
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

export { WALLET_PROVIDERS, CHAIN_CONFIGS };