const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SplenexAdvancedSwapContract...");
  
  // Get the contract factory
  const SplenexAdvancedSwapContract = await ethers.getContractFactory("SplenexAdvancedSwapContract");
  
  // Configuration
  const revenueWallet = "0xD9BD71AA48872430c54730a2D412918aB01cB1cC"; // Your revenue wallet
  const taxRateBps = 500; // 5% tax rate in basis points
  
  console.log("📋 Configuration:");
  console.log(`   Revenue Wallet: ${revenueWallet}`);
  console.log(`   Tax Rate: ${taxRateBps} basis points (${taxRateBps / 100}%)`);
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  console.log(`   Network: ${network.name} (Chain ID: ${chainId})`);
  
  // Check wallet balance
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`   Deployer: ${deployer.address}`);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    console.log("⚠️  Warning: Low balance, deployment may fail");
  }
  
  try {
    // Estimate gas for deployment
    console.log("\n⛽ Estimating gas...");
    const gasEstimate = await SplenexAdvancedSwapContract.getDeployTransaction(
      revenueWallet,
      taxRateBps
    ).then(tx => ethers.provider.estimateGas(tx));
    
    console.log(`   Estimated gas: ${gasEstimate.toString()}`);
    
    // Deploy the contract with estimated gas + 20% buffer
    const gasLimit = gasEstimate * 120n / 100n; // 20% buffer
    
    console.log("\n🔨 Deploying contract...");
    const swapContract = await SplenexAdvancedSwapContract.deploy(
      revenueWallet,
      taxRateBps,
      {
        gasLimit: gasLimit
      }
    );
    
    console.log("⏳ Waiting for deployment...");
    await swapContract.waitForDeployment();
    
    const contractAddress = await swapContract.getAddress();
    console.log("✅ SplenexAdvancedSwapContract deployed successfully!");
    console.log(`   Contract Address: ${contractAddress}`);
    console.log(`   Transaction Hash: ${swapContract.deploymentTransaction().hash}`);
    
    // Verify deployment
    console.log("\n🔍 Verifying deployment...");
    const deployedTaxRate = await swapContract.getTaxRateBps();
    const deployedRevenueWallet = await swapContract.revenueWallet();
    
    console.log("📊 Contract Details:");
    console.log(`   Tax Rate: ${deployedTaxRate} basis points`);
    console.log(`   Revenue Wallet: ${deployedRevenueWallet}`);
    
    // Test tax calculation
    const testAmount = ethers.parseEther("1.0");
    const [taxAmount, netAmount] = await swapContract.calculateTax(testAmount);
    
    console.log("\n🧮 Tax Calculation Test:");
    console.log(`   Input Amount: ${ethers.formatEther(testAmount)} ETH`);
    console.log(`   Tax Amount: ${ethers.formatEther(taxAmount)} ETH`);
    console.log(`   Net Amount: ${ethers.formatEther(netAmount)} ETH`);
    
    // Save contract address to file
    const fs = require('fs');
    const contractInfo = {
      address: contractAddress,
      chainId: chainId,
      network: network.name,
      revenueWallet: revenueWallet,
      taxRateBps: taxRateBps,
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
    console.log("   1. Initialize DEX routers using the initialize script");
    console.log("   2. Verify the contract on block explorer");
    console.log("   3. Update frontend with new contract address");
    console.log("   4. Test swap functionality");
    
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 Solution: Add more ETH to your wallet for gas fees");
    } else if (error.message.includes("timeout")) {
      console.log("\n💡 Solution: Try a different RPC endpoint or network");
    } else if (error.message.includes("gas")) {
      console.log("\n💡 Solution: Increase gas limit or check network congestion");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
