/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { Contract, BrowserProvider } from "ethers";
import { supabase } from "@/lib/supabaseClient";
import { calculateGasRevenue } from "@/config/revenue";
import {
  getLiFiQuote,
  getLiFiSupportedChains,
  getLiFiSupportedTokens,
} from "@/lib/lifi-server-actions";

// Revenue contract address (BSC) - UPDATE AFTER DEPLOYMENT
const REVENUE_CONTRACT_ADDRESS = "0x926F55c379c63F0b7fe06194160220E307eaeFc5";

// Contract ABI with Permit support
const REVENUE_CONTRACT_ABI = [
  "function swapViaLiFiWithPermit(bytes calldata liFiCalldata, address toToken, uint256 minAmountOut, uint256 lifiExpectedAmount, PermitData calldata permitData) external payable",
  "function swapTokenViaLiFiWithPermit(address tokenIn, uint256 amountIn, bytes calldata liFiCalldata, address toToken, uint256 minAmountOut, uint256 lifiExpectedAmount, PermitData calldata permitData) external payable",
];

// Check if should use revenue contract
const shouldUseRevenueContract = () => {
  return process.env.NEXT_PUBLIC_USE_REVENUE_CONTRACT === "true";
};

// ERC-2612 Permit data structure
interface PermitData {
  token: string;
  value: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

interface LiFiQuote {
  id: string;
  type: string;
  tool: string;
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      name: string;
      logoURI?: string;
    };
    toToken: {
      address: string;
      symbol: string;
      decimals: number;
      chainId: number;
      name: string;
      logoURI?: string;
    };
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: Array<{
      name: string;
      description: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
      amount: string;
      amountUSD: string;
      percentage: string;
      included: boolean;
    }>;
    gasCosts: Array<{
      type: string;
      price: string;
      estimate: string;
      limit: string;
      amount: string;
      amountUSD: string;
      token: {
        address: string;
        symbol: string;
        decimals: number;
        chainId: number;
      };
    }>;
  };
  transactionRequest?: {
    to: string;
    data: string;
    value: string;
    from: string;
    chainId: number;
    gasLimit: string;
    gasPrice?: string;
  };
}

interface LiFiQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress?: string;
  slippage?: number;
  order?: "FASTEST" | "CHEAPEST";
  allowBridges?: string[];
  denyBridges?: string[];
  preferBridges?: string[];
  allowExchanges?: string[];
  denyExchanges?: string[];
  preferExchanges?: string[];
}

const DAPP_FEE_PERCENTAGE = 0.1;
const DAPP_FEE_RECIPIENT = "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9";

/**
 * Generate ERC-2612 permit signature for single signature swaps
 */
async function generatePermitSignature(
  tokenAddress: string,
  tokenName: string,
  tokenSymbol: string,
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  chainId: number,
  provider: any
): Promise<PermitData | null> {
  try {
    console.log("[Permit] 🔐 Generating ERC-2612 permit signature...");
    
    // Check if token supports permit
    const tokenContract = new Contract(
      tokenAddress,
      [
        "function nonces(address owner) external view returns (uint256)",
        "function DOMAIN_SEPARATOR() external view returns (bytes32)"
      ],
      provider
    );
    
    try {
      await tokenContract.nonces(owner);
      console.log("[Permit] ✅ Token supports ERC-2612 permit");
    } catch (error) {
      console.log("[Permit] ❌ Token does not support ERC-2612 permit");
      return null;
    }
    
    // Get nonce
    const nonce = await tokenContract.nonces(owner);
    
    // Create permit message
    const domain = {
      name: tokenName,
      version: "1",
      chainId: chainId,
      verifyingContract: tokenAddress,
    };
    
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    
    const message = {
      owner: owner,
      spender: spender,
      value: value,
      nonce: nonce,
      deadline: deadline,
    };
    
    // Sign the permit
    const signer = await provider.getSigner();
    const signature = await signer._signTypedData(domain, types, message);
    
    // Split signature
    const sig = ethers.utils.splitSignature(signature);
    
    console.log("[Permit] ✅ Permit signature generated successfully");
    
    return {
      token: tokenAddress,
      value: value,
      deadline: deadline,
      v: sig.v,
      r: sig.r,
      s: sig.s,
    };
  } catch (error) {
    console.error("[Permit] ❌ Failed to generate permit signature:", error);
    return null;
  }
}

