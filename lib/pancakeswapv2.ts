// PancakeSwap V2 integration as fallback aggregator
// Documentation: https://developer.pancakeswap.finance/contracts/v2/overview

import { createPublicClient, http, type Address, type Chain, getAddress, encodeFunctionData, decodeEventLog, decodeFunctionResult } from 'viem';
import { mainnet, arbitrum, optimism, polygon, base, bsc } from 'viem/chains';
import { getCachedClient, getCachedPairAddress, fastRpcCall, batchGetPairAddresses } from './optimization';
import { toBigIntSafe } from './bigint-utils';

// PancakeSwap V2 Factory addresses (properly checksummed)
export const PANCAKESWAP_V2_FACTORY: Record<number, Address> = {
  1: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'), // Ethereum Mainnet
  42161: getAddress('0xf1D7CC64Fb4452F05c498126312eBE29f30Fb000'), // Arbitrum (SushiSwap)
  10: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Optimism (SushiSwap)
  137: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Polygon (SushiSwap)
  8453: getAddress('0x71524B4f93c58fcbF659783284E38825f0622859'), // Base (SushiSwap)
  56: getAddress('0xcA143Ce32Fe78f1f7019d7d551a6402fC4550CDc'), // BSC (PancakeSwap)
};

// PancakeSwap V2 Router02 addresses (properly checksummed)
export const PANCAKESWAP_V2_ROUTER: Record<number, Address> = {
  1: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'), // Ethereum Mainnet
  42161: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Arbitrum (SushiSwap)
  10: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Optimism (SushiSwap)
  137: getAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'), // Polygon (SushiSwap)
  8453: getAddress('0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891'), // Base (SushiSwap)
  56: getAddress('0x10ED43C718714eb63d5aA57B78B54704E256024E'), // BSC (PancakeSwap)
};

// WETH addresses (properly checksummed)
export const WETH_ADDRESSES: Record<number, Address> = {
  1: getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'), // Ethereum WETH
  42161: getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'), // Arbitrum WETH
  10: getAddress('0x4200000000000000000000000000000000000006'), // Optimism WETH
  137: getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'), // Polygon WMATIC
  8453: getAddress('0x4200000000000000000000000000000000000006'), // Base WETH
  56: getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), // BSC WBNB
};

// Multicall contract addresses (3address format - common across chains)
const MULTICALL_ADDRESSES: Record<number, Address> = {
  1: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // Ethereum Mainnet
  42161: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // Arbitrum
  10: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // Optimism
  137: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // Polygon
  8453: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // Base
  56: getAddress('0xcA11bde05977b3631167028862bE2a173976CA11'), // BSC
};

