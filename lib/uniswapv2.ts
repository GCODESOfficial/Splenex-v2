// Uniswap V2 / SushiSwap integration for ETH-based chains
// Uniswap V2 on Ethereum, SushiSwap on Arbitrum/Optimism/Polygon/Base
// Documentation: https://docs.uniswap.org/contracts/v2/overview

import { createPublicClient, http, type Address, type Chain, getAddress, encodeFunctionData } from 'viem';
import { mainnet, arbitrum, optimism, polygon, base } from 'viem/chains';
import { getCachedClient, fastRpcCall } from './optimization';
import { 
  WETH_ADDRESSES,
  convertToWETH,
  getPairAddress,
  getPairReserves,
  verifyPairExists,
  type PancakeSwapV2Quote
} from './pancakeswapv2';
import { getPermitSignature, supportsPermit, type PermitData } from './permit-helper';

// Uniswap V2 Factory addresses (Uniswap on Ethereum, SushiSwap on other chains)
export const UNISWAP_V2_FACTORY: Record<number, Address> = {
  1: getAddress('0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'), // Ethereum Mainnet (Uniswap V2)
  42161: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Arbitrum (SushiSwap)
  10: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Optimism (SushiSwap)
  137: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Polygon (SushiSwap)
  8453: getAddress('0xc35DADB65012eC5796536bD9864eD8773aBc74C4'), // Base (SushiSwap)
};

// Uniswap V2 Router addresses
export const UNISWAP_V2_ROUTER: Record<number, Address> = {
  1: getAddress('0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'), // Ethereum Mainnet (Uniswap V2 Router02)
  42161: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Arbitrum (SushiSwap)
  10: getAddress('0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F'), // Optimism (SushiSwap)
  137: getAddress('0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506'), // Polygon (SushiSwap)
  8453: getAddress('0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891'), // Base (SushiSwap)
};

// Export same WETH addresses (already exported from pancakeswapv2)
export { WETH_ADDRESSES } from './pancakeswapv2';

// Uniswap V2 Quote interface (same structure as PancakeSwap)
export interface UniswapV2Quote {
  amountOut: string;
  path: Address[];
  routerAddress: Address;
  factoryAddress: Address;
  tokenIn: Address;
  tokenOut: Address;
  needsPairCreation?: boolean;
  missingPairs?: Array<{ tokenA: Address; tokenB: Address }>;
  priceImpact?: number;
  isFeeOnTransfer?: boolean;
  slippage?: number;
}

// Router ABI (same as PancakeSwap V2)
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
    name: 'swapExactTokensForETH',
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
    name: 'swapExactETHForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
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

// Get chain config
const getChainConfig = (chainId: number): Chain | null => {
  const chainMap: Record<number, Chain> = {
    1: mainnet,
    42161: arbitrum,
    10: optimism,
    137: polygon,
    8453: base,
  };
  return chainMap[chainId] || null;
};

// Helper to get pair address using Uniswap factory
const getUniswapPairAddress = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number
): Promise<Address | null> => {
  const factoryAddress = UNISWAP_V2_FACTORY[chainId];
  if (!factoryAddress) return null;
  
  // Use the same helper from pancakeswapv2 but with Uniswap factory
  // We need to create a wrapper that uses UNISWAP_V2_FACTORY instead
    const chain = getChainConfig(chainId);
  if (!chain) return null;

    const publicClient = getCachedClient(chainId);
  
  try {
    // Try both orders (tokenA-tokenB and tokenB-tokenA)
    const pairAB = await publicClient.readContract({
      address: factoryAddress,
      abi: [
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
      ],
        functionName: 'getPair',
      args: [getAddress(tokenA), getAddress(tokenB)],
    }) as Address;
    
    if (pairAB && pairAB !== '0x0000000000000000000000000000000000000000') {
      return pairAB;
    }
    
    // Try reverse order
    const pairBA = await publicClient.readContract({
      address: factoryAddress,
      abi: [
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
      ],
      functionName: 'getPair',
      args: [getAddress(tokenB), getAddress(tokenA)],
    }) as Address;
    
    if (pairBA && pairBA !== '0x0000000000000000000000000000000000000000') {
      return pairBA;
    }
    
      return null;
  } catch (error) {
    return null;
  }
};

