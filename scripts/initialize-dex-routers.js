const { ethers } = require("hardhat");

async function initializeDEXRouters() {
  console.log("🔧 Initializing DEX routers...");
  
  // Get the deployed contract
  const contractAddress = process.env.SWAP_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ SWAP_CONTRACT_ADDRESS environment variable not set");
    process.exit(1);
  }
  
  const SplenexAdvancedSwapContract = await ethers.getContractFactory("SplenexAdvancedSwapContract");
  const swapContract = SplenexAdvancedSwapContract.attach(contractAddress);
  
  // DEX Router addresses for different chains
  const dexRouters = {
    // BSC (Chain ID: 56)
    56: {
      pancakeSwapV2: "0x10ED43C718714eb63d5aA57B78B54704E256024E",
      apeswap: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
      biswap: "0x3a6d8cA21D1CF76F653A67577FA0D27453350dD8",
      mdex: "0x7DAe51BD3E3376B8c7c4900E9107f12Be3AF1bA8",
    },
    // Ethereum (Chain ID: 1)
    1: {
      uniswapV2: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      sushiswap: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    },
    // Polygon (Chain ID: 137)
    137: {
      quickswap: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff",
      sushiswap: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    },
    // Arbitrum (Chain ID: 42161)
    42161: {
      sushiswap: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
    },
    // Avalanche (Chain ID: 43114)
    43114: {
      traderjoe: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4",
    },
    // Fantom (Chain ID: 250)
    250: {
      spiritswap: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",
      spookyswap: "0xF491e7B69E4244ad4002BC14e878a34207E38c29",
    },
  };
  
  // Initialize routers for each chain
  for (const [chainId, routers] of Object.entries(dexRouters)) {
    console.log(`📡 Setting up routers for chain ${chainId}...`);
    
    for (const [dexName, routerAddress] of Object.entries(routers)) {
      try {
        const tx = await swapContract.updateDEXRouter(chainId, dexName, routerAddress);
        await tx.wait();
        console.log(`   ✅ ${dexName}: ${routerAddress}`);
      } catch (error) {
        console.log(`   ❌ Failed to set ${dexName}: ${error.message}`);
      }
    }
  }
  
  console.log("🎉 DEX router initialization completed!");
}

initializeDEXRouters()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
  });
