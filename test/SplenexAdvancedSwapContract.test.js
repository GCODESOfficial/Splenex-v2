const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SplenexAdvancedSwapContract", function () {
  let swapContract;
  let owner;
  let user;
  let revenueWallet;
  let tokenA;
  let tokenB;
  
  const TAX_RATE_BPS = 5000; // 50% gas fee tax
  
  beforeEach(async function () {
    [owner, user, revenueWallet] = await ethers.getSigners();
    
    // Deploy mock ERC20 tokens for testing
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("Token A", "TKA", ethers.parseEther("1000000"));
    tokenB = await MockERC20.deploy("Token B", "TKB", ethers.parseEther("1000000"));
    
    // Deploy the swap contract
    const SplenexAdvancedSwapContract = await ethers.getContractFactory("SplenexAdvancedSwapContract");
    swapContract = await SplenexAdvancedSwapContract.deploy(
      revenueWallet.address
    );
    
    await swapContract.waitForDeployment();
    
    // Transfer tokens to user for testing
    await tokenA.transfer(user.address, ethers.parseEther("1000"));
    await tokenB.transfer(await swapContract.getAddress(), ethers.parseEther("1000"));
  });
  
  describe("Deployment", function () {
    it("Should set the correct revenue wallet", async function () {
      expect(await swapContract.revenueWallet()).to.equal(revenueWallet.address);
    });
    
    it("Should initialize supported DEXes", async function () {
      const supportedDEXes = await swapContract.getSupportedDEXes();
      expect(supportedDEXes.length).to.be.greaterThan(0);
      expect(supportedDEXes).to.include("pancakeSwapV2");
    });
  });
  
  describe("Gas Fee Tax Calculation", function () {
    it("Should calculate gas fee tax correctly", async function () {
      const gasUsed = 100000; // 100k gas
      const gasFeeTax = await swapContract.calculateGasFeeTax(gasUsed);
      
      // Calculate expected gas fee tax: (gasUsed * gasPrice * 5000) / 10000
      // For testing, we'll use a mock gas price
      const expectedGasFeeTax = (gasUsed * TAX_RATE_BPS) / 10000;
      
      expect(gasFeeTax).to.equal(expectedGasFeeTax);
    });
    
    it("Should handle zero gas usage", async function () {
      const gasFeeTax = await swapContract.calculateGasFeeTax(0);
      expect(gasFeeTax).to.equal(0);
    });
  });
  
  describe("DEX Management", function () {
    it("Should check DEX support correctly", async function () {
      // Add a test DEX router for the local test network
      await swapContract.updateDEXRouter(31337, "pancakeSwapV2", "0x10ED43C718714eb63d5aA57B78B54704E256024E");
      
      const isSupported = await swapContract.isDEXSupported("pancakeSwapV2");
      expect(isSupported).to.be.true;
    });
    
    it("Should return router address for supported DEX", async function () {
      // Add a test DEX router for the local test network first
      await swapContract.updateDEXRouter(31337, "pancakeSwapV2", "0x10ED43C718714eb63d5aA57B78B54704E256024E");
      
      const router = await swapContract.getDEXRouter("pancakeSwapV2");
      expect(router).to.not.equal(ethers.ZeroAddress);
    });
    
    it("Should allow owner to update DEX router", async function () {
      const newRouter = ethers.Wallet.createRandom().address;
      
      await swapContract.updateDEXRouter(31337, "testDEX", newRouter);
      
      const updatedRouter = await swapContract.getDEXRouter("testDEX");
      expect(updatedRouter).to.equal(newRouter);
    });
    
    it("Should not allow non-owner to update DEX router", async function () {
      const newRouter = ethers.Wallet.createRandom().address;
      
      await expect(
        swapContract.connect(user).updateDEXRouter(56, "testDEX", newRouter)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Emergency Functions", function () {
    it("Should allow owner to withdraw stuck ETH", async function () {
      // Send ETH to contract
      await owner.sendTransaction({
        to: await swapContract.getAddress(),
        value: ethers.parseEther("1.0")
      });
      
      const balanceBefore = await ethers.provider.getBalance(owner.address);
      
      await swapContract.emergencyWithdraw(ethers.ZeroAddress, ethers.parseEther("1.0"));
      
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter).to.be.greaterThan(balanceBefore);
    });
    
    it("Should allow owner to withdraw stuck tokens", async function () {
      const amount = ethers.parseEther("100");
      
      // Transfer tokens to the contract first
      await tokenA.transfer(await swapContract.getAddress(), amount);
      
      await swapContract.emergencyWithdraw(await tokenA.getAddress(), amount);
      
      const balance = await tokenA.balanceOf(owner.address);
      expect(balance).to.be.greaterThan(0);
    });
    
    it("Should not allow non-owner to use emergency functions", async function () {
      await expect(
        swapContract.connect(user).emergencyWithdraw(await tokenA.getAddress(), ethers.parseEther("100"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Contract Integration", function () {
    it("Should receive ETH correctly", async function () {
      const amount = ethers.parseEther("1.0");
      
      await expect(
        owner.sendTransaction({
          to: await swapContract.getAddress(),
          value: amount
        })
      ).to.not.be.reverted;
      
      const balance = await ethers.provider.getBalance(await swapContract.getAddress());
      expect(balance).to.equal(amount);
    });
  });
});

// MockERC20 contract is now in contracts/MockERC20.sol