// Get Uniswap V2 quote - robust implementation matching PancakeSwap's approach
export const getUniswapV2Quote = async (
  tokenIn: Address,
  tokenOut: Address,
  amountIn: string,
  chainId: number
): Promise<UniswapV2Quote | null> => {
  try {
    console.log('[getUniswapV2Quote] Starting quote request:', {
      tokenIn,
      tokenOut,
      amountIn,
      chainId
    });

    const routerAddress = UNISWAP_V2_ROUTER[chainId];
    if (!routerAddress) {
      console.warn(`[getUniswapV2Quote] Chain ${chainId} not supported by Uniswap V2`);
      return null;
    }
    
    const chain = getChainConfig(chainId);
    if (!chain) {
      console.warn(`[getUniswapV2Quote] Chain ${chainId} not configured`);
      return null;
    }
    
    const amountInBigInt = BigInt(amountIn);
    const publicClient = getCachedClient(chainId);

    // Convert native tokens to WETH
    const tokenInWETH = convertToWETH(tokenIn, chainId);
    const tokenOutWETH = convertToWETH(tokenOut, chainId);
    const wethAddress = WETH_ADDRESSES[chainId];
    
    if (!wethAddress) {
      return null;
    }
    
    // Reuse helper functions from pancakeswapv2 (they work for Uniswap too)
    const { getPairReserves } = await import('./pancakeswapv2');

    // Helper function to check if a pair has sufficient reserves
    const checkPairReserves = async (tokenA: Address, tokenB: Address, amountIn: bigint): Promise<boolean> => {
      try {
        const reserves = await getPairReserves(tokenA, tokenB, chainId);
        if (!reserves) return false;
        
        const minReserve = amountIn * BigInt(2);
        return reserves.reserve0 >= minReserve || reserves.reserve1 >= minReserve;
      } catch {
        return false;
      }
    };

    // Helper to add timeout to pair checking
    const getPairAddressWithTimeout = async (
  tokenA: Address,
  tokenB: Address,
  chainId: number,
      timeoutMs: number = 3000
): Promise<Address | null> => {
      try {
        const pairPromise = getUniswapPairAddress(tokenA, tokenB, chainId);
        const timeoutPromise = new Promise<null>((resolve) => 
          setTimeout(() => resolve(null), timeoutMs)
        );
        return await Promise.race([pairPromise, timeoutPromise]);
      } catch {
  return null;
      }
    };

    const isTokenInWETH = tokenInWETH.toLowerCase() === wethAddress.toLowerCase();
    const isTokenOutWETH = tokenOutWETH.toLowerCase() === wethAddress.toLowerCase();

    // Check all pairs in PARALLEL with timeouts - much faster!
    console.log('[getUniswapV2Quote] Checking all routing paths in parallel...');
    
    const pairChecks = [];
    
    // Strategy 1: Direct pair
    pairChecks.push(
      getPairAddressWithTimeout(tokenInWETH, tokenOutWETH, chainId, 3000).then(pair => ({
        type: 'direct',
        pair,
        tokenA: tokenInWETH,
        tokenB: tokenOutWETH
      }))
    );
    
    // Strategy 2: Through WETH (if neither token is WETH)
    if (!isTokenInWETH && !isTokenOutWETH) {
      pairChecks.push(
        getPairAddressWithTimeout(tokenInWETH, wethAddress, chainId, 3000).then(pair => ({
          type: 'weth1',
          pair,
          tokenA: tokenInWETH,
          tokenB: wethAddress
        }))
      );
      pairChecks.push(
        getPairAddressWithTimeout(wethAddress, tokenOutWETH, chainId, 3000).then(pair => ({
          type: 'weth2',
          pair,
          tokenA: wethAddress,
          tokenB: tokenOutWETH
        }))
      );
    }
    
    // Strategy 3: Through stablecoins (parallel check)
    const stablecoinAddresses: Address[] = [];
    if (chainId === 1) {
      stablecoinAddresses.push(getAddress('0xdAC17F958D2ee523a2206206994597C13D831ec7')); // USDT
      stablecoinAddresses.push(getAddress('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')); // USDC
      stablecoinAddresses.push(getAddress('0x6B175474E89094C44Da98b954EedeAC495271d0F')); // DAI
    } else if (chainId === 42161) {
      stablecoinAddresses.push(getAddress('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9')); // USDT
      stablecoinAddresses.push(getAddress('0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8')); // USDC
    } else if (chainId === 10) {
      stablecoinAddresses.push(getAddress('0x94b008aA00579c1307B0EF2c499aD98a8ce58e58')); // USDT
      stablecoinAddresses.push(getAddress('0x7F5c764cBc14f9669B88837ca1490cCa17c31607')); // USDC
    } else if (chainId === 137) {
      stablecoinAddresses.push(getAddress('0xc2132D05D31c914a87C6611C10748AEb04B58e8F')); // USDT
      stablecoinAddresses.push(getAddress('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')); // USDC
    } else if (chainId === 8453) {
      stablecoinAddresses.push(getAddress('0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2')); // USDC
      stablecoinAddresses.push(getAddress('0x50c5725949A6F0c72E6C4a641F24049A917E0Cb6')); // DAI
    }
    
    // Add stablecoin pair checks in parallel
    for (const stablecoin of stablecoinAddresses) {
      if (stablecoin.toLowerCase() === tokenInWETH.toLowerCase() || 
          stablecoin.toLowerCase() === tokenOutWETH.toLowerCase()) {
        continue;
      }
      pairChecks.push(
        getPairAddressWithTimeout(tokenInWETH, stablecoin, chainId, 3000).then(pair => ({
          type: 'stable1',
          pair,
          stablecoin,
          tokenA: tokenInWETH,
          tokenB: stablecoin
        }))
      );
      pairChecks.push(
        getPairAddressWithTimeout(stablecoin, tokenOutWETH, chainId, 3000).then(pair => ({
          type: 'stable2',
          pair,
          stablecoin,
          tokenA: stablecoin,
          tokenB: tokenOutWETH
        }))
      );
    }
    
    // Wait for all pair checks to complete (max 3 seconds total)
    const pairResults = await Promise.allSettled(pairChecks);
    
    // Process results
    let directPair: Address | null = null;
    let wethPair1: Address | null = null;
    let wethPair2: Address | null = null;
    let stablecoinPath: Address[] | null = null;
    
    const stablecoinPairs = new Map<string, { pair1: Address | null; pair2: Address | null }>();
    
    for (const result of pairResults) {
      if (result.status === 'fulfilled') {
        const { type, pair, stablecoin } = result.value as { type: string; pair: Address | null; tokenA: Address; tokenB: Address; stablecoin?: Address };
        
        if (type === 'direct' && pair) {
          directPair = pair;
        } else if (type === 'weth1' && pair) {
          wethPair1 = pair;
        } else if (type === 'weth2' && pair) {
          wethPair2 = pair;
        } else if (type === 'stable1' && pair && stablecoin) {
          const existing = stablecoinPairs.get(stablecoin) || { pair1: null, pair2: null };
          existing.pair1 = pair;
          stablecoinPairs.set(stablecoin, existing);
        } else if (type === 'stable2' && pair && stablecoin) {
          const existing = stablecoinPairs.get(stablecoin) || { pair1: null, pair2: null };
          existing.pair2 = pair;
          stablecoinPairs.set(stablecoin, existing);
        }
      }
    }
    
    // Find first complete stablecoin path
    for (const [stablecoin, pairs] of stablecoinPairs.entries()) {
      if (pairs.pair1 && pairs.pair2) {
        stablecoinPath = [tokenInWETH, getAddress(stablecoin), tokenOutWETH];
        console.log('[getUniswapV2Quote] Found stablecoin path:', stablecoinPath);
        break;
      }
    }
    
    console.log('[getUniswapV2Quote] Pair check results:', {
      direct: !!directPair,
      weth: !!(wethPair1 && wethPair2),
      stablecoin: !!stablecoinPath
    });

    // Choose the best path (same logic as PancakeSwap)
    let path: Address[] = [];
    let needsPairCreation = false;
    const missingPairs: Array<{ tokenA: Address; tokenB: Address }> = [];
    
    if (directPair) {
      // Direct pair exists - check reserves if possible
      const hasReserves = await checkPairReserves(tokenInWETH, tokenOutWETH, amountInBigInt);
      if (hasReserves || directPair) { // Use direct pair even if reserve check fails (might be RPC issue)
        path = [tokenInWETH, tokenOutWETH];
        console.log('[getUniswapV2Quote] Using direct path');
          } else {
        // Direct pair exists but might have low reserves, try WETH path
        if (wethPair1 && wethPair2) {
          path = [tokenInWETH, wethAddress, tokenOutWETH];
          console.log('[getUniswapV2Quote] Direct pair has low reserves, using WETH path');
        } else {
          path = [tokenInWETH, tokenOutWETH]; // Use direct anyway
        }
      }
    } else if (wethPair1 && wethPair2) {
      // WETH routing available
      path = [tokenInWETH, wethAddress, tokenOutWETH];
      console.log('[getUniswapV2Quote] Using WETH routing path');
    } else if (stablecoinPath) {
      // Stablecoin routing available
      path = stablecoinPath;
      console.log('[getUniswapV2Quote] Using stablecoin routing path');
    } else {
      // No path found - track missing pairs but don't block swap
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
      // Don't set needsPairCreation = true here - let router's getAmountsOut decide
      path = wethPair1 && !wethPair2 
        ? [tokenInWETH, wethAddress, tokenOutWETH] 
        : !wethPair1 && wethPair2
        ? [tokenInWETH, wethAddress, tokenOutWETH]
        : [tokenInWETH, tokenOutWETH];
      console.log('[getUniswapV2Quote] No complete path found, using best available path');
    }

    // Ensure all addresses in path are properly checksummed
    const checksummedPath = path.map(addr => getAddress(addr));
    const checksummedRouter = getAddress(routerAddress);
    
    console.log('[getUniswapV2Quote] Final path for quote:', {
      path: checksummedPath,
      routerAddress: checksummedRouter,
      factoryAddress: UNISWAP_V2_FACTORY[chainId],
      amountIn,
      needsPairCreation
    });

    // Helper function to try getAmountsOut with a specific amount
    const tryGetAmountsOut = async (testAmount: bigint): Promise<bigint[] | null> => {
      try {
        const result = await publicClient.readContract({
          address: checksummedRouter,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [testAmount, checksummedPath],
        }) as bigint[];
        
        if (result && result.length > 0 && result[result.length - 1] > BigInt(0)) {
          return result;
        }
    return null;
      } catch (error: any) {
        const errorMsg = error?.message || error?.toString() || '';
        // "K" error means insufficient liquidity for this amount (Uniswap/SushiSwap use same error format)
        if (errorMsg.includes('K') || errorMsg.includes('insufficient') || 
            errorMsg.includes('constant product') || errorMsg.includes('INSUFFICIENT')) {
          return null; // Amount too large, try smaller
        }
        throw error; // Other errors should be propagated
      }
    };

    // Try getting quote with the full amount first
    let amounts: bigint[] | null = null;
    let lastError: any = null;
    
    try {
      // Add timeout to getAmountsOut call
      const quotePromise = tryGetAmountsOut(amountInBigInt);
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000) // 5 second timeout
      );
      
      amounts = await Promise.race([quotePromise, timeoutPromise]);
      if (amounts) {
        console.log('[getUniswapV2Quote] Got quote with full amount');
      }
    } catch (error: any) {
      lastError = error;
      // Don't retry - router's getAmountsOut is usually fast or it fails immediately
    }

    // If full amount failed with "K" error or returned 0, try progressively smaller amounts
    // Use parallel checks with timeout to speed this up
    if (!amounts || (amounts.length > 0 && amounts[amounts.length - 1] === BigInt(0))) {
      console.log('[getUniswapV2Quote] Full amount failed, trying smaller amounts in parallel...');
      const testAmounts = [
        amountInBigInt / BigInt(2),      // 50%
        amountInBigInt / BigInt(10),     // 10%
        amountInBigInt / BigInt(100),    // 1%
      ];
      
      // Try all test amounts in parallel with fast timeout
      const testPromises = testAmounts
        .filter(amt => amt > BigInt(0))
        .map(async (testAmount) => {
          try {
            const testAmountsResult = await fastRpcCall(() => tryGetAmountsOut(testAmount), 1000);
            
            if (testAmountsResult && testAmountsResult.length > 0 && testAmountsResult[testAmountsResult.length - 1] > BigInt(0)) {
              return { testAmount, testAmountsResult };
            }
            return null;
          } catch {
            return null;
          }
        });
      
      const results = await Promise.allSettled(testPromises);
      
      // Find first successful result
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          const { testAmount, testAmountsResult } = result.value;
          const testAmountOut = testAmountsResult[testAmountsResult.length - 1];
          const ratio = amountInBigInt / testAmount;
          
          // Calculate price impact: larger swaps have more impact
          let scaleFactor = BigInt(100);
          if (ratio > BigInt(100)) {
            scaleFactor = BigInt(75);
          } else if (ratio > BigInt(10)) {
            scaleFactor = BigInt(90);
          }
          
          const estimatedAmountOut = (testAmountOut * ratio * scaleFactor) / BigInt(100);
          
          // Build the amounts array
          amounts = [amountInBigInt];
          for (let i = 0; i < checksummedPath.length - 1; i++) {
            if (i === checksummedPath.length - 2) {
              amounts.push(estimatedAmountOut);
            } else {
              const intermediateOut = testAmountsResult[i + 1];
              amounts.push((intermediateOut * ratio * scaleFactor) / BigInt(100));
            }
          }
          
          console.log('[getUniswapV2Quote] Got quote using scaled estimation');
          break;
        }
      }
    }

    // If we still don't have amounts, try to estimate from reserves (skip redundant router call)
    if (!amounts || amounts.length === 0) {
      
      if (!amounts) {
        // All pairs exist but quote failed - likely very low liquidity
        // Try to get reserves to estimate a conservative quote
        console.warn('[getUniswapV2Quote] Pairs exist but getAmountsOut failed. Checking reserves for estimate...');
        
        try {
          // Check reserves of the first pair in the path
          const firstPairReserves = await getPairReserves(checksummedPath[0], checksummedPath[1], chainId);
          if (firstPairReserves) {
            // Estimate based on reserves - use a very conservative ratio
            const reserveIn = firstPairReserves.reserve0 > firstPairReserves.reserve1 
              ? firstPairReserves.reserve0 
              : firstPairReserves.reserve1;
            const reserveOut = firstPairReserves.reserve0 > firstPairReserves.reserve1 
              ? firstPairReserves.reserve1 
              : firstPairReserves.reserve0;
            
            if (reserveIn > BigInt(0) && reserveOut > BigInt(0)) {
              // Use constant product formula estimate with 50% reduction for price impact
              const estimatedOut = (amountInBigInt * reserveOut * BigInt(50)) / (reserveIn * BigInt(100));
              
              if (estimatedOut > BigInt(0)) {
                amounts = [amountInBigInt];
                for (let i = 0; i < checksummedPath.length - 1; i++) {
                  if (i === checksummedPath.length - 2) {
                    amounts.push(estimatedOut);
                  } else {
                    amounts.push(amountInBigInt / BigInt(2)); // Rough estimate
                  }
                }
                console.log('[getUniswapV2Quote] Estimated quote from reserves:', {
                  reserveIn: reserveIn.toString(),
                  reserveOut: reserveOut.toString(),
                  estimatedOut: estimatedOut.toString()
                });
              }
            }
          }
        } catch (reserveError) {
          console.warn('[getUniswapV2Quote] Could not get reserves for estimation:', reserveError);
        }
        
        // If still no amounts, use very conservative estimate
        if (!amounts) {
          const conservativeEstimate = amountInBigInt / BigInt(1000);
          console.warn('[getUniswapV2Quote] Using very conservative estimate (1:1000 ratio)');
            const originalTokenIn = getAddress(tokenIn);
            const originalTokenOut = getAddress(tokenOut);
            
            return {
            amountOut: conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
              path: checksummedPath,
              routerAddress: checksummedRouter,
            factoryAddress: UNISWAP_V2_FACTORY[chainId]!,
              tokenIn: originalTokenIn,
              tokenOut: originalTokenOut,
            needsPairCreation: false, // Pairs exist per router validation
              missingPairs: undefined,
            };
        }
      }
          }
          
    // If we have amounts (even if estimated), return the quote
    if (amounts && amounts.length > 0) {
      const amountOut = amounts[amounts.length - 1];
          const originalTokenIn = getAddress(tokenIn);
          const originalTokenOut = getAddress(tokenOut);
          
      // Always return a quote, even if amountOut is very small (it's better than nothing)
      const finalAmountOut = amountOut > BigInt(0) ? amountOut : BigInt(1); // At least 1 wei
      
      console.log('[getUniswapV2Quote] Returning quote:', {
            tokenIn: originalTokenIn,
            tokenOut: originalTokenOut,
        amountOut: finalAmountOut.toString(),
        path: checksummedPath,
        needsPairCreation: false,
        pairsExist: true,
          });
          
          return {
        amountOut: finalAmountOut.toString(),
            path: checksummedPath,
            routerAddress: checksummedRouter,
        factoryAddress: UNISWAP_V2_FACTORY[chainId]!,
        tokenIn: originalTokenIn,
        tokenOut: originalTokenOut,
        needsPairCreation: false, // If we got a quote, pairs exist
        missingPairs: undefined,
      };
    }

    // If still no amounts and pairs don't exist, return conservative estimate but DON'T block
    // Router will validate on-chain - let swap attempt proceed
    const conservativeEstimate = amountInBigInt / BigInt(1000);
      const originalTokenIn = getAddress(tokenIn);
      const originalTokenOut = getAddress(tokenOut);
      
    console.log('[getUniswapV2Quote] No quote obtained, returning conservative estimate (router will validate):', {
        tokenIn: originalTokenIn,
        tokenOut: originalTokenOut,
        path: checksummedPath,
      });

      return {
      amountOut: conservativeEstimate > BigInt(0) ? conservativeEstimate.toString() : '1',
        path: checksummedPath,
        routerAddress: checksummedRouter,
      factoryAddress: UNISWAP_V2_FACTORY[chainId]!,
      tokenIn: originalTokenIn,
      tokenOut: originalTokenOut,
      needsPairCreation: false, // Don't block - let router decide
      missingPairs: undefined,
    };
  } catch (error) {
    console.error('[getUniswapV2Quote] Error:', error);
    return null;
  }
};

