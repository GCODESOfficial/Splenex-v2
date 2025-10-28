const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SplenexAdvancedSwapContract...");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Get deployer info
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance, deployment may fail");
  }
  
  // Get the contract factory
  const SplenexAdvancedSwapContract = await ethers.getContractFactory("SplenexAdvancedSwapContract");
  
  // Configuration
  const revenueWallet = "0xD9BD71AA48872430c54730a2D412918aB01cB1cC"; // Your revenue wallet
  
  console.log("\n📋 Configuration:");
  console.log(`   Revenue Wallet: ${revenueWallet}`);
  console.log(`   Gas Fee Tax Rate: 50% (fixed)`);
  
  try {
    // Estimate gas for deployment
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await SplenexAdvancedSwapContract.getDeployTransaction(
      revenueWallet
    ).then(tx => ethers.provider.estimateGas(tx));
    
    console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    
    // Deploy the contract with estimated gas + 20% buffer
    const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
    
    console.log("\n🔨 Deploying contract...");
    const swapContract = await SplenexAdvancedSwapContract.deploy(
      revenueWallet,
      {
        gasLimit: gasLimit
      }
    );
    
    console.log("⏳ Waiting for deployment...");
    await swapContract.waitForDeployment();
  
    console.log("✅ SplenexAdvancedSwapContract deployed successfully!");
    console.log(`   Contract Address: ${await swapContract.getAddress()}`);
    console.log(`   Transaction Hash: ${swapContract.deploymentTransaction().hash}`);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    
    const deployedRevenueWallet = await swapContract.revenueWallet();
    const supportedDEXes = await swapContract.getSupportedDEXes();
    
    console.log("📊 Contract Details:");
    console.log(`   Revenue Wallet: ${deployedRevenueWallet}`);
    console.log(`   Gas Fee Tax Rate: 50% (fixed)`);
    console.log(`   Supported DEXes: ${supportedDEXes.join(", ")}`);
    
    // Test gas fee tax calculation
    const testGasUsed = 100000; // 100k gas
    const gasFeeTax = await swapContract.calculateGasFeeTax(testGasUsed);
    
    console.log("\n🧮 Gas Fee Tax Calculation Test:");
    console.log(`   Gas Used: ${testGasUsed}`);
    console.log(`   Gas Fee Tax: ${ethers.formatEther(gasFeeTax)} ETH`);
    
    // Initialize DEX routers
    console.log("\n🔧 Initializing DEX routers...");
    
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
    for (const [chainIdStr, routers] of Object.entries(dexRouters)) {
      const chainIdNum = parseInt(chainIdStr);
      console.log(`📡 Setting up routers for chain ${chainIdNum}...`);
      
      for (const [dexName, routerAddress] of Object.entries(routers)) {
        try {
          const tx = await swapContract.updateDEXRouter(chainIdNum, dexName, routerAddress);
          await tx.wait();
          console.log(`   ✅ ${dexName}: ${routerAddress}`);
        } catch (error) {
          console.log(`   ❌ Failed to set ${dexName}: ${error.message}`);
        }
      }
    }
    
    // Save deployment info
    const fs = require('fs');
    const contractInfo = {
      address: await swapContract.getAddress(),
      chainId: chainId,
      network: network.name,
      revenueWallet: revenueWallet,
      gasFeeTaxRate: "50%",
      deployedAt: new Date().toISOString(),
      transactionHash: swapContract.deploymentTransaction().hash
    };
    
    fs.writeFileSync(
      `deployment-${chainId}.json`, 
      JSON.stringify(contractInfo, null, 2)
    );
    
    console.log(`\n💾 Contract info saved to: deployment-${chainId}.json`);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Verify the contract on block explorer");
    console.log("   2. Update frontend to use new contract address");
    console.log("   3. Test swap functionality");
    console.log("   4. Update documentation");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Add more ETH to your wallet for gas fees");
    } else if (error.message.includes("timeout")) {
      console.log("\n💡 Solution: Try a different RPC endpoint or network");
    } else if (error.message.includes("gas")) {
      console.log("\n💡 Solution: Increase gas limit or check network congestion");
    } else if (error.message.includes("nonce")) {
      console.log("\n💡 Solution: Wait a moment and try again, or reset nonce");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
