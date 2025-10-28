// Revenue configuration
export const REVENUE_CONFIG = {
  // Revenue wallet address that receives the 50% gas fee charge
  WALLET_ADDRESS: "0xD9BD71AA48872430c54730a2D412918aB01cB1cC",
  
  // Additional charge percentage (50% of gas fee)
  ADDITIONAL_CHARGE_PERCENTAGE: 0.5,
  
  // Supported chains and their native tokens
  SUPPORTED_CHAINS: {
    1: "ETH",      // Ethereum
    56: "BNB",     // BSC
    137: "MATIC",  // Polygon
    43114: "AVAX", // Avalanche
    250: "FTM",    // Fantom
    42161: "ARB",  // Arbitrum
    10: "OP",      // Optimism
    8453: "BASE",  // Base
  },
  
  // CoinGecko API configuration
  COINGECKO_API_URL: "https://api.coingecko.com/api/v3/simple/price",
  
  // Token symbol to CoinGecko ID mapping
  TOKEN_MAPPING: {
    "ETH": "ethereum",
    "BNB": "binancecoin", 
    "MATIC": "matic-network",
    "AVAX": "avalanche-2",
    "FTM": "fantom",
    "ARB": "arbitrum",
    "OP": "optimism",
    "BASE": "base",
  },
} as const;

/**
 * Calculate revenue from gas fee
 * @param gasFee - Original gas fee in USD
 * @returns Object containing total gas fee and revenue amount
 */
export function calculateGasRevenue(gasFee: number) {
  const additionalCharge = gasFee * REVENUE_CONFIG.ADDITIONAL_CHARGE_PERCENTAGE;
  const totalGasFee = gasFee + additionalCharge;
  const revenue = additionalCharge;
  
  return {
    originalGasFee: gasFee,
    additionalCharge,
    totalGasFee,
    revenue,
    revenueWallet: REVENUE_CONFIG.WALLET_ADDRESS,
  };
}
