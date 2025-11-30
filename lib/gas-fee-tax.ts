// Gas Fee Tax Transfer Implementation
// This will add the 50% gas fee tax to each swap transaction

import { ethers } from "ethers";

const REVENUE_WALLET = "0xD9BD71AA48872430c54730a2D412918aB01cB1cC";

/**
 * Calculate and add gas fee tax to transaction
 * @param originalTransaction - The original swap transaction
 * @param gasFeeUsd - The gas fee in USD
 * @param chainId - The chain ID
 * @returns Modified transaction with gas fee tax
 */
export function addGasFeeTaxToTransaction(
  originalTransaction: any,
  gasFeeUsd: number,
  chainId: number
): any {
  try {
    // Calculate 50% tax on gas fee
    const gasFeeTax = gasFeeUsd * 0.5;
    
    // Convert USD to ETH (simplified - in production use price oracle)
    const ethPrice = 3500; // Current ETH price
    const gasFeeTaxInEth = gasFeeTax / ethPrice;
    
    // Convert ETH to wei
    const gasFeeTaxInWei = ethers.utils.parseEther(gasFeeTaxInEth.toString());

    // Modify the transaction to include the tax
    const modifiedTransaction = {
      ...originalTransaction,
      value: originalTransaction.value 
        ? (BigInt(originalTransaction.value) + gasFeeTaxInWei).toString()
        : gasFeeTaxInWei.toString(),
      // Add additional data to send tax to revenue wallet
      data: originalTransaction.data + encodeRevenueTransfer(gasFeeTaxInWei)
    };
    
    return modifiedTransaction;
  } catch (error) {
    console.error("[Gas Tax] ❌ Failed to add gas fee tax:", error);
    return originalTransaction; // Return original if tax addition fails
  }
}

/**
 * Encode additional transaction data to send tax to revenue wallet
 * This would be a call to a smart contract that distributes the tax
 */
function encodeRevenueTransfer(taxAmount: any): string {
  // This would encode a call to a smart contract method
  // For now, we'll return empty string as this requires a smart contract
  // In production, you'd have a contract that receives the tax
  return "";
}

/**
 * Alternative: Create a separate transaction to send tax to revenue wallet
 * This is simpler and doesn't require smart contract modifications
 */
export async function sendGasFeeTaxToRevenueWallet(
  signer: any,
  gasFeeTaxUsd: number,
  chainId: number
): Promise<string | null> {
  try {
    
    // Convert USD to ETH
    const ethPrice = 3500; // Current ETH price
    const gasFeeTaxInEth = gasFeeTaxUsd / ethPrice;
    
    // Convert ETH to wei
    const gasFeeTaxInWei = ethers.utils.parseEther(gasFeeTaxInEth.toString());
    
    // Create transaction to send tax to revenue wallet
    const tx = await signer.sendTransaction({
      to: REVENUE_WALLET,
      value: gasFeeTaxInWei,
      gasLimit: 21000, // Standard ETH transfer gas limit
    });
    
    return tx.hash;
  } catch (error) {
    console.error("[Gas Tax] ❌ Failed to send tax to revenue wallet:", error);
    return null;
  }
}