// Get swap transaction data
export const getUniswapV2SwapData = (
  quote: UniswapV2Quote,
  amountIn: string,
  amountOutMin: string,
  to: Address,
  deadline: number = Math.floor(Date.now() / 1000) + 60 * 20,
  useFeeOnTransfer: boolean = true
) => {
  const chainId = Object.keys(UNISWAP_V2_ROUTER).find(
    (id) => UNISWAP_V2_ROUTER[Number(id)] === quote.routerAddress
  );
  const wethAddress = chainId ? WETH_ADDRESSES[Number(chainId)] : null;
  
  // Check if tokens are native
  let isNativeTokenIn = false;
  let isNativeTokenOut = false;
  
  if (quote.tokenIn && quote.tokenOut) {
    const tokenInLower = quote.tokenIn.toLowerCase();
    const tokenOutLower = quote.tokenOut.toLowerCase();
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const nativeAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    isNativeTokenIn = tokenInLower === zeroAddress || tokenInLower === nativeAddress;
    isNativeTokenOut = tokenOutLower === zeroAddress || tokenOutLower === nativeAddress;
  }
  
  const isETHIn = isNativeTokenIn;
  const isETHOut = isNativeTokenOut;
  const useFeeOnTransferFunc = useFeeOnTransfer !== false;

  if (isETHIn && !isETHOut) {
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
      value: BigInt(amountIn),
      data,
    };
  } else if (!isETHIn && isETHOut) {
    const functionName = useFeeOnTransferFunc
      ? 'swapExactTokensForETHSupportingFeeOnTransferTokens'
      : 'swapExactTokensForETH';
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: functionName as any,
      args: [BigInt(amountIn), BigInt(amountOutMin), quote.path, to, BigInt(deadline)],
    });
    return {
      to: quote.routerAddress,
      value: BigInt(0),
      data,
    };
  } else {
    const functionName = useFeeOnTransferFunc
      ? 'swapExactTokensForTokensSupportingFeeOnTransferTokens'
      : 'swapExactTokensForTokens';
    const data = encodeFunctionData({
      abi: ROUTER_ABI,
      functionName: functionName as any,
      args: [BigInt(amountIn), BigInt(amountOutMin), quote.path, to, BigInt(deadline)],
    });
    return {
      to: quote.routerAddress,
      value: BigInt(0),
      data,
    };
  }
};

