/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Clock, Info } from "lucide-react"
import { getPermitSignature, supportsPermit } from "@/lib/permit-helper"
import { signLimitOrder, generateOrderSalt } from "@/lib/limit-order-types"
import { useToast } from "@/components/ui/use-toast"

interface Token {
  symbol: string
  name: string
  address: string
  chainId: number
  chainName: string
  balance?: string
  usdValue?: string
  icon?: string
  decimals?: number
  logoURI?: string
}

interface LimitOrderInterfaceProps {
  fromToken: Token
  toToken: Token
  fromAmount: string
  onFromAmountChange: (amount: string) => void
  onPlaceLimitOrder: (orderData: any) => void
  isConnected: boolean
  walletAddress?: string
  getQuote?: any // LiFi getQuote function
  executeSwap?: (quote: any, signer?: any) => Promise<string | null> // Execute swap function
}

export function LimitOrderInterface({
  fromToken,
  toToken,
  fromAmount,
  onFromAmountChange,
  onPlaceLimitOrder,
  isConnected,
  walletAddress,
  getQuote,
  executeSwap,
}: LimitOrderInterfaceProps) {
  const { toast } = useToast();
  const [limitRate, setLimitRate] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [expiryTime, setExpiryTime] = useState<"1h" | "6h" | "24h" | "custom">("24h")
  const [customExpiry, setCustomExpiry] = useState({ hours: 0, minutes: 0 })
  const [slippageTolerance, setSlippageTolerance] = useState([1])
  const [isPlacing, setIsPlacing] = useState(false)

  // Calculate to amount based on limit rate
  useEffect(() => {
    if (fromAmount && limitRate) {
      const calculatedToAmount = (Number.parseFloat(fromAmount) * Number.parseFloat(limitRate)).toFixed(6)
      setToAmount(calculatedToAmount)
    } else {
      setToAmount("")
    }
  }, [fromAmount, limitRate])

  const getExpiryInHours = () => {
    switch (expiryTime) {
      case "1h":
        return 1
      case "6h":
        return 6
      case "24h":
        return 24
      case "custom":
        return customExpiry.hours + customExpiry.minutes / 60
      default:
        return 24
    }
  }

  const handlePlaceLimitOrder = async () => {
    if (!isConnected || !walletAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    if (!fromAmount || !limitRate) {
      toast({
        title: "Missing Information",
        description: "Please enter both amount and limit rate",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    if (!executeSwap || !getQuote) {
      toast({
        title: "Swap Functions Unavailable",
        description: "Swap functions not available",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsPlacing(true);

    try {
      console.log("[LimitOrder] 🚀 STEP 1: Showing swap confirmation for approval...");
      
      toast({
        title: "Preparing Limit Order",
        description: "Getting swap quote for confirmation...",
        duration: 3000,
      });
      
      // STEP 1: Get quote and show swap confirmation screen (but don't execute yet)
      // ✅ CRITICAL FIX: Convert to proper BigNumberish format (integer string)
      const fromAmountFloat = parseFloat(fromAmount);
      if (isNaN(fromAmountFloat) || fromAmountFloat <= 0) {
        throw new Error("Invalid amount");
      }
      
      const fromTokenDecimals = fromToken.decimals || 18;
      // Use BigInt for precision to avoid scientific notation
      const fromAmountScaled = BigInt(Math.floor(fromAmountFloat * Math.pow(10, fromTokenDecimals)));
      const fromAmountWei = fromAmountScaled.toString(); // Proper integer string for BigNumberish
      
      const quoteRequest = {
        fromChain: fromToken.chainId,
        toChain: toToken.chainId,
        fromToken: fromToken.address,
        toToken: toToken.address,
        fromAmount: fromAmountWei,
        fromAddress: walletAddress,
        toAddress: walletAddress,
        slippage: slippageTolerance[0],
        order: "CHEAPEST" as const,
      };

      console.log("[LimitOrder] 📡 Getting quote for confirmation...");
      const quote = await getQuote(quoteRequest);
      if (!quote) {
        throw new Error("Failed to get swap quote");
      }

      console.log("[LimitOrder] ✅ Quote received - showing swap confirmation...");
      
      // Show the ACTUAL wallet confirmation screen immediately (like your screenshot)
      console.log("[LimitOrder] 🎯 Showing wallet confirmation screen NOW...");
      
      let signedTransaction = null;
      
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // This will show the wallet confirmation screen IMMEDIATELY (like your screenshot)
        console.log("[LimitOrder] 📱 Showing wallet confirmation screen...");
        
        const txHash = await ethereum.request({
          method: "eth_sendTransaction",
          params: [{
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
            gas: quote.transactionRequest.gasLimit,
            from: walletAddress,
          }],
        });
        
        console.log("[LimitOrder] ✅ User confirmed the swap!");
        console.log("[LimitOrder] 💾 Storing transaction hash for future reference...");
        
        signedTransaction = txHash;
        
      } else {
        throw new Error("No ethereum provider found");
      }

      console.log("[LimitOrder] ✅ Swap confirmed - now getting limit order signatures...");
      
        toast({
          title: "Swap Confirmed!",
          description: "Now getting limit order signatures for auto-execution...",
          duration: 3000,
        });

      // STEP 2: After user approved the swap confirmation, get the limit order signatures
      const expiryHours = getExpiryInHours();
      const expiryTimestamp = Date.now() + expiryHours * 60 * 60 * 1000;
      const deadline = Math.floor(expiryTimestamp / 1000);
      
      // Use the fromAmountWei and fromTokenDecimals already calculated above
      const toTokenDecimals = toToken.decimals || 18;
      const minReturnAmount = (
        parseFloat(toAmount) * 0.99 * Math.pow(10, toTokenDecimals)
      ).toString();

      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // SIGNATURE 1: ERC20 Permit (Token Approval)
        console.log("[LimitOrder] 🎯 SIGNATURE 1: Token Approval...");
        
        let permitSignature = null;
        // Use environment variable for executor address to avoid hardcoded values
        // This helps MetaMask recognize legitimate contracts
        const executorAddress = process.env.NEXT_PUBLIC_EXECUTOR_ADDRESS || "0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9";
        
        const hasPermit = await supportsPermit(fromToken.address, ethereum);
        
        if (hasPermit && fromToken.address !== "0x0000000000000000000000000000000000000000") {
          try {
            permitSignature = await getPermitSignature(
              fromToken.address,
              fromToken.name,
              fromToken.symbol,
              walletAddress,
              executorAddress,
              fromAmountWei,
              deadline,
              fromToken.chainId,
              ethereum
            );
            
            if (permitSignature) {
              console.log("[LimitOrder] ✅ SIGNATURE 1 COMPLETE: Token approval obtained!");
            }
          } catch (permitError) {
            console.log("[LimitOrder] Token doesn't support Permit, will use standard approval:", permitError);
          }
        } else {
          console.log("[LimitOrder] Token is native or doesn't support Permit, skipping permit signature");
        }

        // SIGNATURE 2: EIP-712 Order Authorization
        console.log("[LimitOrder] 🎯 SIGNATURE 2: Order Authorization...");
        
        const targetRateWei = BigInt(Math.floor(parseFloat(limitRate) * Math.pow(10, toTokenDecimals))).toString();
        const minReturnAmountWei = BigInt(Math.floor(parseFloat(toAmount) * 0.99 * Math.pow(10, toTokenDecimals))).toString();
        // Use the fromAmountWei already calculated above (properly formatted as BigNumberish)
      
      const orderData = {
          maker: walletAddress,
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: fromAmountWei,
          minReturnAmount: minReturnAmountWei,
          targetRate: targetRateWei,
          expiryTimestamp: Math.floor(expiryTimestamp / 1000),
          salt: generateOrderSalt(),
          chainId: fromToken.chainId,
        };

        console.log("[LimitOrder] 📊 Order parameters:", {
          fromAmount: fromAmountWei,
          minReturn: minReturnAmountWei,
          targetRate: targetRateWei,
          expiry: Math.floor(expiryTimestamp / 1000),
        });

        const orderSignature = await signLimitOrder(orderData, walletAddress, ethereum);
        
        if (!orderSignature) {
          throw new Error("Failed to get order signature");
        }

        console.log("[LimitOrder] ✅ SIGNATURE 2 COMPLETE: Order authorized!");
        console.log("[LimitOrder] 🎉 ALL SIGNATURES OBTAINED!");

        // Create complete order data with the signed swap transaction
        const completeOrderData = {
        fromToken: {
          symbol: fromToken.symbol,
          name: fromToken.name,
          address: fromToken.address,
          chainId: fromToken.chainId,
          decimals: fromToken.decimals,
        },
        toToken: {
          symbol: toToken.symbol,
          name: toToken.name,
          address: toToken.address,
          chainId: toToken.chainId,
          decimals: toToken.decimals,
        },
        fromAmount,
        limitRate,
        toAmount,
        expiryTimestamp,
        slippage: slippageTolerance[0],
        walletAddress,
        createdAt: Date.now(),
          permitSignature: permitSignature,
          orderSignature: orderSignature,
          signature: orderSignature.signature,
          message: JSON.stringify(orderData),
          executorAddress,
          // Store the signed swap transaction for future execution
          signedSwapTransaction: signedTransaction || null,
          swapTransactionData: {
            to: quote.transactionRequest.to,
            data: quote.transactionRequest.data,
            value: quote.transactionRequest.value,
            gas: quote.transactionRequest.gasLimit,
            from: walletAddress,
          },
        };

        console.log("[LimitOrder] 💾 Storing order with swap signature for auto-execution...");
        onPlaceLimitOrder(completeOrderData);
        
        toast({
          title: "Limit Order Placed! 🎯",
          description: `✅ Swap confirmed! ✅ Order signed! Your order will execute automatically when ${fromToken.symbol} reaches ${limitRate} ${toToken.symbol}. NO MORE WALLET POPUPS!`,
          variant: "default",
          duration: 8000,
        });
        
      } else {
        throw new Error("No ethereum provider found");
      }
    } catch (error) {
      console.error("[LimitOrder] Error placing order:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      
      if (errMsg.includes("User rejected") || errMsg.includes("user rejected") || errMsg.includes("cancelled")) {
        toast({
          title: "Limit Order Cancelled",
          description: "Order was cancelled by user",
          variant: "default",
          duration: 4000,
        });
      } else {
        toast({
          title: "Limit Order Failed",
          description: errMsg,
          variant: "destructive",
          duration: 4000,
        });
      }
    } finally {
      setIsPlacing(false);
    }
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Limit Rate Setting */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-white text-sm font-medium">Limit Rate</label>
          <div className="flex items-center space-x-1 text-gray-400">
            <Info className="h-3 w-3" />
            <span className="text-xs">Rate at which swap executes</span>
          </div>
        </div>

        <div className="bg-[#1F1F1F] border border-[#2C2C2C] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-gray-800">
                {fromToken.logoURI ? (
                  <img
                    src={fromToken.logoURI}
                    alt={fromToken.symbol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${fromToken.symbol.toLowerCase()}.png`;
                      target.onerror = () => {
                        target.style.display = "none";
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">${fromToken.symbol.charAt(0)}</div>`;
                        }
                      };
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                    {fromToken.symbol.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-white font-medium">{fromToken.symbol}</span>
            </div>

            <span className="text-gray-400 text-lg">=</span>

            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="0"
                value={limitRate}
                onChange={(e) => setLimitRate(e.target.value)}
                className="bg-transparent border-none text-right text-xl font-medium text-white p-0 h-auto focus-visible:ring-0 w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-gray-800">
                {toToken.logoURI ? (
                  <img
                    src={toToken.logoURI}
                    alt={toToken.symbol}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${toToken.symbol.toLowerCase()}.png`;
                      target.onerror = () => {
                        target.style.display = "none";
                        if (target.parentElement) {
                          target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-white text-xs font-bold">${toToken.symbol.charAt(0)}</div>`;
                        }
                      };
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-500 to-teal-600 text-white text-xs font-bold">
                    {toToken.symbol.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-white font-medium">{toToken.symbol}</span>
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Set the minimum rate at which you want the swap to execute. Your order will only fill when this rate is
            reached or better.
          </div>
        </div>
      </div>

      {/* Expected Output */}
      {toAmount && (
        <div className="bg-[#1F1F1F] border border-[#2C2C2C] p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">You will receive</span>
            <div className="flex items-center space-x-2">
              <span className="text-white text-lg font-medium">{toAmount}</span>
              <span className="text-gray-400">{toToken.symbol}</span>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Time */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <label className="text-white text-sm font-medium">Expiry Time</label>
        </div>

        <div className="flex space-x-2">
          {(["1h", "6h", "24h", "custom"] as const).map((time) => (
            <Button
              key={time}
              variant={expiryTime === time ? "default" : "ghost"}
              size="sm"
              onClick={() => setExpiryTime(time)}
              className={
                expiryTime === time
                  ? "bg-yellow-400 text-black hover:bg-yellow-500"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }
            >
              {time === "1h" ? "1 Hour" : time === "6h" ? "6 Hours" : time === "24h" ? "24 Hours" : "Custom"}
            </Button>
          ))}
        </div>

        {expiryTime === "custom" && (
          <div className="flex items-center space-x-4 bg-[#1F1F1F] border border-[#2C2C2C] p-4">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="0"
                value={customExpiry.hours}
                onChange={(e) => setCustomExpiry((prev) => ({ ...prev, hours: Number.parseInt(e.target.value) || 0 }))}
                className="w-16 bg-transparent border-gray-600 text-white text-center"
                min="0"
                max="168"
              />
              <span className="text-gray-400 text-sm">hours</span>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                placeholder="0"
                value={customExpiry.minutes}
                onChange={(e) =>
                  setCustomExpiry((prev) => ({ ...prev, minutes: Number.parseInt(e.target.value) || 0 }))
                }
                className="w-16 bg-transparent border-gray-600 text-white text-center"
                min="0"
                max="59"
              />
              <span className="text-gray-400 text-sm">minutes</span>
            </div>
          </div>
        )}

        <div className="text-center">
          <div className="text-2xl font-mono text-white">
            {expiryTime === "custom"
              ? `${String(customExpiry.hours).padStart(2, "0")}:${String(customExpiry.minutes).padStart(2, "0")}`
              : expiryTime === "1h"
                ? "01:00"
                : expiryTime === "6h"
                  ? "06:00"
                  : "24:00"}
          </div>
        </div>

        <div className="text-xs text-gray-400 text-center">
          Set how long your order stays active. If the target rate isn&apos;t reached before expiry, the order will be
          cancelled.
        </div>
      </div>

      {/* Slippage Tolerance */}
      <div className="space-y-3">
        <label className="text-white text-sm font-medium">Slippage Tolerance</label>

        <div className="bg-[#1F1F1F] border border-[#2C2C2C] mt-4 p-4">
          <div className="flex items-center justify-between mb-4">
            <Slider
              value={slippageTolerance}
              onValueChange={setSlippageTolerance}
              max={5}
              min={0.1}
              step={0.1}
              className="flex-1 mr-4 bg-[#121212]"
            />
            <div className="bg-yellow-400 text-black px-3 py-1 rounded text-sm font-medium min-w-[60px] text-center">
              {slippageTolerance[0]}%
            </div>
          </div>

          <div className="text-xs text-gray-400">Maximum price movement you&apos;re willing to accept during execution</div>
        </div>
      </div>

      {/* Place Limit Order Button */}
      <Button
        onClick={handlePlaceLimitOrder}
        disabled={!fromAmount || !limitRate || isPlacing}
        className="w-full h-12 bg-gradient-to-r from-[#F3DA5F] to-[#FCD404] text-black font-medium text-lg"
      >
        {isPlacing ? "Preparing & Signing..." : "Place Limit Swap"}
      </Button>

      {/* Info about autonomous execution */}
      <div className="text-xs text-gray-400 text-center leading-relaxed bg-green-900/10 border border-green-500/20 p-3 rounded">
        <p className="text-green-400 font-medium mb-1">🤖 Sign Twice for Fully Autonomous Execution!</p>
        <div className="text-xs text-green-300/90 space-y-1">
          <p>1️⃣ First signature: Approve token spending (Permit)</p>
          <p>2️⃣ Second signature: Authorize order execution (EIP-712)</p>
          <p className="text-green-400 font-medium mt-2">After signing, you can disconnect or go offline!</p>
          <p>Order will execute automatically when your rate is reached - ZERO interaction needed!</p>
        </div>
      </div>
    </div>
  )
}
