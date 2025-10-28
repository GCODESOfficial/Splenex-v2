// Optimized swap execution with pre-approval and gas optimization
import { ethers } from 'ethers';
import { performanceMonitor } from './performance-optimizer';

export interface OptimizedSwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  fromAddress: string;
  dexName: string;
  swapData: string;
  rpcUrl: string;
  slippage?: number;
}

export interface SwapOptimization {
  needsApproval: boolean;
  currentAllowance: string;
  gasEstimate: string;
  optimizedGasPrice: string;
  estimatedGasCost: string;
}

/**
 * Pre-optimize swap parameters for faster execution
 */
export async function optimizeSwapExecution(
  params: OptimizedSwapParams
): Promise<SwapOptimization> {
  const stopTiming = performanceMonitor.startTiming('swap_optimization');
  
  try {
    console.log('[SwapOptimizer] 🔍 Pre-optimizing swap parameters...');
    
    // Check approval status in parallel with gas estimation
    const [approvalCheck, gasEstimate] = await Promise.all([
      checkTokenApproval(params.tokenIn, params.fromAddress, params.amountIn, params.rpcUrl),
      estimateSwapGas(params, params.rpcUrl)
    ]);
    
    // Get optimized gas price
    const optimizedGasPrice = await getOptimizedGasPrice(params.rpcUrl);
    
    // Calculate estimated gas cost
    const gasCostWei = BigInt(gasEstimate) * BigInt(optimizedGasPrice);
    const estimatedGasCost = ethers.utils.formatEther(gasCostWei);
    
    const optimization: SwapOptimization = {
      needsApproval: approvalCheck.needsApproval,
      currentAllowance: approvalCheck.currentAllowance,
      gasEstimate,
      optimizedGasPrice,
      estimatedGasCost,
    };
    
    console.log('[SwapOptimizer] ✅ Optimization complete:', {
      needsApproval: optimization.needsApproval,
      gasEstimate: optimization.gasEstimate,
      estimatedCost: optimization.estimatedGasCost
    });
    
    return optimization;
  } finally {
    stopTiming();
  }
}

/**
 * Check if token approval is needed
 */
async function checkTokenApproval(
  tokenAddress: string,
  walletAddress: string,
  amount: string,
  rpcUrl: string
): Promise<{ needsApproval: boolean; currentAllowance: string }> {
  try {
    // Check current allowance
    const allowanceResponse = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: tokenAddress,
            data: `0xdd62ed3e000000000000000000000000${walletAddress.substring(2)}000000000000000000000000${process.env.SPLENEX_CONTRACT_ADDRESS?.substring(2) || '0'}`,
          },
          "latest",
        ],
        id: 1,
      }),
    });

    const allowanceData = await allowanceResponse.json();
    const currentAllowance = allowanceData.result || "0x0";
    const needsApproval = BigInt(currentAllowance) < BigInt(amount);

    return { needsApproval, currentAllowance };
  } catch (error) {
    console.error('[SwapOptimizer] Approval check failed:', error);
    return { needsApproval: true, currentAllowance: "0x0" };
  }
}

/**
 * Estimate gas for swap transaction
 */
async function estimateSwapGas(
  params: OptimizedSwapParams,
  rpcUrl: string
): Promise<string> {
  try {
    const transactionData = {
      from: params.fromAddress,
      to: process.env.SPLENEX_CONTRACT_ADDRESS,
      data: encodeSwapData(params),
      value: params.tokenIn === ethers.constants.AddressZero ? params.amountIn : "0x0",
    };

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_estimateGas",
        params: [transactionData],
        id: 1,
      }),
    });

    const data = await response.json();
    return data.result || "0x5208"; // Default 21,000 gas
  } catch (error) {
    console.error('[SwapOptimizer] Gas estimation failed:', error);
    return "0x5208"; // Default gas limit
  }
}

/**
 * Get optimized gas price
 */
async function getOptimizedGasPrice(rpcUrl: string): Promise<string> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });

    const data = await response.json();
    const gasPrice = BigInt(data.result || "0x0");
    
    // Add 10% buffer for faster confirmation
    const optimizedGasPrice = gasPrice + (gasPrice / BigInt(10));
    
    return "0x" + optimizedGasPrice.toString(16);
  } catch (error) {
    console.error('[SwapOptimizer] Gas price fetch failed:', error);
    return "0x0"; // Will use default
  }
}

/**
 * Encode swap data for gas estimation
 */
function encodeSwapData(params: OptimizedSwapParams): string {
  // This would encode the actual swap function call
  // For now, return a placeholder
  return "0x";
}

/**
 * Execute optimized swap with pre-calculated parameters
 */
