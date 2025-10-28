import { ethers } from "ethers";

// Deployed contract addresses (will be updated after deployment)
const REVENUE_COLLECTOR_ADDRESSES: { [chainId: number]: string } = {
  // These addresses will be populated after deployment
  // Example:
  // 1: "0x...", // Ethereum Mainnet
  // 56: "0x...", // BSC Mainnet
  // 137: "0x...", // Polygon Mainnet
  // 42161: "0x...", // Arbitrum One
  // 10: "0x...", // Optimism
  // 8453: "0x...", // Base
};

// Contract ABI for SplenexRevenueCollector
const REVENUE_COLLECTOR_ABI = [
  "constructor(address _revenueWallet)",
  "receive() external payable",
  "function revenueWallet() view returns (address)",
  "function owner() view returns (address)",
  "function withdrawStuckFunds() external",
  "event RevenueCollected(address indexed user, uint256 taxAmount, uint256 swapAmount)"
];

/**
 * Check if RevenueCollector is deployed on the current chain
 */
export async function isRevenueCollectorDeployed(chainId: number): Promise<string | null> {
  const address = REVENUE_COLLECTOR_ADDRESSES[chainId];
  if (address && address !== ethers.ZeroAddress) {
    // Basic check to ensure it's a valid address format
    if (ethers.isAddress(address)) {
      return address;
    }
  }
  return null;
}

/**
 * Create transaction data for routing through RevenueCollector
 */
export function createRevenueCollectorTransaction(
  targetDexAddress: string,
  swapCallData: string,
  originalSwapValue: string,
  revenueWallet: string,
  revenueAmountInNativeToken: number,
  chainId: number
): { to: string; data: string; value: string } {
  const collectorAddress = REVENUE_COLLECTOR_ADDRESSES[chainId];
  if (!collectorAddress || collectorAddress === ethers.ZeroAddress) {
    throw new Error(`RevenueCollector not deployed on chain ${chainId}`);
  }

  // For now, we'll use the receive function which automatically splits the value
  // The contract will receive the total value and split it between tax and swap
  const totalValueWei = BigInt(originalSwapValue) + BigInt(Math.floor(revenueAmountInNativeToken * Math.pow(10, 18)));
  const totalValueHex = "0x" + totalValueWei.toString(16);

  return {
    to: collectorAddress,
    data: "0x", // Empty data triggers receive() function
    value: totalValueHex,
  };
}

/**
 * Calculate total transaction value including revenue tax
 */
export function calculateTotalTransactionValueWithRevenue(
  originalSwapValue: string,
  revenueAmountInNativeToken: number,
  chainId: number
): string {
  const originalValueWei = BigInt(originalSwapValue);
  const revenueAmountWei = BigInt(Math.floor(revenueAmountInNativeToken * Math.pow(10, 18)));
  const totalValueWei = originalValueWei + revenueAmountWei;
  return "0x" + totalValueWei.toString(16);
}

/**
 * Update contract addresses after deployment
 */
export function updateContractAddresses(newAddresses: { [chainId: number]: string }) {
  Object.assign(REVENUE_COLLECTOR_ADDRESSES, newAddresses);
  console.log("✅ RevenueCollector addresses updated:", REVENUE_COLLECTOR_ADDRESSES);
}

/**
 * Get contract address for a specific chain
 */
export function getContractAddress(chainId: number): string | null {
  return REVENUE_COLLECTOR_ADDRESSES[chainId] || null;
}

/**
 * Get all deployed contract addresses
 */
export function getAllContractAddresses(): { [chainId: number]: string } {
  return { ...REVENUE_COLLECTOR_ADDRESSES };
}