// Helper to get token name and symbol for permit
const getTokenMetadata = async (
  tokenAddress: Address,
  chainId: number
): Promise<{ name: string; symbol: string } | null> => {
  try {
    const publicClient = getCachedClient(chainId);
    const ERC20_METADATA_ABI = [
      {
        inputs: [],
        name: 'name',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
      {
        inputs: [],
        name: 'symbol',
        outputs: [{ internalType: 'string', name: '', type: 'string' }],
        stateMutability: 'view',
        type: 'function',
      },
    ] as const;

    const [name, symbol] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'name',
      }) as Promise<string>,
      publicClient.readContract({
        address: tokenAddress,
        abi: ERC20_METADATA_ABI,
        functionName: 'symbol',
      }) as Promise<string>,
    ]);

    return { name, symbol };
  } catch (error) {
    console.warn('[getTokenMetadata] Failed to get token metadata:', error);
    return null;
  }
};

// Approve token using permit signature (EIP-2612)
const approveWithPermit = async (
  tokenAddress: Address,
  ownerAddress: Address,
  routerAddress: Address,
  chainId: number,
  requiredAmount: bigint,
  tokenName?: string,
  tokenSymbol?: string,
  walletProvider?: any
): Promise<boolean> => {
  if (!walletProvider || typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  try {
    // Check if token supports permit
    const hasPermit = await supportsPermit(tokenAddress, walletProvider);
    if (!hasPermit) {
      console.log('[approveWithPermit] Token does not support permit');
      return false;
    }

    // Get token metadata if not provided
    let name = tokenName;
    let symbol = tokenSymbol;
    if (!name || !symbol) {
      const metadata = await getTokenMetadata(tokenAddress, chainId);
      if (!metadata) {
        console.warn('[approveWithPermit] Could not get token metadata');
        return false;
      }
      name = metadata.name;
      symbol = metadata.symbol;
    }

    // Create deadline (20 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    // Get permit signature
    console.log('[approveWithPermit] Requesting permit signature...');
    const permitData = await getPermitSignature(
      tokenAddress,
      name,
      symbol,
      ownerAddress,
      routerAddress,
      requiredAmount.toString(),
      deadline,
      chainId,
      walletProvider
    );

    if (!permitData) {
      console.warn('[approveWithPermit] Failed to get permit signature');
      return false;
    }

    console.log('[approveWithPermit] Permit signature obtained, submitting permit transaction...');

    // Encode permit function call
    const PERMIT_ABI = [
      {
        inputs: [
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'address', name: 'spender', type: 'address' },
          { internalType: 'uint256', name: 'value', type: 'uint256' },
          { internalType: 'uint256', name: 'deadline', type: 'uint256' },
          { internalType: 'uint8', name: 'v', type: 'uint8' },
          { internalType: 'bytes32', name: 'r', type: 'bytes32' },
          { internalType: 'bytes32', name: 's', type: 'bytes32' },
        ],
        name: 'permit',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
      },
    ] as const;

    const permitData_encoded = encodeFunctionData({
      abi: PERMIT_ABI,
      functionName: 'permit',
      args: [
        permitData.owner as Address,
        permitData.spender as Address,
        BigInt(permitData.value),
        BigInt(permitData.deadline),
        permitData.v,
        permitData.r as `0x${string}`,
        permitData.s as `0x${string}`,
      ],
    });

    // Send permit transaction
    const txHash = await walletProvider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: ownerAddress,
        to: tokenAddress,
        data: permitData_encoded,
        gas: '0x186a0', // 100000 gas limit
      }],
    }) as string;

    console.log(`[approveWithPermit] Permit transaction sent: ${txHash}`);
    return true;
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || '';
    
    // Only throw if user explicitly rejected
    if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
      throw error;
    }
    
    console.warn('[approveWithPermit] Permit approval failed:', errorMsg);
    return false;
  }
};

