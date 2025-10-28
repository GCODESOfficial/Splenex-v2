#!/bin/bash

echo "🚀 SPLENEX REVENUE COLLECTOR DEPLOYMENT"
echo "======================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "📝 Please create .env file with:"
    echo "DEPLOYER_PRIVATE_KEY=your_private_key_here"
    echo "ETHEREUM_RPC_URL=https://eth.llamarpc.com"
    echo "BSC_RPC_URL=https://bsc-dataseed.binance.org"
    echo "POLYGON_RPC_URL=https://polygon-rpc.com"
    echo "ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc"
    echo "OPTIMISM_RPC_URL=https://mainnet.optimism.io"
    echo "BASE_RPC_URL=https://mainnet.base.org"
    echo ""
    echo "⚠️  Make sure to replace 'your_private_key_here' with your actual private key"
    exit 1
fi

echo "✅ .env file found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Compile contracts
echo "🔨 Compiling contracts..."
npx hardhat compile

if [ $? -eq 0 ]; then
    echo "✅ Contracts compiled successfully"
else
    echo "❌ Contract compilation failed"
    exit 1
fi

# Deploy contracts
echo "🚀 Deploying contracts..."
node scripts/deploy-revenue-collector.js

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 DEPLOYMENT COMPLETED!"
    echo "======================="
    echo ""
    echo "📋 NEXT STEPS:"
    echo "1. Copy the deployed contract addresses"
    echo "2. Update lib/smart-contract-revenue.ts with the addresses"
    echo "3. Test single-signature swaps"
    echo ""
    echo "✅ You now have true single-signature revenue collection!"
else
    echo "❌ Deployment failed"
    exit 1
fi
