// Smart Contract Configuration
export const SWAP_CONTRACT_CONFIG = {
  // Contract addresses for different networks
  addresses: {
    // Mainnet addresses (to be updated after deployment)
    1: "0x0000000000000000000000000000000000000000", // Ethereum
    56: "0x0000000000000000000000000000000000000000", // BSC
    137: "0x0000000000000000000000000000000000000000", // Polygon
    42161: "0x0000000000000000000000000000000000000000", // Arbitrum
    43114: "0x0000000000000000000000000000000000000000", // Avalanche
    250: "0x0000000000000000000000000000000000000000", // Fantom
  },
  
  // Revenue wallet address
  revenueWallet: "0xD9BD71AA48872430c54730a2D412918aB01cB1cC",
  
  // Default tax rate (5% in basis points)
  defaultTaxRateBps: 500,
  
  // Maximum tax rate (10% in basis points)
  maxTaxRateBps: 1000,
  
  // Supported DEXes by chain
  supportedDEXes: {
    1: ["uniswapV2", "sushiswap"], // Ethereum
    56: ["pancakeSwapV2", "apeswap", "biswap", "mdex"], // BSC
    137: ["quickswap", "sushiswap"], // Polygon
    42161: ["sushiswap", "uniswapV3"], // Arbitrum
    43114: ["traderjoe", "pangolin"], // Avalanche
    250: ["spiritswap", "spookyswap"], // Fantom
  },
  
  // DEX router addresses
  dexRouters: {
    1: {
      uniswapV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      sushiswap: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    },
    56: {
      pancakeSwapV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      apeswap: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
      biswap: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
      mdex: "0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8",
    },
    137: {
      quickswap: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      sushiswap: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    },
    42161: {
      sushiswap: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      uniswapV3: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    43114: {
      traderjoe: "0x60aE616a2155Ee3d9A6854Ba346546Ee4B47873",
      pangolin: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
    },
    250: {
      spiritswap: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",
      spookyswap: "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
    },
  },
  
  // Common token addresses
  commonTokens: {
    1: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      USDC: "0xA0b86a33E6441b8C4C8C0C4F8eB1f8eB1f8eB1f8",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
    56: {
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      USDT: "0x55d398326f99059fF775485246999027B3197955",
      USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    },
    137: {
      WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    },
  },
  
  // Gas limits for different operations
  gasLimits: {
    swap: "300000",
    swapETH: "250000",
    swapToETH: "300000",
    multiHopSwap: "400000",
  },
  
  // Slippage tolerance (in basis points)
  slippageTolerance: 300, // 3%
  
  // Minimum amounts (in wei)
  minimumAmounts: {
    ETH: "1000000000000000", // 0.001 ETH
    USDT: "1000000", // 1 USDT (6 decimals)
    USDC: "1000000", // 1 USDC (6 decimals)
  },
};

// Helper functions
export const getContractAddress = (chainId: number): string => {
  return SWAP_CONTRACT_CONFIG.addresses[chainId as keyof typeof SWAP_CONTRACT_CONFIG.addresses] || "";
};

export const getSupportedDEXes = (chainId: number): string[] => {
  return SWAP_CONTRACT_CONFIG.supportedDEXes[chainId as keyof typeof SWAP_CONTRACT_CONFIG.supportedDEXes] || [];
};

export const getDEXRouter = (chainId: number, dexName: string): string => {
  const chainDEXes = SWAP_CONTRACT_CONFIG.dexRouters[chainId as keyof typeof SWAP_CONTRACT_CONFIG.dexRouters];
  return chainDEXes?.[dexName as keyof typeof chainDEXes] || "";
};

export const getCommonTokens = (chainId: number) => {
  return SWAP_CONTRACT_CONFIG.commonTokens[chainId as keyof typeof SWAP_CONTRACT_CONFIG.commonTokens] || {};
};

export const isChainSupported = (chainId: number): boolean => {
  return chainId in SWAP_CONTRACT_CONFIG.addresses;
};

export const formatTaxRate = (taxRateBps: number): string => {
  return `${(taxRateBps / 100).toFixed(2)}%`;
};

export const calculateTaxAmount = (amount: string, taxRateBps: number): { taxAmount: string; netAmount: string } => {
  const amountBN = BigInt(amount);
  const taxAmount = (amountBN * BigInt(taxRateBps)) / BigInt(10000);
  const netAmount = amountBN - taxAmount;
  
  return {
    taxAmount: taxAmount.toString(),
    netAmount: netAmount.toString(),
  };
};
