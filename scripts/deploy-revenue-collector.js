const { ethers } = require("ethers");
require("dotenv").config();

// Contract configuration
const REVENUE_WALLET = "0xD9BD71AA48872430c54730a2D412918aB01cB1cC";

// Network configurations
const NETWORKS = {
  ethereum: {
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io"
  },
  bsc: {
    name: "BSC Mainnet", 
    chainId: 56,
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com"
  },
  polygon: {
    name: "Polygon Mainnet",
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com"
  },
  arbitrum: {
    name: "Arbitrum One",
    chainId: 42161,
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io"
  },
  optimism: {
    name: "Optimism",
    chainId: 10,
    rpcUrl: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    explorerUrl: "https://optimistic.etherscan.io"
  },
  base: {
    name: "Base",
    chainId: 8453,
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    explorerUrl: "https://basescan.org"
  }
};

async function deployToNetwork(networkKey) {
  const network = NETWORKS[networkKey];
  if (!network) {
    throw new Error(`Unknown network: ${networkKey}`);
  }

  console.log(`\n🚀 Deploying to ${network.name}...`);
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(network.rpcUrl);
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in environment variables");
  }
  
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`📝 Deploying from: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient balance for deployment");
  }
  
  // Load contract
  const contractPath = `../artifacts/contracts/SplenexRevenueCollector.sol/SplenexRevenueCollector.json`;
  let contractArtifact;
  
  try {
    contractArtifact = require(contractPath);
  } catch (error) {
    console.error("❌ Contract artifact not found. Please compile the contract first:");
    console.error("   npx hardhat compile");
    throw error;
  }
  
  // Deploy contract
  const factory = new ethers.ContractFactory(
    contractArtifact.abi,
    contractArtifact.bytecode,
    wallet
  );
  
  console.log(`🔨 Deploying SplenexRevenueCollector with revenue wallet: ${REVENUE_WALLET}...`);
  
  const contract = await factory.deploy(REVENUE_WALLET);
  await contract.waitForDeployment();
  
  const contractAddress = await contract.getAddress();
  const deploymentTx = contract.deploymentTransaction();
  
  console.log(`✅ Contract deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);
  console.log(`🔗 Transaction Hash: ${deploymentTx.hash}`);
  console.log(`🌐 Explorer: ${network.explorerUrl}/tx/${deploymentTx.hash}`);
  console.log(`📋 Contract: ${network.explorerUrl}/address/${contractAddress}`);
  
  return {
    network: networkKey,
    chainId: network.chainId,
    contractAddress,
    txHash: deploymentTx.hash,
    explorerUrl: network.explorerUrl
  };
}

async function deployAll() {
  console.log("🎯 SPLENEX REVENUE COLLECTOR DEPLOYMENT");
  console.log("=====================================");
  console.log(`💰 Revenue Wallet: ${REVENUE_WALLET}`);
  
  const deployments = [];
  const networksToDeploy = ["ethereum", "bsc", "polygon", "arbitrum", "optimism", "base"];
  
  for (const networkKey of networksToDeploy) {
    try {
      const deployment = await deployToNetwork(networkKey);
      deployments.push(deployment);
      
      // Wait between deployments to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error(`❌ Failed to deploy to ${networkKey}:`, error.message);
    }
  }
  
  console.log("\n📊 DEPLOYMENT SUMMARY");
  console.log("===================");
  
  if (deployments.length === 0) {
    console.log("❌ No contracts deployed successfully");
    return;
  }
  
  deployments.forEach(deployment => {
    console.log(`${deployment.network.toUpperCase()}: ${deployment.contractAddress}`);
  });
  
  // Generate frontend configuration
  console.log("\n🔧 FRONTEND CONFIGURATION");
  console.log("========================");
  console.log("Add these addresses to your frontend:");
  console.log("");
  console.log("const REVENUE_COLLECTOR_ADDRESSES = {");
  deployments.forEach(deployment => {
    console.log(`  ${deployment.chainId}: "${deployment.contractAddress}", // ${deployment.network}`);
  });
  console.log("};");
  
  console.log("\n✅ Deployment completed!");
}

// Run deployment
if (require.main === module) {
  deployAll().catch(error => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
}

module.exports = { deployToNetwork, deployAll, NETWORKS };