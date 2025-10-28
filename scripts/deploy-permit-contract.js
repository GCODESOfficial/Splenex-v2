const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying SplenexAdvancedSwapContractWithPermit...");
  
  // Revenue wallet address
  const revenueWallet = "0xD9BD71AA48872430c54730a2D412918aB01cB1cC";
  
  // Get the contract factory
  const SplenexAdvancedSwapContractWithPermit = await ethers.getContractFactory("SplenexAdvancedSwapContractWithPermit");
  
  // Deploy the contract
  const contract = await SplenexAdvancedSwapContractWithPermit.deploy(revenueWallet);
  
  // Wait for deployment to complete
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`💰 Revenue Wallet: ${revenueWallet}`);
  console.log(`🔗 Network: ${network.name}`);
  console.log(`⛽ Gas Used: ${contract.deploymentTransaction().gasLimit}`);
  
  // Save deployment info
  const deploymentInfo = {
    address: contractAddress,
    chainId: network.config.chainId,
    network: network.name,
    revenueWallet: revenueWallet,
    gasFeeTaxRate: "50%",
    deployedAt: new Date().toISOString(),
    transactionHash: contract.deploymentTransaction().hash,
    features: [
      "Single signature swaps via ERC-2612 Permit",
      "Automatic 50% gas fee tax collection",
      "LiFi integration",
      "Revenue collection to specified wallet"
    ]
  };
  
  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Verify contract (optional)
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 Verifying contract on block explorer...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [revenueWallet],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Contract verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });

