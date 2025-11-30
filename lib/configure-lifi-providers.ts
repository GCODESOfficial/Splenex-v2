// Configure LiFi SDK with EVM providers
import { config } from '@lifi/sdk'

// Configure LiFi SDK with RPC providers for each chain
// This is required for balance fetching functionality
config.set({
  apiUrl: 'https://li.quest/v1',
  integrator: 'splenex',
  rpcUrls: {
    // Ethereum Mainnet
    1: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum.publicnode.com',
    ],
    // Binance Smart Chain
    56: [
      'https://bsc-dataseed.binance.org',
      'https://bsc.publicnode.com',
      'https://bsc.llamarpc.com',
      'https://rpc.ankr.com/bsc',
    ],
    // Polygon
    137: [
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
      'https://polygon.publicnode.com',
    ],
    // Arbitrum
    42161: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
      'https://arbitrum.publicnode.com',
    ],
    // Optimism
    10: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
      'https://optimism.publicnode.com',
    ],
    // Base
    8453: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
      'https://base.publicnode.com',
    ],
    // Avalanche
    43114: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.publicnode.com',
      'https://avax.meowrpc.com',
    ],
    // Fantom
    250: [
      'https://rpc.ftm.tools',
      'https://fantom.publicnode.com',
      'https://rpc.ankr.com/fantom',
    ],
  },
})