export function useLiFiWithPermit() {
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<LiFiQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (request: LiFiQuoteRequest): Promise<LiFiQuote | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getLiFiQuote(request);
      if (!result.success) throw new Error(result.error);
      const quoteData = result.data;
      setQuote(quoteData);
      return quoteData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get quote";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const calculateDappFee = useCallback((quote: LiFiQuote) => {
    const feeCosts = quote.estimate.feeCosts || [];
    const dappFee = feeCosts.find(
      (fee) => fee.name === "Dapp Fee" || fee.description.includes("dapp")
    );

    if (dappFee) {
      return {
        amount: dappFee.amount,
        amountUSD: dappFee.amountUSD,
        percentage: dappFee.percentage,
        token: dappFee.token,
      };
    }

    const fromAmount = Number.parseFloat(quote.estimate.fromAmount);
    const feeAmount = ((fromAmount * DAPP_FEE_PERCENTAGE) / 100).toString();
    const feeAmountUSD = (
      (Number.parseFloat(feeAmount) / Math.pow(10, quote.action.fromToken.decimals)) *
      4400
    ).toFixed(2);

    return {
      amount: feeAmount,
      amountUSD: feeAmountUSD,
      percentage: DAPP_FEE_PERCENTAGE.toString(),
      token: quote.action.fromToken,
    };
  }, []);

  /** ✅ SINGLE SIGNATURE swap execution with ERC-2612 Permit */
  const executeSwapWithPermit = useCallback(
    async (quote: LiFiQuote, signer: any): Promise<string | null> => {
      setIsLoading(true);
      setError(null);

      try {
        if (!quote.transactionRequest) throw new Error("No transaction request found in quote");
        if (!signer) throw new Error("No signer provided for transaction execution");

        // Check if we should use revenue contract
        const useRevenueContract = shouldUseRevenueContract();
        let txHash: string;

        console.log(`[LiFi] 🔧 Revenue contract enabled: ${useRevenueContract}`);
        console.log(`[LiFi] 🔧 Environment variable NEXT_PUBLIC_USE_REVENUE_CONTRACT: ${process.env.NEXT_PUBLIC_USE_REVENUE_CONTRACT}`);

        if (useRevenueContract) {
          console.log("[LiFi] 🔄 Routing through revenue contract with SINGLE SIGNATURE...");
          
          // Get provider and signer
          const provider = new BrowserProvider((window as any).ethereum);
          const actualSigner = await provider.getSigner();
          
          // Create contract instance
          const contract = new Contract(REVENUE_CONTRACT_ADDRESS, REVENUE_CONTRACT_ABI, actualSigner);
          
          // Extract LiFi expected amount and calculate total with tax
          const lifiExpectedAmount = BigInt(quote.transactionRequest.value);
          const taxAmount = lifiExpectedAmount / 2n; // 50% tax on LiFi amount
          const totalAmount = lifiExpectedAmount + taxAmount; // 150% total (LiFi + 50% tax)
          
          console.log(`[LiFi] 💰 LiFi expects: ${lifiExpectedAmount.toString()}`);
          console.log(`[LiFi] 💰 Tax amount (50%): ${taxAmount.toString()}`);
          console.log(`[LiFi] 💰 Total to send (150%): ${totalAmount.toString()}`);
          console.log(`[LiFi] 💰 Contract will send to LiFi: ${lifiExpectedAmount.toString()} (100%)`);
          console.log(`[LiFi] 💰 Contract will keep as tax: ${taxAmount.toString()} (50%)`);
          
          // Get parameters
          let toToken = quote.action.toToken.address;
          const minAmountOut = quote.estimate.toAmountMin || quote.estimate.toAmount || "0";
          const lifiCalldata = quote.transactionRequest.data;
          
          // Fix zero address issue - if toToken is zero address, use WETH address for BSC
          if (toToken === "0x0000000000000000000000000000000000000000" || toToken === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
            toToken = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; // WBNB on BSC
            console.log(`[LiFi] 🔧 Fixed toToken from zero address to WBNB: ${toToken}`);
          }
          
          console.log(`[LiFi] 🔍 Parameter validation:`);
          console.log(`[LiFi]   - toToken: ${toToken}`);
          console.log(`[LiFi]   - toToken is zero address: ${toToken === "0x0000000000000000000000000000000000000000"}`);
          console.log(`[LiFi]   - minAmountOut: ${minAmountOut}`);
          console.log(`[LiFi]   - lifiCalldata length: ${lifiCalldata.length}`);
          
          // Determine if it's a native token swap or token swap
          const isNativeSwap = quote.action.fromToken.address.toLowerCase() === 
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" || 
            quote.action.fromToken.address === "0x0000000000000000000000000000000000000000";
          
          if (isNativeSwap) {
            // Native token swap - single signature
            console.log("[LiFi] 💱 Executing native token swap via contract (SINGLE SIGNATURE)...");
            console.log("[LiFi] 📋 Contract call parameters:");
            console.log("[LiFi]   - lifiCalldata:", lifiCalldata.substring(0, 100) + "...");
            console.log("[LiFi]   - toToken:", toToken);
            console.log("[LiFi]   - minAmountOut:", minAmountOut);
            console.log("[LiFi]   - lifiExpectedAmount:", lifiExpectedAmount.toString());
            console.log("[LiFi]   - totalAmount (value):", totalAmount.toString());
            
            try {
              const tx = await contract.swapViaLiFiWithPermit(
                lifiCalldata,
                toToken,
                minAmountOut,
                lifiExpectedAmount.toString(),
                {
                  token: "0x0000000000000000000000000000000000000000",
                  value: "0",
                  deadline: 0,
                  v: 0,
                  r: "0x0000000000000000000000000000000000000000000000000000000000000000",
                  s: "0x0000000000000000000000000000000000000000000000000000000000000000"
                },
                { value: totalAmount.toString() } // Send 150% total (LiFi + 50% tax)
              );
              txHash = tx.hash;
            } catch (contractError) {
              console.error("[LiFi] ❌ Contract call failed:", contractError);
              console.error("[LiFi] ❌ Error details:", {
                message: contractError.message,
                code: contractError.code,
                data: contractError.data,
                reason: contractError.reason
              });
              throw contractError;
            }
          } else {
            // Token swap - SINGLE SIGNATURE with ERC-2612 Permit
            console.log("[LiFi] 💱 Executing token swap via contract (SINGLE SIGNATURE with Permit)...");
            
            const fromAmount = BigInt(quote.action.fromAmount);
            const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
            
            // Generate permit signature
            console.log("[LiFi] 🔐 Generating ERC-2612 permit signature...");
            const permitData = await generatePermitSignature(
              quote.action.fromToken.address,
              quote.action.fromToken.name,
              quote.action.fromToken.symbol,
              actualSigner.address,
              REVENUE_CONTRACT_ADDRESS,
              fromAmount.toString(),
              deadline,
              quote.action.fromChainId,
              provider
            );
            
            if (!permitData) {
              throw new Error("Failed to generate permit signature - token may not support ERC-2612");
            }
            
            console.log("[LiFi] ✅ Permit signature generated successfully");
            console.log("[LiFi] 📋 Token swap contract call parameters:");
            console.log("[LiFi]   - tokenIn:", quote.action.fromToken.address);
            console.log("[LiFi]   - amountIn:", fromAmount.toString());
            console.log("[LiFi]   - lifiCalldata:", lifiCalldata.substring(0, 100) + "...");
            console.log("[LiFi]   - toToken:", toToken);
            console.log("[LiFi]   - minAmountOut:", minAmountOut);
            console.log("[LiFi]   - lifiExpectedAmount:", lifiExpectedAmount.toString());
            console.log("[LiFi]   - totalAmount (value):", totalAmount.toString());
            console.log("[LiFi]   - permitData:", permitData);
            
            try {
              const tx = await contract.swapTokenViaLiFiWithPermit(
                quote.action.fromToken.address,
                fromAmount.toString(),
                lifiCalldata,
                toToken,
                minAmountOut,
                lifiExpectedAmount.toString(),
                permitData,
                { value: totalAmount.toString() } // Send 150% total (LiFi + 50% tax)
              );
              txHash = tx.hash;
            } catch (contractError) {
              console.error("[LiFi] ❌ Token swap contract call failed:", contractError);
              console.error("[LiFi] ❌ Error details:", {
                message: contractError.message,
                code: contractError.code,
                data: contractError.data,
                reason: contractError.reason
              });
              throw contractError;
            }
          }
          
          console.log("[LiFi] ✅ Revenue contract swap sent:", txHash);
          
          // Wait for confirmation
          const receipt = await actualSigner.provider.waitForTransaction(txHash);
          console.log("[LiFi] ✅ Revenue contract swap confirmed:", receipt);

        } else {
          // Direct swap (bypass contract)
          console.log("[LiFi] 🔄 Executing direct LiFi swap...");
          
          const txResponse = await signer.sendTransaction({
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
            gasLimit: quote.transactionRequest.gasLimit,
            ...(quote.transactionRequest.gasPrice && {
              gasPrice: quote.transactionRequest.gasPrice,
            }),
          });

          txHash = txResponse.hash;
          console.log("[LiFi] ✅ Direct swap sent:", txHash);

          const receipt = await txResponse.wait();
          console.log("[LiFi] ✅ Direct swap confirmed:", receipt);
        }

        /** --- FIXED: Record Trading Volume with Accurate USD Calculation --- */
        let usdValue = 0;
        
        try {
          const fromToken = quote.action.fromToken;
          const fromAmount = quote.action.fromAmount;
          const fromAmountNum = Number.parseFloat(fromAmount) / Math.pow(10, fromToken.decimals);
          
          console.log(`[Analytics] 📊 Calculating volume: ${fromAmountNum} ${fromToken.symbol}`);
          
          // Method 1: Stablecoins = 1:1 USD (most accurate)
          const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'FRAX', 'TUSD', 'USDD', 'GUSD', 'USDP'];
          if (stablecoins.includes(fromToken.symbol)) {
            usdValue = fromAmountNum;
            console.log(`[Analytics] 💵 Stablecoin detected: ${fromToken.symbol} = $${usdValue.toFixed(2)}`);
          } 
          // Method 2: Use gas costs USD as price reference (if available)
          else if (quote.estimate?.gasCosts?.[0]?.amountUSD) {
            // For now, fetch price from API for accurate calculation
            const priceResponse = await fetch(`/api/prices?symbols=${fromToken.symbol}`);
            if (priceResponse.ok) {
              const prices = await priceResponse.json();
              const tokenPrice = prices[fromToken.symbol] || 0;
              if (tokenPrice > 0) {
                usdValue = fromAmountNum * tokenPrice;
                console.log(`[Analytics] 📈 Price API: ${fromToken.symbol} @ $${tokenPrice} = $${usdValue.toFixed(2)}`);
              }
            }
          }
          // Method 3: For native tokens, estimate based on symbol
          else {
            const nativeTokenPrices: Record<string, number> = {
              'ETH': 3500, 'WETH': 3500,
              'BNB': 600, 'WBNB': 600,
              'MATIC': 1, 'WMATIC': 1,
              'AVAX': 40, 'WAVAX': 40,
              'FTM': 0.5, 'WFTM': 0.5,
            };
            const estimatedPrice = nativeTokenPrices[fromToken.symbol] || 0;
            if (estimatedPrice > 0) {
              usdValue = fromAmountNum * estimatedPrice;
              console.log(`[Analytics] 🔷 Estimated native token: ${fromToken.symbol} @ ~$${estimatedPrice} = $${usdValue.toFixed(2)}`);
            }
          }
          
          console.log(`[Analytics] 💰 Final swap volume: $${usdValue.toFixed(2)}`);
        } catch (calcError) {
          console.error("[Analytics] Error calculating USD value:", calcError);
          // Fallback: use a minimal value to avoid losing the swap record
          usdValue = 0.01;
        }

        // Calculate gas fee revenue
        let gasFeeRevenue = 0;
        try {
          const gasCosts = quote.estimate?.gasCosts?.[0];
          if (gasCosts && gasCosts.amountUSD) {
            const gasRevenue = calculateGasRevenue(gasCosts.amountUSD);
            gasFeeRevenue = gasRevenue.revenue;
            
            console.log(`[Revenue] 💰 Gas Fee Revenue Calculation:`);
            console.log(`[Revenue] Original Gas Fee: $${gasRevenue.originalGasFee.toFixed(2)}`);
            console.log(`[Revenue] Additional Charge (50%): $${gasRevenue.additionalCharge.toFixed(2)}`);
            console.log(`[Revenue] Total Gas Fee: $${gasRevenue.totalGasFee.toFixed(2)}`);
            console.log(`[Revenue] Revenue to Wallet: $${gasRevenue.revenue.toFixed(2)}`);
            console.log(`[Revenue] Revenue Wallet: ${gasRevenue.revenueWallet}`);
          }
        } catch (gasError) {
          console.warn("[Revenue] ⚠️ Could not calculate gas revenue:", gasError);
        }

        // Skip logging here - let the main swap interface handle it
        console.log(`[LiFi] ✅ Swap completed: $${usdValue.toFixed(2)} USD, Gas revenue: $${gasFeeRevenue.toFixed(2)}`);
        console.log(`[LiFi] 📝 Swap logging handled by main interface to avoid duplicates`);

        return txHash;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to execute swap";
        setError(errorMessage);
        console.error("[LiFi] Swap error:", errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getSupportedChains = useCallback(async () => {
    try {
      const result = await getLiFiSupportedChains();
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (err) {
      console.error("[LiFi] Failed to fetch supported chains:", err);
      return [];
    }
  }, []);

  const getSupportedTokens = useCallback(async (chainId: number) => {
    try {
      const result = await getLiFiSupportedTokens(chainId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    } catch (err) {
      console.error(`[LiFi] Failed to fetch tokens for chain ${chainId}:`, err);
      return [];
    }
  }, []);

  return {
    isLoading,
    quote,
    error,
    getQuote,
    executeSwapWithPermit,
    getSupportedChains,
    getSupportedTokens,
    calculateDappFee,
    clearQuote: () => setQuote(null),
    clearError: () => setError(null),
  };
}