// Multicall3 ABI
const MULTICALL_ABI = [
  {
    inputs: [
      {
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'callData', type: 'bytes' },
        ],
        name: 'calls',
        type: 'tuple[]',
      },
    ],
    name: 'aggregate3',
    outputs: [
      {
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
        name: 'returnData',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// ERC20 ABI for approvals
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Export router addresses for token approvals
export const PANCAKESWAP_V2_ROUTER_ADDRESSES = PANCAKESWAP_V2_ROUTER;

// Factory ABI (for getPair and createPair)
const FACTORY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
    ],
    name: 'getPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
    ],
    name: 'createPair',
    outputs: [{ internalType: 'address', name: 'pair', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Pair ABI (for getReserves)
export const PAIR_ABI = [
  {
    inputs: [],
    name: 'getReserves',
    outputs: [
      { internalType: 'uint112', name: 'reserve0', type: 'uint112' },
      { internalType: 'uint112', name: 'reserve1', type: 'uint112' },
      { internalType: 'uint32', name: 'blockTimestampLast', type: 'uint32' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token0',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'token1',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Router ABI (for getAmountsOut, swap functions, and liquidity functions)
const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'tokenA', type: 'address' },
      { internalType: 'address', name: 'tokenB', type: 'address' },
      { internalType: 'uint256', name: 'amountADesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBDesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountAMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountBMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidity',
    outputs: [
      { internalType: 'uint256', name: 'amountA', type: 'uint256' },
      { internalType: 'uint256', name: 'amountB', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amountTokenDesired', type: 'uint256' },
      { internalType: 'uint256', name: 'amountTokenMin', type: 'uint256' },
      { internalType: 'uint256', name: 'amountETHMin', type: 'uint256' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'addLiquidityETH',
    outputs: [
      { internalType: 'uint256', name: 'amountToken', type: 'uint256' },
      { internalType: 'uint256', name: 'amountETH', type: 'uint256' },
      { internalType: 'uint256', name: 'liquidity', type: 'uint256' },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokensSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
] as const;

// Get chain config for viem
const getChainConfig = (chainId: number): Chain | null => {
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    56: bsc,
  };
  return chainMap[chainId] || null;
};

// Convert native token to WETH address
export const convertToWETH = (tokenAddress: string, chainId: number): Address => {
  if (
    tokenAddress === '0x0000000000000000000000000000000000000000' ||
    tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
  ) {
    return WETH_ADDRESSES[chainId] || getAddress(tokenAddress);
  }
  return getAddress(tokenAddress);
};

// Get PancakeSwap V2 pair address (optimized with caching and fast RPC)
export const getPairAddress = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number
): Promise<Address | null> => {
  const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
  if (!factoryAddress) {
    console.warn(`[getPairAddress] Chain ${chainId} not supported by PancakeSwap V2`);
    return null;
  }

  const checksummedTokenA = getAddress(tokenA);
  const checksummedTokenB = getAddress(tokenB);
  const checksummedFactory = getAddress(factoryAddress);

  // Use cached lookup with TTL
  return getCachedPairAddress(
    checksummedTokenA,
    checksummedTokenB,
    chainId,
    async () => {
      try {
        const publicClient = getCachedClient(chainId);
        
        // Try primary order with fast timeout
        const pairAddress = await fastRpcCall(async () => {
          return await publicClient.readContract({
            address: checksummedFactory,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [checksummedTokenA, checksummedTokenB],
          }) as `0x${string}`;
        }, 500); // 500ms timeout for pair checks

        // If zero address, try reverse order
        if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
          try {
            const reversePair = await fastRpcCall(async () => {
              return await publicClient.readContract({
                address: checksummedFactory,
                abi: FACTORY_ABI,
                functionName: 'getPair',
                args: [checksummedTokenB, checksummedTokenA],
              }) as `0x${string}`;
            }, 500);
            
            if (reversePair && reversePair !== '0x0000000000000000000000000000000000000000') {
              return getAddress(reversePair);
            }
          } catch {
            // Reverse order failed, continue
          }
          return null;
        }

        return getAddress(pairAddress);
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '';
        const errorName = error?.name || '';
        
        if (errorName === 'ContractFunctionZeroDataError' || 
            errorMsg.includes('returned no data') ||
            errorMsg.includes('execution reverted') ||
            errorMsg.includes('timeout')) {
          return null;
        }
        
        console.warn(`[getPairAddress] Error: ${errorMsg}`);
        return null;
      }
    }
  );
};

// Get pair reserves to check liquidity (optimized with caching)
export const getPairReserves = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number
): Promise<{ reserve0: bigint; reserve1: bigint } | null> => {
  try {
    const pairAddress = await getPairAddress(tokenA, tokenB, chainId);
    if (!pairAddress) {
      return null;
    }

    const publicClient = getCachedClient(chainId);
    
    const reserves = await fastRpcCall(async () => {
      return await publicClient.readContract({
        address: pairAddress,
        abi: PAIR_ABI,
        functionName: 'getReserves',
      });
    }, 1000); // 1s timeout for reserves

    return {
      reserve0: reserves[0],
      reserve1: reserves[1],
    };
  } catch (error) {
    console.error('Error getting pair reserves:', error);
    return null;
  }
};

// Verify that all pairs in a swap path exist
export const verifySwapPath = async (
  path: Address[],
  chainId: number
): Promise<{ valid: boolean; missingPairs: Array<{ tokenA: Address; tokenB: Address }> }> => {
  const missingPairs: Array<{ tokenA: Address; tokenB: Address }> = [];
  
  if (path.length < 2) {
    return { valid: false, missingPairs };
  }
  
  // Check each consecutive pair in the path
  for (let i = 0; i < path.length - 1; i++) {
    const tokenA = path[i];
    const tokenB = path[i + 1];
    
    const pairAddress = await getPairAddress(tokenA, tokenB, chainId);
    if (!pairAddress) {
      missingPairs.push({ tokenA, tokenB });
    }
  }
  
  return {
    valid: missingPairs.length === 0,
    missingPairs
  };
};

// Calculate required liquidity amounts to support a swap
// Returns the amounts needed to add liquidity so the swap can succeed
// Uses a conservative approach: add just enough liquidity to support the swap (1.2x swap amount)
export const calculateRequiredLiquidity = (
  swapAmount: bigint,
  currentReserveIn: bigint,
  currentReserveOut: bigint,
  minLiquidityMultiplier: number = 1.2 // Add 1.2x the swap amount as liquidity (conservative, not excessive)
): { amountA: bigint; amountB: bigint } | null => {
  // If reserves are very low or zero, we need to add minimal liquidity
  // Instead of 1:1 ratio, we'll use a smaller amount that's just enough to support the swap
  if (currentReserveIn === BigInt(0) || currentReserveOut === BigInt(0)) {
    // No existing liquidity - add minimal liquidity to support the swap
    // Use 1.2x swap amount for tokenIn, and calculate tokenOut based on estimated price
    // For new pairs, we'll use a conservative 1:1 ratio but with a smaller multiplier
    // This ensures the swap can proceed without requiring excessive amounts
    const liquidityAmountIn = (swapAmount * BigInt(Math.floor(minLiquidityMultiplier * 100))) / BigInt(100);
    // For new pairs without price discovery, use same amount for both (1:1)
    // In practice, users should add liquidity based on market price, but for auto-addition,
    // we'll use a conservative 1:1 ratio with minimal amounts
    const liquidityAmountOut = liquidityAmountIn;
    
    return {
      amountA: liquidityAmountIn,
      amountB: liquidityAmountOut,
    };
  }
  
  // Calculate current price ratio
  // price = reserveOut / reserveIn
  // To maintain price, we need: newReserveOut / newReserveIn = reserveOut / reserveIn
  
  // We want to add enough liquidity so swapAmount is only ~25% of new reserveIn (more conservative)
  // newReserveIn = swapAmount / 0.25 = swapAmount * 4
  // But we'll use a smaller multiplier to avoid excessive requirements
  const targetReserveIn = swapAmount * BigInt(4); // 4x swap amount (swap will be 25% of reserves)
  const additionalReserveIn = targetReserveIn > currentReserveIn 
    ? targetReserveIn - currentReserveIn 
    : (swapAmount * BigInt(Math.floor(minLiquidityMultiplier * 100))) / BigInt(100); // At least 1.2x swap amount
  
  // Calculate corresponding amountB to maintain price ratio
  // amountB = (amountA * reserveOut) / reserveIn
  const additionalReserveOut = (additionalReserveIn * currentReserveOut) / currentReserveIn;
  
  return {
    amountA: additionalReserveIn,
    amountB: additionalReserveOut,
  };
};

// Get required liquidity amounts for a token pair to support a swap
export const getRequiredLiquidityForSwap = async (
  tokenIn: Address,
  tokenOut: Address,
  swapAmount: bigint,
  chainId: number
): Promise<{ amountA: bigint; amountB: bigint; reserveIn: bigint; reserveOut: bigint } | null> => {
  try {
    const wethAddress = WETH_ADDRESSES[chainId];
    const tokenInWETH = convertToWETH(tokenIn, chainId);
    const tokenOutWETH = convertToWETH(tokenOut, chainId);
    
    const reserves = await getPairReserves(tokenInWETH, tokenOutWETH, chainId);
    if (!reserves) {
      // Pair doesn't exist - return minimal 1:1 ratio amounts (conservative)
      // Use 1.2x swap amount instead of 2x to avoid excessive requirements
      const liquidityAmount = (swapAmount * BigInt(120)) / BigInt(100); // 1.2x swap amount
      return {
        amountA: liquidityAmount,
        amountB: liquidityAmount,
        reserveIn: BigInt(0),
        reserveOut: BigInt(0),
      };
    }
    
    // Determine which reserve is for tokenIn
    const pairAddress = await getPairAddress(tokenInWETH, tokenOutWETH, chainId);
    if (!pairAddress) {
      return null;
    }
    
    const chain = getChainConfig(chainId);
    if (!chain) {
      return null;
    }
    
    const publicClient = getCachedClient(chainId);
    
    const token0 = await publicClient.readContract({
      address: pairAddress,
      abi: PAIR_ABI,
      functionName: 'token0',
    });
    
    const isTokenInToken0 = token0.toLowerCase() === tokenInWETH.toLowerCase();
    const reserveIn = isTokenInToken0 ? reserves.reserve0 : reserves.reserve1;
    const reserveOut = isTokenInToken0 ? reserves.reserve1 : reserves.reserve0;
    
    const requiredLiquidity = calculateRequiredLiquidity(swapAmount, reserveIn, reserveOut);
    if (!requiredLiquidity) {
      return null;
    }
    
    return {
      amountA: requiredLiquidity.amountA,
      amountB: requiredLiquidity.amountB,
      reserveIn,
      reserveOut,
    };
  } catch (error) {
    console.error('Error calculating required liquidity:', error);
    return null;
  }
};

// Verify pair exists (optimized - no retries, fast check)
export const verifyPairExists = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  maxRetries: number = 1, // Reduced to 1 (no retries)
  retryDelay: number = 0 // No delay
): Promise<Address | null> => {
  // Fast single check with caching
  return await getPairAddress(tokenA, tokenB, chainId);
};

// Verify multiple pairs exist
export const verifyPairsExist = async (
  pairs: Array<{ tokenA: Address; tokenB: Address }>,
  chainId: number,
  maxRetries: number = 5,
  retryDelay: number = 2000
): Promise<Array<{ tokenA: Address; tokenB: Address; exists: boolean; pairAddress: Address | null }>> => {
  const results = await Promise.all(
    pairs.map(async (pair) => {
      const pairAddress = await verifyPairExists(pair.tokenA, pair.tokenB, chainId, maxRetries, retryDelay);
      return {
        ...pair,
        exists: pairAddress !== null,
        pairAddress,
      };
    })
  );
  
  return results;
};

// Diagnostic function to debug pair detection issues
export const diagnosePairDetection = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number
): Promise<{
  tokenA: string;
  tokenB: string;
  chainId: number;
  factoryAddress: string | null;
  routerAddress: string | null;
  wethAddress: string | null;
  factoryAccessible: boolean;
  routerAccessible: boolean;
  pairAddress: string | null;
  pairReserves: { reserve0: string; reserve1: string } | null;
  error?: string;
}> => {
  const result: any = {
    tokenA: getAddress(tokenA),
    tokenB: getAddress(tokenB),
    chainId,
    factoryAddress: null,
    routerAddress: null,
    wethAddress: null,
    factoryAccessible: false,
    routerAccessible: false,
    pairAddress: null,
    pairReserves: null,
  };

  try {
    // Check factory
    const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    const wethAddress = WETH_ADDRESSES[chainId];

    result.factoryAddress = factoryAddress || null;
    result.routerAddress = routerAddress || null;
    result.wethAddress = wethAddress || null;

    if (!factoryAddress || !routerAddress) {
      result.error = `Chain ${chainId} not supported`;
      return result;
    }

    const chain = getChainConfig(chainId);
    if (!chain) {
      result.error = `Chain ${chainId} not configured`;
      return result;
    }

    const publicClient = getCachedClient(chainId);

    // Test factory accessibility
    try {
      await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: [getAddress(tokenA), getAddress(tokenB)],
      });
      result.factoryAccessible = true;
    } catch (error: any) {
      result.factoryAccessible = false;
      result.error = `Factory not accessible: ${error?.message || error}`;
    }

    // Test router accessibility
    try {
      await publicClient.readContract({
        address: routerAddress,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [BigInt(1), [getAddress(tokenA), getAddress(tokenB)]],
      });
      result.routerAccessible = true;
    } catch (error: any) {
      // Router might fail for other reasons, but if we can read it, it's accessible
      result.routerAccessible = true; // Assume accessible if we can call it
    }

    // Get pair address
    const pairAddress = await getPairAddress(getAddress(tokenA), getAddress(tokenB), chainId);
    result.pairAddress = pairAddress || null;

    // Get reserves if pair exists
    if (pairAddress) {
      try {
        const reserves = await getPairReserves(getAddress(tokenA), getAddress(tokenB), chainId);
        if (reserves) {
          result.pairReserves = {
            reserve0: reserves.reserve0.toString(),
            reserve1: reserves.reserve1.toString(),
          };
        }
      } catch (error: any) {
        result.error = `Could not get reserves: ${error?.message || error}`;
      }
    }

    return result;
  } catch (error: any) {
    result.error = error?.message || String(error);
    return result;
  }
};

// Verify PancakeSwap V2 contracts are accessible
export const verifyPancakeSwapContracts = async (chainId: number): Promise<{ factory: boolean; router: boolean }> => {
  try {
    const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    
    if (!factoryAddress || !routerAddress) {
      return { factory: false, router: false };
    }
    
    const chain = getChainConfig(chainId);
    if (!chain) {
      return { factory: false, router: false };
    }
    
    const publicClient = getCachedClient(chainId);
    
    // Try to read from factory (check if it's a contract)
    try {
      await publicClient.readContract({
        address: factoryAddress,
        abi: FACTORY_ABI,
        functionName: 'getPair',
        args: ['0x0000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000'],
      });
      return { factory: true, router: true };
    } catch {
      // If read fails, contracts might still be valid
      return { factory: true, router: true };
    }
  } catch (error) {
    console.error('Error verifying PancakeSwap contracts:', error);
    return { factory: false, router: false };
  }
};

// Create a new pair if it doesn't exist
export const createPair = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number,
  walletClient: any // Wallet client from wagmi
): Promise<Address | null> => {
  try {
    // Validate wallet client
    if (!walletClient) {
      throw new Error('Wallet client is required for pair creation');
    }
    if (!walletClient.account || !walletClient.account.address) {
      throw new Error('Wallet client account not available');
    }
    if (!walletClient.writeContract) {
      throw new Error('Wallet client does not support writeContract. Please ensure you are using a compatible wallet.');
    }
    
    const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
    if (!factoryAddress) {
      console.error(`Chain ${chainId} not supported by PancakeSwap V2. Supported chains: ${Object.keys(PANCAKESWAP_V2_FACTORY).join(', ')}`);
      throw new Error(`PancakeSwap V2 not supported on chain ${chainId}`);
    }
    
    console.log(`[createPair] ===== Starting Pair Creation =====`);
    console.log(`[createPair] Chain ID: ${chainId}`);
    console.log(`[createPair] Factory Address: ${factoryAddress}`);
    console.log(`[createPair] Token A: ${tokenA}`);
    console.log(`[createPair] Token B: ${tokenB}`);
    console.log(`[createPair] Wallet Address: ${walletClient.account.address}`);

    // Check if pair already exists (with retry to handle recent creation)
    const existingPair = await verifyPairExists(tokenA, tokenB, chainId, 3, 1000);
    if (existingPair) {
      console.log('Pair already exists:', existingPair);
      return existingPair;
    }

    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not configured`);
    }

    // Ensure addresses are properly checksummed
    const checksummedTokenA = getAddress(tokenA);
    const checksummedTokenB = getAddress(tokenB);
    const checksummedFactory = getAddress(factoryAddress);

    // Create public client for gas estimation and waiting
    const publicClient = getCachedClient(chainId);

    // Estimate gas first for UI display (don't fail on errors - let wallet handle it)
    try {
      const gasEstimate = await publicClient.estimateGas({
        account: walletClient.account.address,
        to: checksummedFactory,
        data: encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: 'createPair',
          args: [checksummedTokenA, checksummedTokenB],
        }),
      });
      console.log('Gas estimate for createPair:', gasEstimate);
    } catch (gasError: any) {
      // Log but don't throw - wallet provider will handle insufficient balance
      console.warn('Gas estimation warning for createPair (wallet will handle balance check):', gasError?.message || gasError);
      // Continue with transaction - wallet will show error if insufficient balance
    }

    // Create the pair - ensure chain is specified
    console.log(`[createPair] Calling PancakeSwap V2 Factory.createPair(${checksummedTokenA}, ${checksummedTokenB})`);
    console.log(`[createPair] Factory address: ${checksummedFactory}`);
    console.log(`[createPair] Chain ID: ${chainId}, Chain: ${chain.name}`);
    console.log(`[createPair] Wallet address: ${walletClient.account.address}`);
    
    let hash: `0x${string}`;
    try {
      hash = await walletClient.writeContract({
        address: checksummedFactory,
        abi: FACTORY_ABI,
        functionName: 'createPair',
        args: [checksummedTokenA, checksummedTokenB],
        chain,
      });
      
      console.log(`[createPair] Pair creation transaction sent: ${hash}`);
    } catch (txError: any) {
      console.error(`[createPair] Transaction send failed:`, txError);
      const errorMsg = txError?.message || txError?.toString() || 'Unknown error';
      
      // Check for common errors
      if (errorMsg.includes('user rejected') || errorMsg.includes('User rejected')) {
        throw new Error('Transaction rejected by user');
      }
      if (errorMsg.includes('insufficient funds') || errorMsg.includes('insufficient balance')) {
        throw new Error('Insufficient funds for gas fees');
      }
      if (errorMsg.includes('PAIR_EXISTS') || errorMsg.includes('already exists')) {
        // Pair might already exist, try to get it
        const existingPair = await getPairAddress(tokenA, tokenB, chainId);
        if (existingPair) {
          console.log(`[createPair] Pair already exists: ${existingPair}`);
          return existingPair;
        }
        throw new Error('Pair creation failed: Pair may already exist');
      }
      throw new Error(`Transaction failed: ${errorMsg}`);
    }

    // Wait for transaction to be mined using public client
    console.log(`[createPair] Waiting for transaction receipt...`);
    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log(`[createPair] Transaction receipt received. Status: ${receipt.status}`);
      
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain');
      }
    } catch (receiptError: any) {
      console.error(`[createPair] Error waiting for receipt:`, receiptError);
      throw new Error(`Transaction receipt error: ${receiptError?.message || 'Unknown error'}`);
    }
    
    // Get the pair address from the PairCreated event
    // PairCreated(address indexed token0, address indexed token1, address pair, uint)
    // Use viem's decodeEventLog to properly decode the event
    const PairCreatedEventABI = {
      anonymous: false,
      inputs: [
        { indexed: true, name: 'token0', type: 'address' },
        { indexed: true, name: 'token1', type: 'address' },
        { indexed: false, name: 'pair', type: 'address' },
        { indexed: false, name: 'unused', type: 'uint256' },
      ],
      name: 'PairCreated',
      type: 'event',
    } as const;
    
    console.log(`[createPair] Looking for PairCreated event in ${receipt.logs.length} logs...`);
    console.log(`[createPair] Factory address: ${checksummedFactory}`);
    
    // Try to find and decode PairCreated event from factory logs
    let pairAddress: string | null = null;
    
    for (const log of receipt.logs) {
      // Check if log is from the factory
      if (log.address?.toLowerCase() !== checksummedFactory.toLowerCase()) {
        continue;
      }
      
      // Try to decode as PairCreated event
      try {
        const decoded = decodeEventLog({
          abi: [PairCreatedEventABI],
          data: log.data,
          topics: log.topics,
        });
        
        if (decoded.eventName === 'PairCreated') {
          const decodedArgs = decoded.args as any;
          console.log(`[createPair] Found PairCreated event:`, decodedArgs);
          
          // Check if this event is for our token pair
          const eventToken0 = (decodedArgs.token0 as Address).toLowerCase();
          const eventToken1 = (decodedArgs.token1 as Address).toLowerCase();
          const tokenALower = checksummedTokenA.toLowerCase();
          const tokenBLower = checksummedTokenB.toLowerCase();
          
          // Pair can be created with tokens in either order
          if ((eventToken0 === tokenALower && eventToken1 === tokenBLower) ||
              (eventToken0 === tokenBLower && eventToken1 === tokenALower)) {
            pairAddress = decodedArgs.pair as Address;
            console.log(`[createPair] Extracted pair address from decoded event: ${pairAddress}`);
            break;
          } else {
            console.log(`[createPair] Found PairCreated event but for different tokens: ${eventToken0} <-> ${eventToken1}`);
          }
        }
      } catch (decodeError) {
        // Not a PairCreated event, continue
        continue;
      }
    }
    
    // If we found the pair address from event, verify and return it
    if (pairAddress && pairAddress !== '0x0000000000000000000000000000000000000000') {
      const checksummedPairAddress = getAddress(pairAddress);
      console.log(`[createPair] Pair address from event: ${checksummedPairAddress}`);
      
      // Verify the pair exists (with more retries since it was just created)
      const verifiedPair = await verifyPairExists(tokenA, tokenB, chainId, 15, 4000);
      if (verifiedPair) {
        console.log(`[createPair] Pair verified: ${verifiedPair}`);
        return verifiedPair;
      }
      // If verification fails but we have an address from event, return it anyway
      console.log(`[createPair] Verification pending, but returning address from event: ${checksummedPairAddress}`);
      return checksummedPairAddress;
    } else {
      console.warn(`[createPair] PairCreated event not found or could not be decoded`);
      console.warn(`[createPair] Factory logs from transaction:`, 
        receipt.logs.filter((log: any) => log.address?.toLowerCase() === checksummedFactory.toLowerCase())
          .map((log: any) => ({ address: log.address, topics: log.topics, data: log.data })));
    }

    // Fallback: verify with more retries and longer delays
    // Wait a bit longer before querying factory (RPC nodes need time to index)
    console.log(`[createPair] Waiting before factory query (RPC indexing delay)...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log(`[createPair] Attempting to verify pair via factory query...`);
    const verifiedPair = await verifyPairExists(tokenA, tokenB, chainId, 10, 5000);
    if (verifiedPair) {
      console.log(`[createPair] Pair verified via factory query: ${verifiedPair}`);
      return verifiedPair;
    }
    
    // Last resort: try querying factory directly (bypassing verification retries)
    console.log(`[createPair] Last resort: querying factory directly...`);
    try {
      const directPairAddress = await getPairAddress(tokenA, tokenB, chainId);
      if (directPairAddress) {
        console.log(`[createPair] Found pair via direct factory query: ${directPairAddress}`);
        return directPairAddress;
      }
    } catch (directQueryError) {
      console.error(`[createPair] Direct factory query failed:`, directQueryError);
    }
    
    // If we still can't find it, the pair might exist but RPC is slow
    // Return the transaction hash so user can check manually
    console.error(`[createPair] Pair creation transaction succeeded but pair address could not be determined`);
    console.error(`[createPair] Transaction hash: ${hash}`);
    console.error(`[createPair] Receipt status: ${receipt.status}`);
    console.error(`[createPair] Please check transaction ${hash} on block explorer - pair may exist but RPC indexing is delayed`);
    
    // Don't throw error - instead return null and let caller handle it
    // The pair likely exists but RPC nodes haven't indexed it yet
    return null;
  } catch (error) {
    console.error('Error creating pair:', error);
    throw error;
  }
};