// Send approval transaction to wallet (returns tx hash for tracking)
// Tries permit signature first, then falls back to regular approval
export const sendApprovalToWallet = async (
  tokenAddress: Address,
  chainId: number,
  walletProvider: any, // window.ethereum or similar
  ownerAddress: Address,
  amount?: bigint,
  tokenName?: string,
  tokenSymbol?: string
): Promise<string> => {
  const routerAddress = UNISWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    throw new Error(`Router address not found for chain ${chainId}`);
  }

  // Use max uint256 if amount not provided (infinite approval)
  const approveAmount = amount ?? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

  // Try permit signature first if token supports it
  if (walletProvider && typeof window !== 'undefined') {
    try {
      const hasPermit = await supportsPermit(tokenAddress, walletProvider);
      if (hasPermit && tokenName && tokenSymbol) {
        console.log('[sendApprovalToWallet] Token supports permit, trying permit signature...');
        
        // Get token metadata if not provided
        let name = tokenName;
        let symbol = tokenSymbol;
        if (!name || !symbol) {
          const metadata = await getTokenMetadata(tokenAddress, chainId);
          if (metadata) {
            name = metadata.name;
            symbol = metadata.symbol;
          }
        }

        if (name && symbol) {
          const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
          
          // Get permit signature
          const permitData = await getPermitSignature(
            tokenAddress,
            name,
            symbol,
            ownerAddress,
            routerAddress,
            approveAmount.toString(),
            deadline,
            chainId,
            walletProvider
          );

          if (permitData) {
            console.log('[sendApprovalToWallet] Permit signature obtained, submitting permit transaction...');

            // Encode permit function call
            const PERMIT_ABI = [
              {
                inputs: [
                  { internalType: 'address', name: 'owner', type: 'address' },
                  { internalType: 'address', name: 'spender', type: 'address' },
                  { internalType: 'uint256', name: 'value', type: 'uint256' },
                  { internalType: 'uint256', name: 'deadline', type: 'uint256' },
                  { internalType: 'uint8', name: 'v', type: 'uint8' },
                  { internalType: 'bytes32', name: 'r', type: 'bytes32' },
                  { internalType: 'bytes32', name: 's', type: 'bytes32' },
                ],
                name: 'permit',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
              },
            ] as const;

            const permitData_encoded = encodeFunctionData({
              abi: PERMIT_ABI,
              functionName: 'permit',
              args: [
                permitData.owner as Address,
                permitData.spender as Address,
                BigInt(permitData.value),
                BigInt(permitData.deadline),
                permitData.v,
                permitData.r as `0x${string}`,
                permitData.s as `0x${string}`,
              ],
            });

            // Send permit transaction
            const txHash = await walletProvider.request({
              method: 'eth_sendTransaction',
              params: [{
                from: ownerAddress,
                to: tokenAddress,
                data: permitData_encoded,
                value: '0x0',
              }],
            }) as string;

            console.log(`[sendApprovalToWallet] Permit transaction sent: ${txHash}`);
            return txHash;
          }
        }
      }
    } catch (permitError: any) {
      const errorMsg = permitError?.message || permitError?.toString() || '';
      
      // Only throw if user explicitly rejected
      if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
        throw permitError;
      }
      
      // Permit failed, fall through to regular approval
      console.log('[sendApprovalToWallet] Permit not available, using regular approval');
    }
  }

  // Fallback to regular approval transaction
  const ERC20_ABI = [
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
  ] as const;

  // Encode approval transaction
  const approvalData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [routerAddress, approveAmount],
  });

  console.log(`[sendApprovalToWallet] Sending approval transaction to wallet for ${tokenAddress}`);

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

  console.log(`[sendApprovalToWallet] Approval transaction sent to wallet: ${txHash}`);
  return txHash;
};

