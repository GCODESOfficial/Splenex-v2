// Smart Contract Integration for Single-Signature Revenue Collection
// This integrates with the deployed SplenexRevenueCollector contract

import { ethers } from "ethers";

// Contract addresses for each chain (update after deployment)
const REVENUE_CONTRACT_ADDRESSES: { [chainId: number]: string } = {
  1: "0x0000000000000000000000000000000000000000", // Ethereum - Update after deployment
  56: "0x0000000000000000000000000000000000000000", // BSC - Update after deployment
  137: "0x0000000000000000000000000000000000000000", // Polygon - Update after deployment
  43114: "0x0000000000000000000000000000000000000000", // Avalanche - Update after deployment
  250: "0x0000000000000000000000000000000000000000", // Fantom - Update after deployment
  42161: "0x0000000000000000000000000000000000000000", // Arbitrum - Update after deployment
  10: "0x0000000000000000000000000000000000000000", // Optimism - Update after deployment
  8453: "0x0000000000000000000000000000000000000000", // Base - Update after deployment
};

// Contract ABI (minimal interface)
const REVENUE_COLLECTOR_ABI = [
  "function collectRevenueFromSwap(address swapContract, uint256 minAmountOut) external payable",
  "function getRevenueWallet() external pure returns (address)",
  "function getRevenuePercentage() external pure returns (uint256)",
  "function getBalance() external view returns (uint256)",
  "event RevenueCollected(address indexed user, address indexed swapContract, uint256 swapAmount, uint256 revenueAmount, uint256 totalAmount, bytes32 indexed txHash)"
];

/**
 * Calculate total transaction value including revenue tax
 * @param originalValue - Original swap value in wei
 * @param gasFeeUsd - Gas fee in USD
 * @param chainId - Chain ID
 * @returns Total value including tax in wei
 */
export async function calculateTotalTransactionValueWithRevenue(
  originalValue: string,
  gasFeeUsd: number,
  chainId: number
): Promise<string> {
  try {
    if (gasFeeUsd <= 0) {
      return originalValue;
    }

    // Calculate 50% tax on gas fee
    const gasFeeTax = gasFeeUsd * 0.5;
    
    // Get native token symbol and price
    const nativeTokenSymbol = getNativeTokenSymbol(chainId);
    const tokenPrice = await getTokenPrice(nativeTokenSymbol);
    
    if (tokenPrice === 0) {
      console.warn(`[Revenue] Could not get price for ${nativeTokenSymbol}, using original value`);
      return originalValue;
    }
    
    // Convert USD to native token
    const gasFeeTaxInToken = gasFeeTax / tokenPrice;
    const taxValueWei = BigInt(Math.floor(gasFeeTaxInToken * Math.pow(10, 18)));
    const originalValueWei = BigInt(originalValue);
    const totalValueWei = originalValueWei + taxValueWei;
    
    console.log(`[Revenue] 💰 Transaction value calculation:`);
    console.log(`[Revenue] Original value: ${originalValue}`);
    console.log(`[Revenue] Tax value: ${gasFeeTaxInToken.toFixed(6)} ${nativeTokenSymbol}`);
    console.log(`[Revenue] Total value: 0x${totalValueWei.toString(16)}`);
    
    return "0x" + totalValueWei.toString(16);
  } catch (error) {
    console.error("[Revenue] Error calculating total transaction value:", error);
    return originalValue;
  }
}

/**
 * Create a transaction that routes through the revenue collector contract
 * @param originalTransaction - The original swap transaction
 * @param gasFeeUsd - Gas fee in USD
 * @param chainId - Chain ID
 * @returns Modified transaction that routes through revenue collector
 */
export function createRevenueCollectorTransaction(
  originalTransaction: any,
  gasFeeUsd: number,
  chainId: number
): any {
  const revenueContractAddress = REVENUE_CONTRACT_ADDRESSES[chainId];
  
  if (!revenueContractAddress || revenueContractAddress === "0x0000000000000000000000000000000000000000") {
    console.warn(`[Revenue] No revenue collector contract deployed on chain ${chainId}, using original transaction`);
    return originalTransaction;
  }
  
  // Calculate total value including revenue tax
  const gasFeeTax = gasFeeUsd * 0.5;
  const nativeTokenSymbol = getNativeTokenSymbol(chainId);
  
  console.log(`[Revenue] 🚀 Routing transaction through revenue collector:`);
  console.log(`[Revenue] Contract: ${revenueContractAddress}`);
  console.log(`[Revenue] Original to: ${originalTransaction.to}`);
  console.log(`[Revenue] Revenue tax: $${gasFeeTax.toFixed(2)}`);
  console.log(`[Revenue] Native token: ${nativeTokenSymbol}`);
  
  // Create transaction data for revenue collector
  const contractInterface = new ethers.utils.Interface(REVENUE_COLLECTOR_ABI);
  const encodedData = contractInterface.encodeFunctionData("collectRevenueFromSwap", [
    originalTransaction.to, // The original swap contract
    0 // minAmountOut (can be 0 for now)
  ]);
  
  return {
    ...originalTransaction,
    to: revenueContractAddress, // Route through revenue collector
    data: encodedData, // Call collectRevenueFromSwap function
    // Value will be calculated by calculateTotalTransactionValueWithRevenue
  };
}

/**
 * Get native token symbol for chain
 */
function getNativeTokenSymbol(chainId: number): string {
  const chainTokens: { [chainId: number]: string } = {
    1: "ETH", 56: "BNB", 137: "MATIC", 43114: "AVAX",
    250: "FTM", 42161: "ARB", 10: "OP", 8453: "BASE",
  };
  return chainTokens[chainId] || "ETH";
}

/**
 * Get real-time token price from CoinGecko
 */
async function getTokenPrice(tokenSymbol: string): Promise<number> {
  try {
    const coinIdMap: { [symbol: string]: string } = {
      "ETH": "ethereum", "BNB": "binancecoin", "MATIC": "matic-network",
      "AVAX": "avalanche-2", "FTM": "fantom", "ARB": "arbitrum",
      "OP": "optimism", "BASE": "base",
    };
    
    const coinId = coinIdMap[tokenSymbol.toUpperCase()] || tokenSymbol.toLowerCase();
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`);
    const data = await response.json();
    
    return data[coinId]?.usd || 0;
  } catch (error) {
    console.error(`[Price] Failed to get price for ${tokenSymbol}:`, error);
    return 0;
  }
}

/**
 * Check if revenue collector is deployed on a chain
 */
export function isRevenueCollectorDeployed(chainId: number): boolean {
  const address = REVENUE_CONTRACT_ADDRESSES[chainId];
  return address && address !== "0x0000000000000000000000000000000000000000";
}

/**
 * Get revenue collector address for a chain
 */
export function getRevenueCollectorAddress(chainId: number): string | null {
  const address = REVENUE_CONTRACT_ADDRESSES[chainId];
  return address && address !== "0x0000000000000000000000000000000000000000" ? address : null;
}