export async function executeOptimizedSwap(
  params: OptimizedSwapParams,
  optimization: SwapOptimization,
  signer: ethers.Signer
): Promise<string> {
  const stopTiming = performanceMonitor.startTiming('swap_execution');
  
  try {
    console.log('[SwapOptimizer] 🚀 Executing optimized swap...');
    
    const contract = new ethers.Contract(
      process.env.SPLENEX_CONTRACT_ADDRESS || '',
      ['function swapWithDEX(address,address,uint256,uint256,string,bytes)'],
      signer
    );

    // Execute swap with optimized gas parameters
    const tx = await contract.swapWithDEX(
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.minAmountOut,
      params.dexName,
      params.swapData,
      {
        gasLimit: optimization.gasEstimate,
        gasPrice: optimization.optimizedGasPrice,
      }
    );

    console.log('[SwapOptimizer] ✅ Swap transaction sent:', tx.hash);
    
    // Wait for confirmation with timeout
    const receipt = await Promise.race([
      tx.wait(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout')), 120000) // 2min timeout
      )
    ]);
    
    console.log('[SwapOptimizer] ✅ Swap confirmed:', receipt.transactionHash);
    return receipt.transactionHash;
  } catch (error) {
    console.error('[SwapOptimizer] ❌ Swap failed:', error);
    throw error;
  } finally {
    stopTiming();
  }
}

/**
 * Batch multiple swaps for efficiency
 */
export async function executeBatchSwaps(
  swaps: OptimizedSwapParams[],
  signer: ethers.Signer
): Promise<string[]> {
  console.log(`[SwapOptimizer] 🔄 Executing ${swaps.length} batch swaps...`);
  
  const results: string[] = [];
  
  // Process swaps in parallel batches
  const BATCH_SIZE = 3;
  for (let i = 0; i < swaps.length; i += BATCH_SIZE) {
    const batch = swaps.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (swap) => {
      const optimization = await optimizeSwapExecution(swap);
      return executeOptimizedSwap(swap, optimization, signer);
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('[SwapOptimizer] Batch swap failed:', result.reason);
      }
    });
  }
  
  console.log(`[SwapOptimizer] ✅ Batch swaps completed: ${results.length}/${swaps.length}`);
  return results;
}

/**
 * Pre-approve token for faster future swaps
 */
export async function preApproveToken(
  tokenAddress: string,
  amount: string,
  signer: ethers.Signer
): Promise<string> {
  console.log('[SwapOptimizer] 🔐 Pre-approving token...');
  
  try {
    const contract = new ethers.Contract(
      tokenAddress,
      ['function approve(address,uint256) returns (bool)'],
      signer
    );

    const tx = await contract.approve(
      process.env.SPLENEX_CONTRACT_ADDRESS,
      amount,
      {
        gasLimit: "0x186a0", // 100,000 gas
      }
    );

    console.log('[SwapOptimizer] ✅ Pre-approval sent:', tx.hash);
    
    const receipt = await tx.wait();
    console.log('[SwapOptimizer] ✅ Pre-approval confirmed:', receipt.transactionHash);
    
    return receipt.transactionHash;
  } catch (error) {
    console.error('[SwapOptimizer] ❌ Pre-approval failed:', error);
    throw error;
  }
}

/**
 * Smart slippage calculation based on market conditions
 */
export function calculateOptimalSlippage(
  tokenPair: string,
  amount: string,
  marketVolatility: number = 0.5
): number {
  const baseSlippage = 0.5; // 0.5% base slippage
  const volatilityMultiplier = 1 + (marketVolatility * 0.1);
  const amountMultiplier = Math.min(1 + (parseFloat(amount) / 10000), 2); // Higher amounts = higher slippage
  
  const optimalSlippage = baseSlippage * volatilityMultiplier * amountMultiplier;
  
  // Cap at 5% maximum slippage
  return Math.min(optimalSlippage, 5);
}

/**
 * Get real-time gas price recommendations
 */
export async function getGasPriceRecommendation(rpcUrl: string): Promise<{
  slow: string;
  standard: string;
  fast: string;
}> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 1,
      }),
    });

    const data = await response.json();
    const baseGasPrice = BigInt(data.result || "0x0");
    
    return {
      slow: "0x" + (baseGasPrice * BigInt(9) / BigInt(10)).toString(16), // 90% of base
      standard: "0x" + baseGasPrice.toString(16), // 100% of base
      fast: "0x" + (baseGasPrice * BigInt(12) / BigInt(10)).toString(16), // 120% of base
    };
  } catch (error) {
    console.error('[SwapOptimizer] Gas price recommendation failed:', error);
    return {
      slow: "0x0",
      standard: "0x0", 
      fast: "0x0",
    };
  }
}