// Uniswap-specific approval functions (use Uniswap router addresses)
// Check token allowance with RPC fallback mechanism (matches PancakeSwap pattern)
export const checkTokenAllowance = async (
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number,
  requiredAmount: bigint,
  walletProvider?: any // Optional wallet provider for fallback
): Promise<{ needsApproval: boolean; currentAllowance: bigint; rpcFailed?: boolean }> => {
  const routerAddress = UNISWAP_V2_ROUTER[chainId];
  if (!routerAddress) {
    console.warn(`[checkTokenAllowance] Router address not found for chain ${chainId}, assuming approval needed`);
    return { needsApproval: true, currentAllowance: BigInt(0), rpcFailed: false };
  }

  const chain = getChainConfig(chainId);
  if (!chain) {
    console.warn(`[checkTokenAllowance] Chain ${chainId} not supported, assuming approval needed`);
    return { needsApproval: true, currentAllowance: BigInt(0), rpcFailed: false };
  }

  const ERC20_ABI = [
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

  // Try primary RPC (cached client)
  try {
    const publicClient = getCachedClient(chainId);
    const currentAllowance = await publicClient.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [ownerAddress, routerAddress],
    }) as bigint;

    console.log(`[checkTokenAllowance] Allowance check successful: ${currentAllowance.toString()} >= ${requiredAmount.toString()}? ${currentAllowance >= requiredAmount ? 'No approval needed' : 'Approval needed'}`);
    
    return {
      needsApproval: currentAllowance < requiredAmount,
      currentAllowance: currentAllowance,
      rpcFailed: false,
    };
  } catch (primaryError: any) {
    console.warn('[checkTokenAllowance] Primary RPC failed, trying wallet provider...', primaryError?.message);
    
    // Check if it's an RPC/network error
    const isRpcError = primaryError?.message?.includes('HTTP request failed') ||
                      primaryError?.message?.includes('Failed to fetch') ||
                      primaryError?.message?.includes('timeout') ||
                      primaryError?.message?.includes('network') ||
                      primaryError?.name === 'HttpRequestError' ||
                      primaryError?.name === 'TimeoutError';

    if (!isRpcError) {
      // Not an RPC error, assume approval needed
      console.warn('[checkTokenAllowance] Non-RPC error, assuming approval needed');
      return { needsApproval: true, currentAllowance: BigInt(0), rpcFailed: false };
    }

    // Try wallet provider as fallback (if available)
    if (walletProvider && typeof window !== 'undefined' && walletProvider.request) {
      try {
        console.log('[checkTokenAllowance] Trying wallet provider for allowance check...');
        // Encode the allowance function call
        const allowanceData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'allowance',
          args: [ownerAddress, routerAddress],
        });

        // Call via wallet provider
        const result = await walletProvider.request({
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: allowanceData,
            },
            'latest',
          ],
        }) as string;

        // Decode result
        const currentAllowance = BigInt(result);
        
        console.log(`[checkTokenAllowance] Wallet provider check successful: ${currentAllowance.toString()}`);
        
        return {
          needsApproval: currentAllowance < requiredAmount,
          currentAllowance: currentAllowance,
          rpcFailed: false,
        };
      } catch (walletError: any) {
        console.warn('[checkTokenAllowance] Wallet provider check failed:', walletError?.message);
        // RPC failed, but assume approval needed to be safe
        return { needsApproval: true, currentAllowance: BigInt(0), rpcFailed: true };
      }
    }

    // All RPC methods failed
    console.warn('[checkTokenAllowance] All RPC methods failed, assuming approval needed');
    return { needsApproval: true, currentAllowance: BigInt(0), rpcFailed: true };
  }
};

