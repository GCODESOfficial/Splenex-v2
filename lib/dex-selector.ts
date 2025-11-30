/**
 * Determines which DEX to use for a given chain ID
 * @param chainId - The chain ID
 * @returns 'pancakeswap' for BSC, 'uniswap' for ETH-based chains, or null if unsupported
 */
export function getDexForChain(chainId: number): 'pancakeswap' | 'uniswap' | null {
  if (chainId === 56) {
    return 'pancakeswap'; // BSC uses PancakeSwap
  } else if ([1, 42161, 10, 137, 8453].includes(chainId)) {
    return 'uniswap'; // ETH-based chains use Uniswap/SushiSwap
  }
  return null;
}

