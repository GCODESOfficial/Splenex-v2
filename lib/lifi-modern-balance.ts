/**
 * LiFi Modern Balance Fetcher
 * 
 * Note: getTokens() API has compatibility issues in v3.12.14
 * For comprehensive balance fetching with ALL tokens, use the 
 * Covalent-based comprehensive detector which provides excellent coverage.
 * 
 * This module is kept for future SDK upgrades.
 */
export async function fetchAllChainBalances(walletAddress: string) {
  // Return empty array to skip LiFi and use comprehensive detector
  // The comprehensive detector (Covalent) provides full token coverage
  console.log('[LiFiModern] Using comprehensive detector for full token coverage')
  return []
}

/**
 * Convert LiFi balance format to our TokenBalance format
 */
export function convertLiFiBalanceToTokenBalance(lifiBalance: any) {
  const balance = parseFloat(lifiBalance.balance || '0')
  const price = parseFloat(lifiBalance.priceUsd || '0')
  const usdValue = parseFloat(lifiBalance.balanceUsd || '0')
  
  return {
    address: lifiBalance.token?.address || '',
    symbol: lifiBalance.token?.symbol || 'UNKNOWN',
    name: lifiBalance.token?.name || lifiBalance.token?.symbol || 'Unknown Token',
    balance: balance.toFixed(6),
    decimals: lifiBalance.token?.decimals || 18,
    price: price,
    usdValue: usdValue || (balance * price),
    chain: lifiBalance.chain || `Chain ${lifiBalance.chainId}`,
    chainId: lifiBalance.chainId,
  }
}