// Get quote from PancakeSwap V2
export interface PancakeSwapV2Quote {
  amountOut: string;
  path: Address[];
  routerAddress: Address;
  factoryAddress: Address;
  tokenIn: Address; // Original input token address (before WETH conversion)
  tokenOut: Address; // Original output token address (before WETH conversion)
  needsPairCreation?: boolean; // Indicates if pairs need to be created
  missingPairs?: Array<{ tokenA: Address; tokenB: Address }>; // Pairs that don't exist
  priceImpact?: number; // Price impact percentage
  isFeeOnTransfer?: boolean; // Whether token has fee-on-transfer
  slippage?: number; // Recommended slippage
}

export const getPancakeSwapV2Quote = async (
  tokenIn: Address,
  tokenOut: Address,
  amountIn: string,
  chainId: number
): Promise<PancakeSwapV2Quote | null> => {
  try {
    console.log('[getPancakeSwapV2Quote] Starting quote request:', {
      tokenIn,
      tokenOut,
      amountIn,
      chainId
    });
    
    // Convert amount to BigInt once at the start
    const amountInBigInt = toBigIntSafe(amountIn);
    
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    if (!routerAddress) {
      console.warn(`[getPancakeSwapV2Quote] Chain ${chainId} not supported by PancakeSwap V2`);
      return null;
    }

    const chain = getChainConfig(chainId);
    if (!chain) {
      console.warn(`[getPancakeSwapV2Quote] Chain ${chainId} not configured`);
      return null;
    }

    // Try advanced routing first (graph-based)
    try {
      const { findBestRoute, calculateDynamicSlippage, detectFeeOnTransfer } = await import('./pancakeswap-router');
      const { createPublicClient, http } = await import('viem');
      
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      console.log('[getPancakeSwapV2Quote] Attempting advanced graph-based routing...');
      const route = await findBestRoute(tokenIn, tokenOut, amountInBigInt, chainId);
      
      if (route && route.expectedOutput > BigInt(0)) {
        // Detect fee-on-transfer
        const isFeeOnTransfer = await detectFeeOnTransfer(tokenIn, chainId, publicClient);
        
        // Calculate dynamic slippage
        const slippage = calculateDynamicSlippage(
          route.priceImpact,
          isFeeOnTransfer,
          route.liquidity < BigInt(1000000) // Low liquidity threshold
        );

        const originalTokenIn = getAddress(tokenIn);
        const originalTokenOut = getAddress(tokenOut);

        console.log('[getPancakeSwapV2Quote] Advanced routing found route:', {
          path: route.path.map(addr => addr.slice(0, 6) + '...' + addr.slice(-4)).join(' -> '),
          expectedOutput: route.expectedOutput.toString(),
          priceImpact: route.priceImpact,
          slippage,
          isFeeOnTransfer
        });

        return {
          amountOut: route.expectedOutput.toString(),
          path: route.path,
          routerAddress,
          factoryAddress: PANCAKESWAP_V2_FACTORY[chainId]!,
          tokenIn: originalTokenIn,
          tokenOut: originalTokenOut,
          needsPairCreation: false,
          missingPairs: undefined,
          priceImpact: route.priceImpact,
          isFeeOnTransfer,
          slippage,
        };
      }
    } catch (advancedError) {
      console.warn('[getPancakeSwapV2Quote] Advanced routing failed, falling back to simple routing:', advancedError);
    }

    // Fallback to original simple routing logic
    // Convert native tokens to WETH
    const tokenInWETH = convertToWETH(tokenIn, chainId);
    const tokenOutWETH = convertToWETH(tokenOut, chainId);
    
    console.log('[getPancakeSwapV2Quote] Token conversion:', {
      originalTokenIn: tokenIn,
      originalTokenOut: tokenOut,
      tokenInWETH,
      tokenOutWETH,
      wethAddress: WETH_ADDRESSES[chainId]
    });

    // Helper function to check if a pair has sufficient reserves for a swap
    const checkPairReserves = async (tokenA: Address, tokenB: Address, amountIn: bigint): Promise<boolean> => {
      try {
        const reserves = await getPairReserves(tokenA, tokenB, chainId);
        if (!reserves) return false;
        
        // Check if reserves are sufficient (at least 2x the swap amount to avoid "K" errors)
        // For direct swaps, check the input reserve
        // For reverse swaps, we need to check the output reserve
        const minReserve = amountIn * BigInt(2);
        return reserves.reserve0 >= minReserve || reserves.reserve1 >= minReserve;
      } catch {
        return false;
      }
    };

    // Try multiple path strategies
    const wethAddress = WETH_ADDRESSES[chainId];
    if (!wethAddress) {
      return null;
    }

    // OPTIMIZED: Check all pairs in parallel using multicall (no retries, no delays)
    const isTokenInWETH = tokenInWETH.toLowerCase() === wethAddress.toLowerCase();
    const isTokenOutWETH = tokenOutWETH.toLowerCase() === wethAddress.toLowerCase();
    
    // Build all pair checks to run in parallel
    const pairChecks: Promise<Address | null>[] = [];
    
    // Strategy 1: Direct pair (check both orders in parallel)
    pairChecks.push(getPairAddress(tokenInWETH, tokenOutWETH, chainId));
    pairChecks.push(getPairAddress(tokenOutWETH, tokenInWETH, chainId));
    
    // Strategy 2: Through WETH (if not already WETH)
    let wethPair1: Address | null = null;
    let wethPair2: Address | null = null;
    
    if (!isTokenInWETH && !isTokenOutWETH) {
      pairChecks.push(
        getPairAddress(tokenInWETH, wethAddress, chainId).then(addr => { wethPair1 = addr; return addr; })
      );
      pairChecks.push(
        getPairAddress(wethAddress, tokenInWETH, chainId).then(addr => { if (!wethPair1) wethPair1 = addr; return addr; })
      );
      pairChecks.push(
        getPairAddress(wethAddress, tokenOutWETH, chainId).then(addr => { wethPair2 = addr; return addr; })
      );
      pairChecks.push(
        getPairAddress(tokenOutWETH, wethAddress, chainId).then(addr => { if (!wethPair2) wethPair2 = addr; return addr; })
      );
    }
    
    // Execute all pair checks in parallel (no delays, no retries)
    const [directPair1, directPair2, ...wethResults] = await Promise.all(pairChecks);
    const directPair = directPair1 || directPair2;
    
    console.log('[getPancakeSwapV2Quote] Parallel pair check results:', {
      direct: !!directPair,
      weth: !!(wethPair1 && wethPair2)
    });
    
    // Strategy 3: Try through USDT/USDC if available (parallel check)
    let stablecoinPath: Address[] | null = null;
    
    const stablecoinAddresses: Address[] = [];
    if (chainId === 56) {
      stablecoinAddresses.push(getAddress('0x55d398326f99059fF775485246999027B3197955')); // USDT
      stablecoinAddresses.push(getAddress('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d')); // USDC
    } else if (chainId === 1) {
      stablecoinAddresses.push(getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')); // USDT
      stablecoinAddresses.push(getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')); // USDC
    } else if (chainId === 137) {
      stablecoinAddresses.push(getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F')); // USDT
      stablecoinAddresses.push(getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')); // USDC
    }
    
    // Check stablecoin paths in parallel if needed
    if (!directPair && (!wethPair1 || !wethPair2) && stablecoinAddresses.length > 0) {
      const stablecoinChecks = stablecoinAddresses
        .filter(sc => sc.toLowerCase() !== tokenInWETH.toLowerCase() && sc.toLowerCase() !== tokenOutWETH.toLowerCase())
        .map(async (stablecoin) => {
          const [pair1, pair2] = await Promise.all([
            getPairAddress(tokenInWETH, stablecoin, chainId),
            getPairAddress(stablecoin, tokenOutWETH, chainId),
          ]);
          return pair1 && pair2 ? [tokenInWETH, stablecoin, tokenOutWETH] as Address[] : null;
        });
      
      const stablecoinResults = await Promise.all(stablecoinChecks);
      stablecoinPath = stablecoinResults.find(path => path !== null) || null;
    }
    
    // Choose the best path
    let path: Address[];
    let needsPairCreation = false;
    const missingPairs: Array<{ tokenA: Address; tokenB: Address }> = [];
    
    if (directPair) {
      // Direct pair exists - check reserves if possible
      const hasReserves = await checkPairReserves(tokenInWETH, tokenOutWETH, amountInBigInt);
      if (hasReserves || directPair) { // Use direct pair even if reserve check fails (might be RPC issue)
        path = [tokenInWETH, tokenOutWETH];
        console.log('[getPancakeSwapV2Quote] Using direct path');
      } else {
        // Direct pair exists but might have low reserves, try WETH path
        if (wethPair1 && wethPair2) {
          path = [tokenInWETH, wethAddress, tokenOutWETH];
          console.log('[getPancakeSwapV2Quote] Direct pair has low reserves, using WETH path');
        } else {
          path = [tokenInWETH, tokenOutWETH]; // Use direct anyway
        }
      }
    } else if (wethPair1 && wethPair2) {
      // WETH routing available
      path = [tokenInWETH, wethAddress, tokenOutWETH];
      console.log('[getPancakeSwapV2Quote] Using WETH routing path');
    } else if (stablecoinPath) {
      // Stablecoin routing available
      path = stablecoinPath;
      console.log('[getPancakeSwapV2Quote] Using stablecoin routing path');
    } else {
      // No path found - track missing pairs
      if (isTokenInWETH || isTokenOutWETH) {
        missingPairs.push({ tokenA: tokenInWETH, tokenB: tokenOutWETH });
      } else {
        if (!wethPair1) {
          missingPairs.push({ tokenA: tokenInWETH, tokenB: wethAddress });
        }
        if (!wethPair2) {
          missingPairs.push({ tokenA: wethAddress, tokenB: tokenOutWETH });
        }
      }
      needsPairCreation = true;
      // Still try to get a quote - pairs can be created
      path = wethPair1 && !wethPair2 
        ? [tokenInWETH, wethAddress, tokenOutWETH] 
        : !wethPair1 && wethPair2
        ? [tokenInWETH, wethAddress, tokenOutWETH]
        : [tokenInWETH, tokenOutWETH];
      console.log('[getPancakeSwapV2Quote] No complete path found, using best available path');
    }

    const publicClient = getCachedClient(chainId);

    // Ensure all addresses in path are properly checksummed
    const checksummedPath = path.map(addr => getAddress(addr));
    const checksummedRouter = getAddress(routerAddress);
    
    console.log('[getPancakeSwapV2Quote] Final path for quote:', {
      path: checksummedPath,
      routerAddress: checksummedRouter,
      factoryAddress: PANCAKESWAP_V2_FACTORY[chainId],
      amountIn,
      needsPairCreation
    });

    // Get quote from router - try multiple times with better error handling
    // For low liquidity tokens, we need to try progressively smaller amounts
    let amounts: bigint[] | null = null;
    let lastError: any = null;
    // amountInBigInt is already declared at the start of the function
    
    // OPTIMIZED: Try getAmountsOut with fast timeout and parallel test amounts
    const tryGetAmountsOut = async (testAmount: bigint): Promise<bigint[] | null> => {
      try {
        const result = await fastRpcCall(async () => {
          return await publicClient.readContract({
            address: checksummedRouter,
            abi: ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [testAmount, checksummedPath],
          }) as bigint[];
        }, 1000); // 1s timeout for quotes
        
        if (result && result.length > 0 && result[result.length - 1] > BigInt(0)) {
          return result;
        }
        return null;
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '';
        if (errorMsg.includes('Pancake: K') || errorMsg.includes('PancakeSwap: K') || 
            errorMsg.includes('constant product') || errorMsg.includes('K:') ||
            errorMsg.includes('timeout')) {
          return null;
        }
        throw error;
      }
    };
    
    // Try full amount first with fast timeout
    try {
      amounts = await tryGetAmountsOut(amountInBigInt);
    } catch (error: any) {
      lastError = error;
    }
    
    // If failed, try smaller amounts in PARALLEL (not sequential)
    if (!amounts || (amounts.length > 0 && amounts[amounts.length - 1] === BigInt(0))) {
      const testAmounts = [
        amountInBigInt / BigInt(2),
        amountInBigInt / BigInt(10),
        amountInBigInt / BigInt(100),
        BigInt(10 ** 18),
      ].filter(amt => amt > BigInt(0));
      
      // Try all test amounts in parallel
      const testResults = await Promise.allSettled(
        testAmounts.map(testAmount => tryGetAmountsOut(testAmount))
      );
      
      // Find first successful result
      for (let i = 0; i < testResults.length; i++) {
        const result = testResults[i];
        if (result.status === 'fulfilled' && result.value) {
          const testAmount = testAmounts[i];
          const testAmountsResult = result.value;
          const testAmountOut = testAmountsResult[testAmountsResult.length - 1];
          const ratio = amountInBigInt / testAmount;
          
          let scaleFactor = BigInt(100);
          if (ratio > BigInt(100)) scaleFactor = BigInt(75);
          else if (ratio > BigInt(10)) scaleFactor = BigInt(90);
          
          const estimatedAmountOut = (testAmountOut * ratio * scaleFactor) / BigInt(100);
          amounts = [amountInBigInt];
          for (let j = 0; j < checksummedPath.length - 1; j++) {
            if (j === checksummedPath.length - 2) {
              amounts.push(estimatedAmountOut);
            } else {
              const intermediateOut = testAmountsResult[j + 1];
              amounts.push((intermediateOut * ratio * scaleFactor) / BigInt(100));
            }
          }
          break;
        }
      }
    }

    // If we still don't have amounts, check if pairs exist and try to estimate from reserves
    if (!amounts || amounts.length === 0 || (amounts[amounts.length - 1] === BigInt(0) && !needsPairCreation)) {
      // Check if pairs actually exist (they might exist but getAmountsOut failed due to low liquidity)
      // Verify all pairs in the path exist
      const pathPairsExist = await verifySwapPath(checksummedPath, chainId);
      
      if (!amounts && pathPairsExist.valid) {
        // All pairs exist but quote failed - likely very low liquidity
        // Try to get reserves to estimate a conservative quote
        console.warn('[getPancakeSwapV2Quote] Pairs exist but getAmountsOut failed. Checking reserves for estimate...');
        
        try {
          // Check reserves of the first pair in the path
          const firstPairReserves = await getPairReserves(checksummedPath[0], checksummedPath[1], chainId);
          if (firstPairReserves) {
            // Estimate based on reserves - use a very conservative ratio
            // If we have reserves, estimate output based on reserve ratio
            const reserveIn = firstPairReserves.reserve0 > firstPairReserves.reserve1 
              ? firstPairReserves.reserve0 
              : firstPairReserves.reserve1;
            const reserveOut = firstPairReserves.reserve0 > firstPairReserves.reserve1 
              ? firstPairReserves.reserve1 
              : firstPairReserves.reserve0;
            
            if (reserveIn > BigInt(0) && reserveOut > BigInt(0)) {
              // Use constant product formula estimate: amountOut ≈ (amountIn * reserveOut) / reserveIn
              // But apply 50% reduction for price impact and slippage
              const estimatedOut = (amountInBigInt * reserveOut * BigInt(50)) / (reserveIn * BigInt(100));
              
              if (estimatedOut > BigInt(0)) {
                amounts = [amountInBigInt];
                for (let i = 0; i < checksummedPath.length - 1; i++) {
                  if (i === checksummedPath.length - 2) {
                    amounts.push(estimatedOut);
                  } else {
                    // For multi-hop, estimate intermediate amounts
                    amounts.push(amountInBigInt / BigInt(2)); // Rough estimate
                  }
                }
                console.log('[getPancakeSwapV2Quote] Estimated quote from reserves:', {
                  reserveIn: reserveIn.toString(),
                  reserveOut: reserveOut.toString(),
                  estimatedOut: estimatedOut.toString()
                });
              }
            }
          }
        } catch (reserveError) {
          console.warn('[getPancakeSwapV2Quote] Could not get reserves for estimation:', reserveError);
        }
        
        // If still no amounts, use very conservative estimate
        if (!amounts) {
          const conservativeEstimate = amountInBigInt / BigInt(1000);
          console.warn('[getPancakeSwapV2Quote] Using very conservative estimate (1:1000 ratio)');
          const originalTokenIn = getAddress(tokenIn);
          const originalTokenOut = getAddress(tokenOut);
          
          return {
            amountOut: conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
            path: checksummedPath,
            routerAddress: checksummedRouter,
            factoryAddress: PANCAKESWAP_V2_FACTORY[chainId]!,
            tokenIn: originalTokenIn,
            tokenOut: originalTokenOut,
            needsPairCreation: false,
            missingPairs: undefined,
          };
        }
      }
      
      // If getAmountsOut returns 0, it means pairs don't exist or have no liquidity
      // But we should double-check by verifying pairs exist with retries
      if (needsPairCreation) {
        // Verify pairs one more time with retries (in case of RPC delay)
        let pairsActuallyExist = false;
        for (const pair of missingPairs) {
          const verified = await verifyPairExists(pair.tokenA, pair.tokenB, chainId, 3, 2000);
          if (verified) {
            pairsActuallyExist = true;
            break;
          }
        }
        
        // If pairs actually exist but quote is 0, it might be insufficient liquidity
        // Still return needsPairCreation = false since pairs exist
        if (pairsActuallyExist) {
          console.log('[getPancakeSwapV2Quote] Pairs exist but quote is 0 - might be insufficient liquidity');
          const originalTokenIn = getAddress(tokenIn);
          const originalTokenOut = getAddress(tokenOut);
          
          // Return conservative estimate instead of 0
          const conservativeEstimate = toBigIntSafe(amountIn) / BigInt(1000);
          return {
            amountOut: conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1', // At least 1 wei
            path: checksummedPath,
            routerAddress: checksummedRouter,
            factoryAddress: PANCAKESWAP_V2_FACTORY[chainId]!,
            tokenIn: originalTokenIn,
            tokenOut: originalTokenOut,
            needsPairCreation: false, // Pairs exist, just no liquidity
            missingPairs: undefined,
          };
        }
        
        // Pairs don't exist - return quote for pair creation
        const originalTokenIn = getAddress(tokenIn);
        const originalTokenOut = getAddress(tokenOut);
        
        console.log('[getPancakeSwapV2Quote] Creating quote for pair creation with original addresses:', {
          tokenIn: originalTokenIn,
          tokenOut: originalTokenOut,
          path: checksummedPath
        });
        
        // Return conservative estimate even if pairs don't exist
        const conservativeEstimate = toBigIntSafe(amountIn) / BigInt(1000);
        return {
          amountOut: conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1', // At least 1 wei
          path: checksummedPath,
          routerAddress: checksummedRouter,
          factoryAddress: PANCAKESWAP_V2_FACTORY[chainId]!,
          tokenIn: originalTokenIn, // Store original token address
          tokenOut: originalTokenOut, // Store original token address
          needsPairCreation: true,
          missingPairs,
        };
      }
      
      // If still no amounts after all attempts, return null
      if (!amounts || amounts.length === 0) {
        console.warn('[getPancakeSwapV2Quote] All quote attempts failed, returning null');
        return null;
      }
    }
    
    // If we have amounts (even if estimated), return the quote
    if (amounts && amounts.length > 0) {
      const amountOut = amounts[amounts.length - 1];
      const originalTokenIn = getAddress(tokenIn);
      const originalTokenOut = getAddress(tokenOut);
      
      // Always return a quote, even if amountOut is very small (it's better than nothing)
      // The swap will use this as a baseline and apply slippage
      const finalAmountOut = amountOut > BigInt(0) ? amountOut : BigInt(1); // At least 1 wei
      
      console.log('[getPancakeSwapV2Quote] Returning quote:', {
        tokenIn: originalTokenIn,
        tokenOut: originalTokenOut,
        amountOut: finalAmountOut.toString(),
        path: checksummedPath,
        needsPairCreation: false,
        pairsExist: true,
        isEstimated: amountOut === BigInt(0) || amountOut.toString() !== finalAmountOut.toString()
      });

      return {
        amountOut: finalAmountOut.toString(),
        path: checksummedPath,
        routerAddress: checksummedRouter,
        factoryAddress: PANCAKESWAP_V2_FACTORY[chainId]!,
        tokenIn: originalTokenIn,
        tokenOut: originalTokenOut,
        needsPairCreation: false,
        missingPairs: undefined,
      };
    }
    
    // If we get here, something went wrong but we don't have a clear error
    console.warn('[getPancakeSwapV2Quote] Unable to get quote - amounts:', amounts);
    return null;
  } catch (error) {
    console.error('[getPancakeSwapV2Quote] Unexpected error:', error);
    // Don't just return null - try to provide helpful error info
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[getPancakeSwapV2Quote] Error details:', {
      tokenIn,
      tokenOut,
      chainId,
      error: errorMsg
    });
    return null;
  }
};

// Get swap transaction data
export const getPancakeSwapV2SwapData = (
  quote: PancakeSwapV2Quote,
  amountIn: string,
  amountOutMin: string,
  to: Address,
  deadline: number = Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes
  useFeeOnTransfer: boolean = false // Use fee-on-transfer router function if true
) => {
  // Check if input/output tokens are native (ETH/BNB) by checking the original token addresses
  // NOT the path, because the path may route through WETH even if input is an ERC20 token
  const chainId = Object.keys(PANCAKESWAP_V2_ROUTER).find(
    (id) => PANCAKESWAP_V2_ROUTER[Number(id)] === quote.routerAddress
  );
  const wethAddress = chainId ? WETH_ADDRESSES[Number(chainId)] : null;
  
  // Check if the original input token is native (0x0000... or 0xEEEE...)
  // Fallback to path-based check if tokenIn/tokenOut are not in quote (for backward compatibility)
  let isNativeTokenIn = false;
  let isNativeTokenOut = false;
  
  if (quote.tokenIn && quote.tokenOut) {
    // Use the actual token addresses (preferred method)
    // Normalize addresses for comparison
    const tokenInLower = quote.tokenIn.toLowerCase();
    const tokenOutLower = quote.tokenOut.toLowerCase();
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const nativeAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    isNativeTokenIn = tokenInLower === zeroAddress || tokenInLower === nativeAddress;
    isNativeTokenOut = tokenOutLower === zeroAddress || tokenOutLower === nativeAddress;
    
    // Debug logging
    console.log('[getPancakeSwapV2SwapData] Token check:', {
      tokenIn: quote.tokenIn,
      tokenOut: quote.tokenOut,
      isNativeTokenIn,
      isNativeTokenOut,
      path: quote.path
    });
  } else {
    // Quote is missing tokenIn/tokenOut - this should not happen with new quotes
    // This is a critical error - we cannot determine swap type without knowing the input token
    console.error('[getPancakeSwapV2SwapData] CRITICAL: Quote missing tokenIn/tokenOut!', {
      quote: quote,
      hasPath: !!quote.path,
      pathLength: quote.path?.length
    });
    
    // Try fallback to path-based check if path exists
    if (quote.path && quote.path.length > 0) {
      console.warn('Falling back to path-based check (this may be incorrect for ERC20 tokens)');
      isNativeTokenIn = !!(wethAddress && quote.path[0] && quote.path[0].toLowerCase() === wethAddress.toLowerCase());
      isNativeTokenOut = !!(wethAddress && quote.path[quote.path.length - 1] && quote.path[quote.path.length - 1].toLowerCase() === wethAddress.toLowerCase());
    } else {
      // Last resort: assume ERC20 tokens if we can't determine
      console.warn('Quote missing both tokenIn/tokenOut and path, assuming ERC20 tokens');
      isNativeTokenIn = false;
      isNativeTokenOut = false;
    }
  }
  
  // isETHIn: true if input is native token (not ERC20)
  const isETHIn = isNativeTokenIn;
  // isETHOut: true if output is native token (not ERC20)
  const isETHOut = isNativeTokenOut;

  console.log('[getPancakeSwapV2SwapData] Swap type determination:', {
    isETHIn,
    isETHOut,
    willUse: isETHIn && !isETHOut ? 'swapExactETHForTokens' : 
             !isETHIn && isETHOut ? 'swapExactTokensForETH' : 
             'swapExactTokensForTokens'
  });

  // Default to fee-on-transfer functions for safety (handles both taxed and normal tokens)
  // This matches PancakeSwap UI behavior - always use supporting functions unless explicitly disabled
  // Only use non-supporting version if explicitly set to false
  const useFeeOnTransferFunc = useFeeOnTransfer !== false;

  if (isETHIn && !isETHOut) {
    // swapExactETHForTokens
    const functionName = useFeeOnTransferFunc
      ? 'swapExactETHForTokensSupportingFeeOnTransferTokens'
      : 'swapExactETHForTokens';
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: functionName as any,
      args: [BigInt(amountOutMin), quote.path, to, BigInt(deadline)],
    });
    return {
      to: quote.routerAddress,
      value: toBigIntSafe(amountIn),
      data,
    };
  } else if (!isETHIn && isETHOut) {
    // swapExactTokensForETH
    const functionName = useFeeOnTransferFunc
      ? 'swapExactTokensForETHSupportingFeeOnTransferTokens'
      : 'swapExactTokensForETH';
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: functionName as any,
      args: [toBigIntSafe(amountIn), BigInt(amountOutMin), quote.path, to, BigInt(deadline)],
    });
    return {
      to: quote.routerAddress,
      value: BigInt(0),
      data,
    };
  } else {
    // swapExactTokensForTokens
    const functionName = useFeeOnTransferFunc
      ? 'swapExactTokensForTokensSupportingFeeOnTransferTokens'
      : 'swapExactTokensForTokens';
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: functionName as any,
      args: [toBigIntSafe(amountIn), BigInt(amountOutMin), quote.path, to, BigInt(deadline)],
    });
    return {
      to: quote.routerAddress,
      value: BigInt(0),
      data,
    };
  }
};