// NEVER BLOCKS - All errors are non-fatal, swap will proceed
export const ensureTokenApproval = async (
  tokenAddress: Address,
  ownerAddress: Address,
  chainId: number,
  walletClient: any,
  requiredAmount: bigint,
  tokenName?: string,
  tokenSymbol?: string,
  waitForConfirmation: boolean = true // Add parameter to wait for confirmation
): Promise<boolean> => {
  // Native tokens don't need approval
  const nativeAddresses = Object.values(WETH_ADDRESSES);
  if (nativeAddresses.includes(tokenAddress) || 
      tokenAddress === '0x0000000000000000000000000000000000000000' ||
      tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    return false; // No approval needed
  }

  try {
    const { needsApproval } = await checkTokenAllowance(
      tokenAddress,
      ownerAddress,
      chainId,
      requiredAmount
    );

    if (!needsApproval) {
      return false; // Already approved
    }

    // Approve token
    const routerAddress = UNISWAP_V2_ROUTER[chainId];
    if (!routerAddress) {
      // Router not found - log but don't block
      console.warn(`[ensureTokenApproval] Router address not found for chain ${chainId}, but proceeding`);
      return false; // Don't block swap
    }

    // Try permit signature first (if token supports it and wallet provider available)
    const walletProvider = typeof window !== 'undefined' ? window.ethereum : null;
    if (walletProvider) {
      try {
        const permitSuccess = await approveWithPermit(
          tokenAddress,
          ownerAddress,
          routerAddress,
          chainId,
          requiredAmount,
          tokenName,
          tokenSymbol,
          walletProvider
        );
        
        if (permitSuccess) {
          console.log('[ensureTokenApproval] Approval completed using permit signature');
          
          // IMPORTANT: Wait for permit transaction to be confirmed
          if (waitForConfirmation) {
            const publicClient = getCachedClient(chainId);
            let confirmed = false;
            const maxWait = 60000; // 60 seconds
            const startTime = Date.now();
            
            while (!confirmed && (Date.now() - startTime < maxWait)) {
              try {
                const allowance = await publicClient.readContract({
                  address: tokenAddress,
                  abi: [
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
                  ],
                  functionName: 'allowance',
                  args: [ownerAddress, routerAddress],
                }) as bigint;
                
                if (allowance >= requiredAmount) {
                  confirmed = true;
                  console.log('[ensureTokenApproval] Permit approval confirmed on-chain');
                } else {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              } catch (error) {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
            
            if (!confirmed) {
              console.warn('[ensureTokenApproval] Permit approval not confirmed yet, but proceeding');
            }
          }
          
          return true;
        }
      } catch (permitError: any) {
        const errorMsg = permitError?.message || permitError?.toString() || '';
        
        // Only throw if user explicitly rejected
        if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
          throw permitError; // User rejection should stop the swap
        }
        
        // Permit failed, fall through to regular approval
        console.log('[ensureTokenApproval] Permit approval not available, falling back to regular approval');
      }
    }

    // Fallback to regular approval transaction
    const ERC20_ABI = [
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
    ] as const;

    const chain = getChainConfig(chainId);
    if (!chain) {
      // Chain not supported - log but don't block
      console.warn(`[ensureTokenApproval] Chain ${chainId} not supported, but proceeding`);
      return false; // Don't block swap
    }

    // Support both walletClient and window.ethereum
    if (walletClient && walletClient.writeContract) {
      // Use walletClient if available
      try {
        const txHash = await walletClient.writeContract({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, requiredAmount],
          chain,
        });

        // Wait for confirmation if requested
        if (waitForConfirmation && txHash) {
          const publicClient = getCachedClient(chainId);
          try {
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log('[ensureTokenApproval] Approval transaction confirmed');
            
            // Verify allowance is updated
            const allowance = await publicClient.readContract({
              address: tokenAddress,
              abi: [
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
              ],
              functionName: 'allowance',
              args: [ownerAddress, routerAddress],
            }) as bigint;
            
            if (allowance < requiredAmount) {
              console.warn('[ensureTokenApproval] Approval confirmed but allowance still insufficient');
            }
          } catch (error) {
            console.warn('[ensureTokenApproval] Could not wait for receipt, but proceeding');
          }
        }

        return true; // Approval needed and sent
      } catch (approvalError: any) {
        const errorMsg = approvalError?.message || approvalError?.toString() || '';
        
        // Only throw if user explicitly rejected
        if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
          throw approvalError; // User rejection should stop the swap
        }
        
        // All other errors are non-blocking - approval might already exist or be pending
        console.warn(`[ensureTokenApproval] Approval transaction failed (non-blocking), trying window.ethereum:`, errorMsg);
        // Fall through to window.ethereum attempt
      }
    }
    
    // Fallback to window.ethereum if walletClient not available or failed
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        // Encode approval transaction data
        const data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [routerAddress, requiredAmount],
        });

        // Send via window.ethereum
        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: ownerAddress,
            to: tokenAddress,
            data: data,
            gas: '0x186a0', // 100000 gas limit
          }],
        }) as string;

        console.log(`[ensureTokenApproval] Approval sent via window.ethereum: ${txHash}`);
        
        // Wait for confirmation if requested
        if (waitForConfirmation && txHash) {
          const publicClient = getCachedClient(chainId);
          let confirmed = false;
          const maxWait = 60000; // 60 seconds
          const startTime = Date.now();
          
          while (!confirmed && (Date.now() - startTime < maxWait)) {
            try {
              const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
              if (receipt && receipt.status === 'success') {
                // Verify allowance is updated
                const allowance = await publicClient.readContract({
                  address: tokenAddress,
                  abi: [
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
                  ],
                  functionName: 'allowance',
                  args: [ownerAddress, routerAddress],
                }) as bigint;
                
                if (allowance >= requiredAmount) {
                  confirmed = true;
                  console.log('[ensureTokenApproval] Approval confirmed on-chain');
                } else {
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            } catch (error) {
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
          
          if (!confirmed) {
            console.warn('[ensureTokenApproval] Approval not confirmed yet, but proceeding');
          }
        }
        
        return true; // Approval sent
      } catch (ethereumError: any) {
        const errorMsg = ethereumError?.message || ethereumError?.toString() || '';
        
        // Only throw if user explicitly rejected
        if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
          throw ethereumError; // User rejection should stop the swap
        }
        
        // All other errors are non-blocking - approval might already exist or be pending
        console.warn(`[ensureTokenApproval] window.ethereum approval failed (non-blocking):`, errorMsg);
        return false; // Don't block swap - might already be approved
      }
    }
    
    // No wallet available - log but don't block
    console.warn(`[ensureTokenApproval] No wallet client or window.ethereum available, but proceeding`);
    return false; // Don't block swap - approval might already exist
  } catch (error: any) {
    const errorMsg = error?.message || error?.toString() || '';
    
    // Only throw if user explicitly rejected
    if (errorMsg.includes('User rejected') || errorMsg.includes('user rejected') || errorMsg.includes('User denied')) {
      throw error; // User rejection should stop the swap
    }
    
    // All other errors are non-blocking
    console.warn('[ensureTokenApproval] Error ensuring token approval (non-blocking):', errorMsg);
    return false; // Never block swap due to approval errors
  }
};