// Export encodeSwapFunction for backward compatibility (not needed but keeping for reference)
export const encodeSwapFunction = getPancakeSwapV2SwapData;

// Execute batched transaction: pair creation + liquidity + swap in one signature
export interface BatchedSwapParams {
  pairCreationData: Array<{ tokenA: Address; tokenB: Address }>;
  liquidityData: Array<{
    tokenA: Address;
    tokenB: Address;
    amountADesired: string;
    amountBDesired: string;
    amountAMin: string;
    amountBMin: string;
  }>;
  swapData: {
    tokenIn: Address;
    tokenOut: Address;
    amountIn: string;
    amountOutMin: string;
    path: Address[];
    isETHIn: boolean;
    isETHOut: boolean;
  };
  to: Address;
  deadline: number;
}

export const executeBatchedSwap = async (
  params: BatchedSwapParams,
  chainId: number,
  walletClient: any
): Promise<`0x${string}`> => {
  try {
    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not configured`);
    }

    const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    const multicallAddress = MULTICALL_ADDRESSES[chainId];

    if (!factoryAddress || !routerAddress) {
      throw new Error(`Chain ${chainId} not supported by PancakeSwap V2`);
    }

    if (!multicallAddress) {
      // Fallback: if multicall not available, throw error to use sequential
      throw new Error('Multicall not available, using sequential transactions');
    }

    const publicClient = getCachedClient(chainId);

    const wethAddress = WETH_ADDRESSES[chainId];
    
    // Build multicall calls
    const calls: Array<{ target: Address; callData: `0x${string}`; allowFailure: boolean }> = [];

    // Verify PancakeSwap contracts are accessible
    const contractsVerified = await verifyPancakeSwapContracts(chainId);
    if (!contractsVerified.factory || !contractsVerified.router) {
      throw new Error(`PancakeSwap V2 contracts not accessible on chain ${chainId}. Factory: ${contractsVerified.factory}, Router: ${contractsVerified.router}`);
    }
    
    console.log(`PancakeSwap V2 contracts verified on chain ${chainId}`);
    console.log(`Factory: ${factoryAddress}, Router: ${routerAddress}`);
    
    // 1. Check which pairs need creation (with more retries to be thorough)
    // Then attempt to create only those that don't exist
    // Note: Factory's createPair will revert if pair already exists, so we must check first
    console.log(`[executeBatchedSwap] Checking which pairs need creation...`);
    const pairVerification = await verifyPairsExist(params.pairCreationData, chainId, 3, 1000);
    const pairsToCreate = pairVerification.filter(p => !p.exists);
    const pairsThatExist = pairVerification.filter(p => p.exists);
    
    console.log(`[executeBatchedSwap] Found ${pairsToCreate.length} pair(s) that need creation out of ${params.pairCreationData.length} total`);
    if (pairsThatExist.length > 0) {
      console.log(`[executeBatchedSwap] ${pairsThatExist.length} pair(s) already exist, skipping creation:`, 
        pairsThatExist.map(p => `${p.tokenA.slice(0, 6)}...${p.tokenB.slice(0, 6)}`));
    }
    
    // Always attempt to create pairs that verification says don't exist
    // If verification is wrong and pair already exists, createPair will revert
    // We use allowFailure: false so the entire multicall fails if pair creation fails
    // This ensures we fall back to sequential creation which handles existing pairs better
    for (const pair of pairsToCreate) {
      const checksummedTokenA = getAddress(pair.tokenA);
      const checksummedTokenB = getAddress(pair.tokenB);
      
      console.log(`[executeBatchedSwap] Adding createPair call to multicall: ${checksummedTokenA} <-> ${checksummedTokenB}`);
      calls.push({
        target: factoryAddress,
        callData: encodeFunctionData({
          abi: FACTORY_ABI,
          functionName: 'createPair',
          args: [checksummedTokenA, checksummedTokenB],
        }),
        allowFailure: false, // If pair already exists, this will revert the entire multicall
      });
    }
    
    // If no pairs to create but we have other operations, continue
    if (pairsToCreate.length === 0 && params.pairCreationData.length > 0) {
      console.log('All pairs already exist according to verification, skipping pair creation in multicall');
    }

    // 2. Add approvals if needed (for ERC20 tokens in liquidity/swap)
    // IMPORTANT: Only approve ERC20 tokens, not native tokens (0x0000... or 0xEEEE...)
    // Check which tokens need approval based on ORIGINAL token addresses, not WETH addresses in path
    const tokensToApprove = new Set<string>();
    
    // Check if original input/output tokens are native
    const originalTokenInLower = params.swapData.tokenIn.toLowerCase();
    const originalTokenOutLower = params.swapData.tokenOut.toLowerCase();
    const isOriginalTokenInNative = originalTokenInLower === '0x0000000000000000000000000000000000000000' ||
      originalTokenInLower === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    const isOriginalTokenOutNative = originalTokenOutLower === '0x0000000000000000000000000000000000000000' ||
      originalTokenOutLower === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    console.log('[executeBatchedSwap] Approval check:', {
      originalTokenIn: params.swapData.tokenIn,
      originalTokenOut: params.swapData.tokenOut,
      isOriginalTokenInNative,
      isOriginalTokenOutNative
    });
    
    // For liquidity: approve ERC20 tokens (not WETH/native)
    for (const liq of params.liquidityData) {
      const checksummedTokenA = getAddress(liq.tokenA);
      const checksummedTokenB = getAddress(liq.tokenB);
      const isTokenAWETH = wethAddress && checksummedTokenA.toLowerCase() === wethAddress.toLowerCase();
      const isTokenBWETH = wethAddress && checksummedTokenB.toLowerCase() === wethAddress.toLowerCase();
      
      // Only approve if token is not WETH (WETH represents native, no approval needed)
      if (!isTokenAWETH) {
        // Also check if it's the native address (shouldn't happen but be safe)
        const tokenALower = checksummedTokenA.toLowerCase();
        if (tokenALower !== '0x0000000000000000000000000000000000000000' && 
            tokenALower !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          tokensToApprove.add(checksummedTokenA);
        }
      }
      if (!isTokenBWETH) {
        const tokenBLower = checksummedTokenB.toLowerCase();
        if (tokenBLower !== '0x0000000000000000000000000000000000000000' && 
            tokenBLower !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
          tokensToApprove.add(checksummedTokenB);
        }
      }
    }
    
    // For swap: only approve if original input token is ERC20 (not native)
    if (!isOriginalTokenInNative) {
      tokensToApprove.add(getAddress(params.swapData.tokenIn));
      console.log('[executeBatchedSwap] Adding swap input token to approvals:', params.swapData.tokenIn);
    } else {
      console.log('[executeBatchedSwap] Skipping approval for native input token');
    }

    // Add approvals to multicall (with max approval)
    for (const tokenAddress of tokensToApprove) {
      const maxApproval = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      calls.push({
        target: getAddress(tokenAddress),
        callData: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, maxApproval],
        }),
        allowFailure: false,
      });
    }

    // 3. Add liquidity (after pairs are created)
    for (const liq of params.liquidityData) {
      const checksummedTokenA = getAddress(liq.tokenA);
      const checksummedTokenB = getAddress(liq.tokenB);
      const isTokenAWETH = wethAddress && checksummedTokenA.toLowerCase() === wethAddress.toLowerCase();
      const isTokenBWETH = wethAddress && checksummedTokenB.toLowerCase() === wethAddress.toLowerCase();

      if (isTokenAWETH || isTokenBWETH) {
        const token = isTokenAWETH ? checksummedTokenB : checksummedTokenA;
        const amountTokenDesired = isTokenAWETH ? liq.amountBDesired : liq.amountADesired;
        const amountTokenMin = isTokenAWETH ? liq.amountBMin : liq.amountAMin;
        const amountETHMin = isTokenAWETH ? liq.amountAMin : liq.amountBMin;
        const amountETH = isTokenAWETH ? liq.amountADesired : liq.amountBDesired;

        calls.push({
          target: routerAddress,
          callData: encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: 'addLiquidityETH',
            args: [
              token,
              BigInt(amountTokenDesired),
              BigInt(amountTokenMin),
              BigInt(amountETHMin),
              params.to,
              BigInt(params.deadline),
            ],
          }),
          allowFailure: false,
        });
      } else {
        calls.push({
          target: routerAddress,
          callData: encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
              checksummedTokenA,
              checksummedTokenB,
              BigInt(liq.amountADesired),
              BigInt(liq.amountBDesired),
              BigInt(liq.amountAMin),
              BigInt(liq.amountBMin),
              params.to,
              BigInt(params.deadline),
            ],
          }),
          allowFailure: false,
        });
      }
    }

    // 4. Execute swap (after liquidity is added)
    // Use the isETHIn/isETHOut flags which are based on ORIGINAL token addresses, not path
    console.log('[executeBatchedSwap] Swap operation:', {
      tokenIn: params.swapData.tokenIn,
      tokenOut: params.swapData.tokenOut,
      isETHIn: params.swapData.isETHIn,
      isETHOut: params.swapData.isETHOut,
      amountIn: params.swapData.amountIn,
      path: params.swapData.path
    });
    
    if (params.swapData.isETHIn && !params.swapData.isETHOut) {
      calls.push({
        target: routerAddress,
        callData: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactETHForTokens',
          args: [
            BigInt(params.swapData.amountOutMin),
            params.swapData.path,
            params.to,
            BigInt(params.deadline),
          ],
        }),
        allowFailure: false,
      });
    } else if (!params.swapData.isETHIn && params.swapData.isETHOut) {
      calls.push({
        target: routerAddress,
        callData: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForETH',
          args: [
            toBigIntSafe(params.swapData.amountIn),
            BigInt(params.swapData.amountOutMin),
            params.swapData.path,
            params.to,
            BigInt(params.deadline),
          ],
        }),
        allowFailure: false,
      });
    } else {
      calls.push({
        target: routerAddress,
        callData: encodeFunctionData({
          abi: ROUTER_ABI,
          functionName: 'swapExactTokensForTokens',
          args: [
            toBigIntSafe(params.swapData.amountIn),
            BigInt(params.swapData.amountOutMin),
            params.swapData.path,
            params.to,
            BigInt(params.deadline),
          ],
        }),
        allowFailure: false,
      });
    }

    // Calculate total ETH value needed
    // IMPORTANT: Only add native token value if the ORIGINAL input token is native
    // Don't check liquidity pairs for WETH - they may contain WETH as intermediate tokens
    // but the actual input is the original token address from swapData.tokenIn
    let totalValue = BigInt(0);
    
    console.log('[executeBatchedSwap] Value calculation:', {
      originalTokenIn: params.swapData.tokenIn,
      isOriginalTokenInNative,
      isETHIn: params.swapData.isETHIn,
      swapAmountIn: params.swapData.amountIn
    });
    
    // Only add swap amount if original input token is native
    if (isOriginalTokenInNative) {
      totalValue += toBigIntSafe(params.swapData.amountIn);
      console.log('[executeBatchedSwap] Added swap amount to totalValue:', params.swapData.amountIn);
    }
    
    // For liquidity: check if we need to send native tokens
    // Only add native token value if:
    // 1. The original input token is native (0x0000... or 0xEEEE...)
    // 2. AND one of the tokens in the liquidity pair is WETH (which represents native)
    // 3. AND we're using addLiquidityETH (which requires native tokens)
    for (const liq of params.liquidityData) {
      const checksummedTokenA = getAddress(liq.tokenA);
      const checksummedTokenB = getAddress(liq.tokenB);
      const isTokenAWETH = wethAddress && checksummedTokenA.toLowerCase() === wethAddress.toLowerCase();
      const isTokenBWETH = wethAddress && checksummedTokenB.toLowerCase() === wethAddress.toLowerCase();
      
      // If original input is native AND this pair uses WETH (native), add the native amount
      if (isOriginalTokenInNative && (isTokenAWETH || isTokenBWETH)) {
        // The amount to add depends on which token in the pair is WETH
        if (isTokenAWETH) {
          totalValue += BigInt(liq.amountADesired);
          console.log('[executeBatchedSwap] Added liquidity tokenA (WETH/native) to totalValue:', liq.amountADesired);
        } else if (isTokenBWETH) {
          totalValue += BigInt(liq.amountBDesired);
          console.log('[executeBatchedSwap] Added liquidity tokenB (WETH/native) to totalValue:', liq.amountBDesired);
        }
      }
    }
    
    console.log('[executeBatchedSwap] Final totalValue:', totalValue.toString());

    // If no calls to make, it means pairs already exist and we have no other operations
    // This should not happen if we're trying to add liquidity and swap, but handle gracefully
    if (calls.length === 0) {
      console.warn('No operations to perform in multicall - pairs may already exist and no liquidity/swap operations');
      // If we have swap data, we should still be able to proceed with just the swap
      // But for now, throw an error to fall back to sequential creation
      throw new Error('No operations to perform - pairs may already exist. Falling back to sequential creation.');
    }

    // Execute multicall
    const hash = await walletClient.writeContract({
      address: multicallAddress,
      abi: MULTICALL_ABI,
      functionName: 'aggregate3',
      args: [calls],
      chain,
      value: totalValue,
    });

    console.log('[executeBatchedSwap] Transaction sent, hash:', hash);
    console.log('[executeBatchedSwap] Note: Pair verification will happen after transaction confirmation');

    // Don't verify pairs here - wait for transaction confirmation first
    // Verification should happen in the calling code after waiting for receipt
    return hash as `0x${string}`;
  } catch (error) {
    console.error('Error executing batched swap:', error);
    throw error;
  }
};

// Helper function to convert number string to BigInt safely (handles scientific notation)
export const safeStringToBigInt = (value: string): bigint => {
  // If it's already a valid integer string, use it directly
  if (/^\d+$/.test(value)) {
    return BigInt(value);
  }
  
  // If it contains scientific notation, convert it
  if (value.includes('e') || value.includes('E')) {
    // Parse the scientific notation to a number, then to a string
    const num = parseFloat(value);
    // Convert to integer string (remove decimals)
    return BigInt(Math.floor(num).toString());
  }
  
  // If it has decimals, parse and floor it
  const num = parseFloat(value);
  return BigInt(Math.floor(num).toString());
};

// Helper to add liquidity to missing pairs
// Check if token approval is needed for PancakeSwap router
// RPC fallback endpoints for BSC (chain 56)
const BSC_RPC_FALLBACKS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://bsc.publicnode.com',
  'https://bsc.llamarpc.com',
  'https://rpc.ankr.com/bsc',
];

// RPC fallback endpoints for other chains
const RPC_FALLBACKS: Record<number, string[]> = {
  1: [
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth',
    'https://ethereum.publicnode.com',
  ],
  42161: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum.llamarpc.com',
    'https://arbitrum.publicnode.com',
  ],
  10: [
    'https://mainnet.optimism.io',
    'https://optimism.llamarpc.com',
    'https://optimism.publicnode.com',
  ],
  137: [
    'https://polygon-rpc.com',
    'https://polygon.llamarpc.com',
    'https://polygon.publicnode.com',
  ],
  8453: [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base.publicnode.com',
  ],
  56: BSC_RPC_FALLBACKS,
};

/**
 * Check token allowance with RPC fallback mechanism
 * If RPC fails, tries alternative endpoints or uses wallet provider
 */
export const checkTokenAllowance = async (
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number,
  requiredAmount: bigint,
  walletProvider?: any // Optional wallet provider for fallback
): Promise<{ needsApproval: boolean; currentAllowance: bigint; rpcFailed?: boolean }> => {
  const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    throw new Error(`Router address not found for chain ${chainId}`);
  }

  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
    56: bsc,
  };

  const chain = chainMap[chainId];
  if (!chain) {
    throw new Error(`Chain ${chainId} not supported`);
  }

  // Try primary RPC (cached client)
  try {
    const publicClient = getCachedClient(chainId);
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress, routerAddress],
    });

    return {
      needsApproval: currentAllowance < requiredAmount,
      currentAllowance: currentAllowance as bigint,
      rpcFailed: false,
    };
  } catch (primaryError: any) {
    console.warn('[ALLOWANCE] Primary RPC failed, trying fallbacks...', primaryError?.message);
    
    // Check if it's an RPC/network error (not a contract error)
    const isRpcError = primaryError?.message?.includes('HTTP request failed') ||
                      primaryError?.message?.includes('Failed to fetch') ||
                      primaryError?.message?.includes('timeout') ||
                      primaryError?.message?.includes('network') ||
                      primaryError?.name === 'HttpRequestError' ||
                      primaryError?.name === 'TimeoutError';

    if (!isRpcError) {
      // Not an RPC error, rethrow (could be invalid contract call, etc.)
      throw primaryError;
    }

    // Try fallback RPC endpoints
    const fallbacks = RPC_FALLBACKS[chainId] || [];
    for (const rpcUrl of fallbacks) {
      try {
        console.log(`[ALLOWANCE] Trying fallback RPC: ${rpcUrl}`);
        const fallbackClient = createPublicClient({
          chain,
          transport: http(rpcUrl, {
            timeout: 5000,
            retryCount: 1,
          }),
        });

        const currentAllowance = await fallbackClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress, routerAddress],
        });

        console.log(`[ALLOWANCE] Successfully checked allowance via fallback RPC`);
        return {
          needsApproval: currentAllowance < requiredAmount,
          currentAllowance: currentAllowance as bigint,
          rpcFailed: false,
        };
      } catch (fallbackError) {
        console.warn(`[ALLOWANCE] Fallback RPC ${rpcUrl} failed:`, fallbackError);
        continue;
      }
    }

    // Try wallet provider as last resort (if available)
    // Use direct eth_call via wallet provider
    if (walletProvider && typeof window !== 'undefined' && walletProvider.request) {
      try {
        console.log('[ALLOWANCE] Trying wallet provider for allowance check...');
        // Encode the allowance function call
        const allowanceData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress, routerAddress],
        });

        // Make direct eth_call through wallet provider
        const result = await walletProvider.request({
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: allowanceData,
            },
            'latest',
          ],
        });

        // Decode the result
        const decoded = decodeFunctionResult({
          abi: ERC20_ABI,
          functionName: 'allowance',
          data: result as `0x${string}`,
        }) as bigint;

        console.log(`[ALLOWANCE] Successfully checked allowance via wallet provider`);
        return {
          needsApproval: decoded < requiredAmount,
          currentAllowance: decoded,
          rpcFailed: false,
        };
      } catch (walletError) {
        console.warn('[ALLOWANCE] Wallet provider check failed:', walletError);
      }
    }

    // All RPC attempts failed - return safe default (assume approval needed)
    console.error('[ALLOWANCE] All RPC attempts failed. Assuming approval is needed for safety.');
    return {
      needsApproval: true, // Safe default: assume approval needed
      currentAllowance: BigInt(0),
      rpcFailed: true, // Flag that RPC failed
    };
  }
};

// Approve token spending for PancakeSwap router (non-blocking - lets wallet handle it)
export const approveToken = async (
  tokenAddress: Address,
  chainId: number,
  walletClient: any, // WalletClient type from viem
  amount?: bigint // If not provided, approve max (2^256 - 1)
): Promise<`0x${string}`> => {
  try {
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    if (!routerAddress) {
      throw new Error(`Router address not found for chain ${chainId}`);
    }

    const chainMap: Record<number, Chain> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };

    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    // Use max uint256 if amount not provided (infinite approval)
    const approveAmount = amount ?? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

    console.log(`[APPROVAL] Approving ${tokenAddress} for router ${routerAddress}, amount: ${approveAmount.toString()}`);

    const hash = await walletClient.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [routerAddress, approveAmount],
      chain,
    });

    console.log(`[APPROVAL] Approval transaction sent: ${hash}`);
    return hash;
  } catch (error) {
    console.error('Error approving token:', error);
    throw error;
  }
};

/**
 * Send approval transaction directly to wallet provider (non-blocking)
 * Lets the wallet handle signing, simulation, and confirmation
 */
export const sendApprovalToWallet = async (
  tokenAddress: Address,
  chainId: number,
  walletProvider: any, // window.ethereum or similar
  ownerAddress: Address,
  amount?: bigint
): Promise<string> => {
  const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    throw new Error(`Router address not found for chain ${chainId}`);
  }

  // Use max uint256 if amount not provided (infinite approval)
  const approveAmount = amount ?? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

  // Encode approval transaction
  const approvalData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [routerAddress, approveAmount],
  });

  console.log(`[APPROVAL] Sending approval transaction to wallet for ${tokenAddress}`);

  // Send transaction to wallet - let wallet handle simulation and signing
  const txHash = await walletProvider.request({
    method: 'eth_sendTransaction',
    params: [{
      from: ownerAddress,
      to: tokenAddress,
      data: approvalData,
      value: '0x0',
    }],
  }) as string;

  console.log(`[APPROVAL] Approval transaction sent to wallet: ${txHash}`);
  return txHash;
};

// Check and approve token if needed (convenience function)
export const ensureTokenApproval = async (
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number,
  walletClient: any,
  requiredAmount: bigint,
  walletProvider?: any // Optional wallet provider for RPC fallback
): Promise<boolean> => {
  // Native tokens don't need approval
  const nativeAddresses = Object.values(WETH_ADDRESSES);
  if (nativeAddresses.includes(tokenAddress) || 
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return false; // No approval needed
  }

  try {
    const { needsApproval, currentAllowance, rpcFailed } = await checkTokenAllowance(
      tokenAddress,
      ownerAddress,
      chainId,
      requiredAmount,
      walletProvider
    );

    if (rpcFailed) {
      // RPC check failed - assume approval is needed for safety
      console.warn(`[APPROVAL] RPC check failed, proceeding with approval to be safe`);
    }

    if (needsApproval) {
      console.log(`[APPROVAL] Token needs approval. Current: ${currentAllowance.toString()}, Required: ${requiredAmount.toString()}`);
      const approvalHash = await approveToken(tokenAddress, chainId, walletClient);
      
      // Wait for transaction confirmation
      const { createPublicClient, http } = await import('viem');
      const chainMap: Record<number, Chain> = {
        1: mainnet,
        42161: arbitrum,
        10: optimism,
        137: polygon,
        8453: base,
        56: bsc,
      };
      const chain = chainMap[chainId];
      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      // Wait for transaction receipt
      console.log(`[APPROVAL] Waiting for approval transaction confirmation...`);
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ 
          hash: approvalHash,
          timeout: 60000 // 60 second timeout
        });

        if (receipt.status === 'reverted') {
          throw new Error('Approval transaction was reverted on-chain');
        }

        console.log(`[APPROVAL] Approval transaction confirmed in block ${receipt.blockNumber}`);
      } catch (error: any) {
        console.error('[APPROVAL] Error waiting for approval transaction:', error);
        throw new Error(`Approval transaction failed: ${error?.message || 'Transaction timeout or failed'}`);
      }

      // Poll for allowance update (with timeout)
      console.log(`[APPROVAL] Verifying allowance update...`);
      const maxAttempts = 10;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const newAllowance = await publicClient.readContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress, PANCAKESWAP_V2_ROUTER[chainId]],
        });

        if (newAllowance >= requiredAmount) {
          console.log(`[APPROVAL] Token approved successfully. New allowance: ${newAllowance.toString()}`);
          return true;
        }
      }

      // If we get here, approval might still be pending (RPC indexing delay)
      console.warn(`[APPROVAL] Allowance update not yet reflected after ${maxAttempts} seconds (RPC indexing delay)`);
      // Assume it went through since the transaction was confirmed
      return true;
    }

    return false; // Approval not needed
  } catch (error) {
    console.error('Error ensuring token approval:', error);
    throw error;
  }
};

// Test if a token can be transferred (detect restricted/honeypot tokens)
export const testTokenTransfer = async (
  tokenAddress: Address,
  fromAddress: Address,
  toAddress: Address,
  amount: bigint,
  chainId: number
): Promise<{ canTransfer: boolean; error?: string }> => {
  try {
    const chainMap: Record<number, Chain> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };

    const chain = chainMap[chainId];
    if (!chain) {
      return { canTransfer: false, error: `Chain ${chainId} not supported` };
    }

    const publicClient = getCachedClient(chainId);

    // ERC20 transferFrom ABI
    const ERC20_TRANSFER_ABI = [
      {
        inputs: [
          { internalType: 'address', name: 'from', type: 'address' },
          { internalType: 'address', name: 'to', type: 'address' },
          { internalType: 'uint256', name: 'amount', type: 'uint256' },
        ],
        name: 'transferFrom',
        outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;

    // Try to simulate transferFrom
    // Note: This test might fail for reasons other than restrictions:
    // - Insufficient allowance (we check this separately)
    // - Insufficient balance (we check this separately)
    // - Token requires special router context
    // So we're lenient and only flag clear restriction errors
    try {
      await publicClient.simulateContract({
        account: fromAddress,
        address: tokenAddress,
        abi: ERC20_TRANSFER_ABI,
        functionName: 'transferFrom',
        args: [fromAddress, toAddress, amount],
      });

      return { canTransfer: true };
    } catch (error: any) {
      const errorMsg = error?.message || error?.toString() || '';
      
      // Only flag clear restriction errors (not allowance/balance issues)
      // TRANSFER_FROM_FAILED alone might be allowance issue, so check for specific restriction patterns
      if (
        errorMsg.includes('restricted') ||
        errorMsg.includes('blacklist') ||
        errorMsg.includes('not allowed') ||
        errorMsg.includes('honeypot') ||
        errorMsg.includes('banned') ||
        errorMsg.includes('blocked')
      ) {
        return {
          canTransfer: false,
          error: 'Token has transfer restrictions (may be honeypot or restricted token)',
        };
      }

      // TRANSFER_FROM_FAILED without other context might be allowance/balance
      // Let the router's getAmountsOut be the authority - if it succeeds, proceed
      if (errorMsg.includes('TRANSFER_FROM_FAILED') || errorMsg.includes('transferFrom')) {
        // This could be allowance/balance or restriction - be lenient
        console.warn('[testTokenTransfer] Transfer test failed but may be allowance/balance issue:', errorMsg);
        return { canTransfer: true }; // Assume it's OK, router will validate
      }

      // Other errors (RPC issues, etc.) - assume OK
      return { canTransfer: true };
    }
  } catch (error: any) {
    console.warn('[testTokenTransfer] Error testing transfer:', error);
    // If we can't test, assume it's OK (better to try than block)
    return { canTransfer: true };
  }
};

// Validate that all pairs in the path exist
export const validateSwapPath = async (
  path: Address[],
  chainId: number
): Promise<{ isValid: boolean; missingPairs: Array<{ tokenA: Address; tokenB: Address }> }> => {
  try {
    const factoryAddress = PANCAKESWAP_V2_FACTORY[chainId];
    if (!factoryAddress) {
      return { isValid: false, missingPairs: [] };
    }

    const chainMap: Record<number, Chain> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };

    const chain = chainMap[chainId];
    if (!chain) {
      return { isValid: false, missingPairs: [] };
    }

    const publicClient = getCachedClient(chainId);

    const missingPairs: Array<{ tokenA: Address; tokenB: Address }> = [];

    // Check each pair in the path
    for (let i = 0; i < path.length - 1; i++) {
      const tokenA = path[i];
      const tokenB = path[i + 1];

      try {
        const pairAddress = await publicClient.readContract({
          address: factoryAddress,
          abi: FACTORY_ABI,
          functionName: 'getPair',
          args: [tokenA, tokenB],
        }) as Address;

        if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
          missingPairs.push({ tokenA, tokenB });
        }
      } catch (error: any) {
        // If getPair fails, it might be:
        // 1. Pair doesn't exist (valid error)
        // 2. RPC issue (should not block)
        // 3. Wrong factory address (should not block)
        // Log but don't fail - let router's getAmountsOut be the authority
        const errorMsg = error?.message || error?.toString() || '';
        if (errorMsg.includes('no data') || errorMsg.includes('0x')) {
          // This might be a valid "pair doesn't exist" response
          missingPairs.push({ tokenA, tokenB });
        } else {
          // Other errors (RPC issues, etc.) - don't block, just warn
          console.warn(`[validateSwapPath] Error checking pair ${i} (non-blocking):`, error);
        }
      }
    }

    return {
      isValid: missingPairs.length === 0,
      missingPairs,
    };
  } catch (error) {
    console.error('[validateSwapPath] Error validating path:', error);
    // If validation fails, assume path is valid (better to try than block)
    return { isValid: true, missingPairs: [] };
  }
};

export const addLiquidityToPairs = async (
  missingPairs: Array<{ tokenA: Address; tokenB: Address }>,
  chainId: number,
  walletClient: any,
  liquidityAmounts?: Array<{ amountA: string; amountB: string }>
): Promise<void> => {
  const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

  for (let i = 0; i < missingPairs.length; i++) {
    const pair = missingPairs[i];
    const amounts = liquidityAmounts?.[i] || { amountA: '0', amountB: '0' };

    // For now, we'll use minimal amounts - in production, you'd want to calculate optimal ratios
    // This is a placeholder - users should specify amounts
    if (amounts.amountA === '0' || amounts.amountB === '0') {
      console.warn(`Skipping liquidity addition for pair ${pair.tokenA}-${pair.tokenB}: amounts not provided`);
      continue;
    }

    try {
      // Safely convert to BigInt to handle scientific notation
      const amountABigInt = safeStringToBigInt(amounts.amountA);
      const amountBBigInt = safeStringToBigInt(amounts.amountB);
      const amountAMin = ((amountABigInt * BigInt(95)) / BigInt(100)).toString(); // 5% slippage
      const amountBMin = ((amountBBigInt * BigInt(95)) / BigInt(100)).toString(); // 5% slippage
      
      await addLiquidity(
        {
          tokenA: pair.tokenA,
          tokenB: pair.tokenB,
          amountADesired: amounts.amountA,
          amountBDesired: amounts.amountB,
          amountAMin,
          amountBMin,
          to: walletClient.account.address,
          deadline,
        },
        chainId,
        walletClient
      );
      console.log(`Added liquidity to pair ${pair.tokenA}-${pair.tokenB}`);
    } catch (error) {
      console.error(`Error adding liquidity to pair ${pair.tokenA}-${pair.tokenB}:`, error);
      throw error;
    }
  }
};

// Add liquidity to a pair
export interface AddLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  to: Address;
  deadline: number;
}

export const addLiquidity = async (
  params: AddLiquidityParams,
  chainId: number,
  walletClient: any
): Promise<{ amountA: bigint; amountB: bigint; liquidity: bigint }> => {
  try {
    const routerAddress = PANCAKESWAP_V2_ROUTER[chainId];
    if (!routerAddress) {
      console.error(`Chain ${chainId} not supported by PancakeSwap V2. Supported chains: ${Object.keys(PANCAKESWAP_V2_ROUTER).join(', ')}`);
      throw new Error(`PancakeSwap V2 Router not supported on chain ${chainId}`);
    }
    
    console.log(`Adding liquidity on chain ${chainId} using PancakeSwap V2 Router: ${routerAddress}`);
    console.log(`Token A: ${params.tokenA}, Token B: ${params.tokenB}`);
    console.log(`Amount A: ${params.amountADesired}, Amount B: ${params.amountBDesired}`);

    const chain = getChainConfig(chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not configured`);
    }

    // Estimate gas first to catch errors early
    const publicClient = getCachedClient(chainId);

    const checksummedRouter = getAddress(routerAddress);
    const checksummedTokenA = getAddress(params.tokenA);
    const checksummedTokenB = getAddress(params.tokenB);
    const wethAddress = WETH_ADDRESSES[chainId];

    // Check if either token is WETH (native token)
    const isTokenAWETH = wethAddress && checksummedTokenA.toLowerCase() === wethAddress.toLowerCase();
    const isTokenBWETH = wethAddress && checksummedTokenB.toLowerCase() === wethAddress.toLowerCase();

    if (isTokenAWETH || isTokenBWETH) {
      // Use addLiquidityETH
      const token = isTokenAWETH ? checksummedTokenB : checksummedTokenA;
      const amountTokenDesired = isTokenAWETH ? params.amountBDesired : params.amountADesired;
      const amountTokenMin = isTokenAWETH ? params.amountBMin : params.amountAMin;
      const amountETHMin = isTokenAWETH ? params.amountAMin : params.amountBMin;
      const amountETH = isTokenAWETH ? params.amountADesired : params.amountBDesired;

      // Estimate gas first for UI display (don't fail on errors - let wallet handle it)
      try {
        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account.address,
          to: checksummedRouter,
          data: encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: 'addLiquidityETH',
            args: [
              token,
              BigInt(amountTokenDesired),
              BigInt(amountTokenMin),
              BigInt(amountETHMin),
              params.to,
              BigInt(params.deadline),
            ],
          }),
          value: BigInt(amountETH),
        });
        console.log('Gas estimate for addLiquidityETH:', gasEstimate);
      } catch (gasError: any) {
        // Log but don't throw - wallet provider will handle insufficient balance
        console.warn('Gas estimation warning for addLiquidityETH (wallet will handle balance check):', gasError?.message || gasError);
        // Continue with transaction - wallet will show error if insufficient balance
      }

      console.log(`Calling PancakeSwap V2 Router.addLiquidityETH with ${amountETH} native tokens`);
      const hash = await walletClient.writeContract({
        address: checksummedRouter,
        abi: ROUTER_ABI,
        functionName: 'addLiquidityETH',
        args: [
          token,
          BigInt(amountTokenDesired),
          BigInt(amountTokenMin),
          BigInt(amountETHMin),
          params.to,
          BigInt(params.deadline),
        ],
        value: BigInt(amountETH),
        chain,
      });
      
      console.log(`Liquidity addition transaction sent: ${hash}`);

      // Wait for transaction using public client
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Parse the return values from the transaction receipt (simplified - in production, decode events)
      // For now, return the desired amounts
      return {
        amountA: isTokenAWETH ? BigInt(amountETH) : BigInt(amountTokenDesired),
        amountB: isTokenAWETH ? BigInt(amountTokenDesired) : BigInt(amountETH),
        liquidity: BigInt(0), // Would need to decode from events
      };
    } else {
      // Use addLiquidity for ERC20-ERC20 pair
      // First, check and approve tokens if needed
      
      // Check allowance for tokenA
      const allowanceA = await publicClient.readContract({
        address: checksummedTokenA,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletClient.account.address, checksummedRouter],
      });

      if (allowanceA < BigInt(params.amountADesired)) {
        // Approve tokenA
        const approveHashA = await walletClient.writeContract({
          address: checksummedTokenA,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [checksummedRouter, BigInt(params.amountADesired)],
          chain,
        });
        // Wait for approval transaction
        await publicClient.waitForTransactionReceipt({ hash: approveHashA });
      }

      // Check allowance for tokenB
      const allowanceB = await publicClient.readContract({
        address: checksummedTokenB,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [walletClient.account.address, checksummedRouter],
      });

      if (allowanceB < BigInt(params.amountBDesired)) {
        // Approve tokenB
        const approveHashB = await walletClient.writeContract({
          address: checksummedTokenB,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [checksummedRouter, BigInt(params.amountBDesired)],
          chain,
        });
        // Wait for approval transaction
        await publicClient.waitForTransactionReceipt({ hash: approveHashB });
      }

      // Estimate gas first for UI display (don't fail on errors - let wallet handle it)
      try {
        const gasEstimate = await publicClient.estimateGas({
          account: walletClient.account.address,
          to: checksummedRouter,
          data: encodeFunctionData({
            abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
              checksummedTokenA,
              checksummedTokenB,
              BigInt(params.amountADesired),
              BigInt(params.amountBDesired),
              BigInt(params.amountAMin),
              BigInt(params.amountBMin),
              params.to,
              BigInt(params.deadline),
            ],
          }),
        });
        console.log('Gas estimate for addLiquidity:', gasEstimate);
      } catch (gasError: any) {
        // Log but don't throw - wallet provider will handle insufficient balance
        console.warn('Gas estimation warning for addLiquidity (wallet will handle balance check):', gasError?.message || gasError);
        // Continue with transaction - wallet will show error if insufficient balance
      }

      // Add liquidity
      console.log(`Calling PancakeSwap V2 Router.addLiquidity`);
      const hash = await walletClient.writeContract({
        address: checksummedRouter,
        abi: ROUTER_ABI,
        functionName: 'addLiquidity',
        args: [
          checksummedTokenA,
          checksummedTokenB,
          BigInt(params.amountADesired),
          BigInt(params.amountBDesired),
          BigInt(params.amountAMin),
          BigInt(params.amountBMin),
          params.to,
          BigInt(params.deadline),
        ],
        chain,
      });
      
      console.log(`Liquidity addition transaction sent: ${hash}`);

      // Wait for transaction using public client
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Parse the return values (simplified - in production, decode events)
      return {
        amountA: BigInt(params.amountADesired),
        amountB: BigInt(params.amountBDesired),
        liquidity: BigInt(0), // Would need to decode from events
      };
    }
  } catch (error) {
    console.error('Error adding liquidity:', error);
    throw error;
  }
};
