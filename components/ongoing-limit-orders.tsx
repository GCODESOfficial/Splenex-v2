/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, ChevronUp, ChevronDown, Clock, TrendingUp } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

interface LimitOrder {
  id: string
  fromToken: {
    symbol: string
    name: string
    address: string
    chainId: number
    decimals?: number
  }
  toToken: {
    symbol: string
    name: string
    address: string
    chainId: number
    decimals?: number
  }
  fromAmount: string
  limitRate: string
  toAmount: string
  expiryTimestamp: number
  slippage: number
  walletAddress: string
  createdAt: number
  status: "pending" | "executed" | "expired" | "cancelled"
  signature: string
  message: string
}

interface OngoingLimitOrdersProps {
  walletAddress?: string
  onRefresh?: () => void
}

export function OngoingLimitOrders({ walletAddress, onRefresh }: OngoingLimitOrdersProps) {
  const [orders, setOrders] = useState<LimitOrder[]>([])
  const [isExpanded, setIsExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [executingOrders, setExecutingOrders] = useState<Set<string>>(new Set())

  // Fetch orders from database (silent updates, no flickering)
  const fetchOrders = async (showLoading = false) => {
    if (!walletAddress) return

    try {
      if (showLoading) setIsLoading(true)
      console.log("[OngoingOrders] Fetching orders for wallet:", walletAddress)

      const { data, error } = await supabase
        .from("limit_orders")
        .select("*")
        .eq("wallet_address", walletAddress.toLowerCase())
        .in("status", ["pending", "executed", "expired"])
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[OngoingOrders] Error fetching orders:", error)
        return
      }

      if (data) {
        const formattedOrders: LimitOrder[] = data.map((order: any) => ({
          id: order.id,
          fromToken: order.from_token,
          toToken: order.to_token,
          fromAmount: order.from_amount,
          limitRate: order.limit_rate,
          toAmount: order.to_amount,
          expiryTimestamp: order.expiry_timestamp,
          slippage: order.slippage,
          walletAddress: order.wallet_address,
          createdAt: order.created_at,
          status: order.status,
          signature: order.signature,
          message: order.message,
        }))

        console.log(`[OngoingOrders] Found ${formattedOrders.length} orders`)
        setOrders(formattedOrders)
        setIsInitialLoad(false)
      }
    } catch (error) {
      console.error("[OngoingOrders] Error:", error)
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  // Auto-refresh orders every 10 seconds (silent updates)
  useEffect(() => {
    if (walletAddress) {
      fetchOrders(true) // Show loading on initial fetch
      const interval = setInterval(() => fetchOrders(false), 10000) // Silent updates
      return () => clearInterval(interval)
    } else {
      setOrders([])
      setIsInitialLoad(true)
    }
  }, [walletAddress])

  // Execute ready order automatically
  const executeReadyOrder = async (order: any) => {
    if (executingOrders.has(order.id)) {
      console.log("[OngoingOrders] Order already executing:", order.id)
      return
    }

    try {
      setExecutingOrders(prev => new Set(prev).add(order.id))
      console.log("[OngoingOrders] 🚀 Executing order:", order.id)
      
      // Get the full order data including pre-signed transaction
      const { data: orderData, error: fetchError } = await supabase
        .from("limit_orders")
        .select("*")
        .eq("id", order.id)
        .single()

      if (fetchError || !orderData) {
        console.log("[OngoingOrders] Could not fetch order data")
        setExecutingOrders(prev => {
          const next = new Set(prev)
          next.delete(order.id)
          return next
        })
        return
      }

      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethereum = (window as any).ethereum
        let txHash = null
        
        // Method 1: Try pre-signed transaction (ZERO POPUPS!)
        if (orderData.presigned_transaction) {
          console.log("[OngoingOrders] 🚀 Using PRE-SIGNED transaction!")
          console.log("[OngoingOrders] ⚡ Broadcasting silently...")

          try {
            txHash = await ethereum.request({
              method: "eth_sendRawTransaction",
              params: [orderData.presigned_transaction],
            })

            console.log("[OngoingOrders] 🎉 PRE-SIGNED transaction broadcast - ZERO POPUPS!")
          } catch (rawTxError) {
            console.warn("[OngoingOrders] Pre-signed tx failed, using standard method:", rawTxError)
            txHash = null
          }
        }

        // Method 2: Standard execution with quote
        if (!txHash) {
          console.log("[OngoingOrders] 📤 Using standard execution...")
          
          if (!orderData.execution_quote) {
            throw new Error("No execution quote available")
          }

          const quote = orderData.execution_quote
          
          txHash = await ethereum.request({
            method: "eth_sendTransaction",
            params: [{
              from: order.walletAddress,
              to: quote.transactionRequest.to,
              data: quote.transactionRequest.data,
              value: quote.transactionRequest.value || "0x0",
              gas: quote.transactionRequest.gasLimit,
            }],
          })
        }

        console.log("[OngoingOrders] ✅ Transaction sent:", txHash)

        // Update order status to executed
        await supabase
          .from("limit_orders")
          .update({ 
            status: "executed",
            executed_at: new Date().toISOString(),
            tx_hash: txHash,
          })
          .eq("id", order.id)

        alert(`✅ Limit order executed! TX: ${txHash.substring(0, 10)}...`)
        fetchOrders()
        onRefresh?.()
      }
    } catch (error) {
      console.error("[OngoingOrders] Execution error:", error)
      const errMsg = error instanceof Error ? error.message : String(error)
      
      if (!errMsg.includes("User rejected")) {
        alert(`Failed to execute order: ${errMsg}`)
      }
    } finally {
      setExecutingOrders(prev => {
        const next = new Set(prev)
        next.delete(order.id)
        return next
      })
    }
  }

  // Check for ready orders and auto-execute
  useEffect(() => {
    const checkReadyOrders = async () => {
      if (!walletAddress) return

      try {
        const { data, error } = await supabase
          .from("limit_orders")
          .select("*")
          .eq("wallet_address", walletAddress.toLowerCase())
          .eq("status", "pending")
          .eq("ready_for_execution", true)

        if (error || !data || data.length === 0) return

        console.log(`[OngoingOrders] 🎯 Found ${data.length} ready order(s) for execution`)

        // Execute each ready order
        for (const order of data) {
          if (!executingOrders.has(order.id)) {
            console.log(`[OngoingOrders] 🚀 Conditions met! Auto-executing order ${order.id}`)
            executeReadyOrder({
              id: order.id,
              walletAddress: order.wallet_address,
              fromToken: order.from_token,
              toToken: order.to_token,
            })
          }
        }
      } catch (error) {
        console.error("[OngoingOrders] Error checking ready orders:", error)
      }
    }

    // Check on mount and every 30 seconds
    if (walletAddress) {
      checkReadyOrders()
      const interval = setInterval(checkReadyOrders, 30000)
      return () => clearInterval(interval)
    }
  }, [walletAddress, executingOrders])

  // Cancel order
  const handleCancelOrder = async (orderId: string) => {
    try {
      console.log("[OngoingOrders] Cancelling order:", orderId)

      const { error } = await supabase
        .from("limit_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)

      if (error) {
        console.error("[OngoingOrders] Error cancelling order:", error)
        alert("Failed to cancel order")
        return
      }

      console.log("[OngoingOrders] Order cancelled successfully")
      fetchOrders()
      onRefresh?.()
    } catch (error) {
      console.error("[OngoingOrders] Error:", error)
      alert("Failed to cancel order")
    }
  }

  // Remove expired order from list
  const handleRemoveExpiredOrder = async (orderId: string) => {
    try {
      console.log("[OngoingOrders] Removing expired order:", orderId)

      // Delete the order from database
      const { error } = await supabase
        .from("limit_orders")
        .delete()
        .eq("id", orderId)

      if (error) {
        console.error("[OngoingOrders] Error removing order:", error)
        alert("Failed to remove order")
        return
      }

      console.log("[OngoingOrders] Expired order removed successfully")
      fetchOrders()
      onRefresh?.()
    } catch (error) {
      console.error("[OngoingOrders] Error:", error)
      alert("Failed to remove order")
    }
  }

  // Format time remaining
  const getTimeRemaining = (expiryTimestamp: number) => {
    const now = Date.now()
    const remaining = expiryTimestamp - now

    if (remaining <= 0) return "Expired"

    const hours = Math.floor(remaining / (1000 * 60 * 60))
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  // Filter orders by status
  const pendingOrders = orders.filter(o => o.status === "pending")
  const executedOrders = orders.filter(o => o.status === "executed")
  const expiredOrders = orders.filter(o => o.status === "expired")
  
  // Desktop: Only show if there are orders and wallet is connected
  const showDesktop = walletAddress && orders.length > 0
  
  // Mobile: Always show when wallet is connected (even if no orders yet)
  const showMobile = walletAddress

  return (
    <>
      {/* Desktop View - Bottom Right */}
      {showDesktop && (
      <div className="hidden md:block md:fixed bottom-20 right-4 z-50 w-96">
        <div className="bg-[#121212] border-2 border-[#FCD404] shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center justify-between p-3 bg-[#1A1A1A] cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-yellow-400" />
              <h3 className="text-white font-semibold text-sm">
                Limit Orders ({pendingOrders.length} Active)
              </h3>
              {executedOrders.length > 0 && (
                <span className="text-xs text-green-400">
                  +{executedOrders.length} ✓
                </span>
              )}
              {expiredOrders.length > 0 && (
                <span className="text-xs text-gray-500">
                  +{expiredOrders.length} ⏰
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-0 h-auto"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Orders List */}
          {isExpanded && (
            <div className="max-h-96 overflow-y-auto">
              {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`border-t border-[#2A2A2A] p-3 transition-colors ${
                      order.status === "pending" 
                        ? "hover:bg-[#1A1A1A]" 
                        : order.status === "executed"
                        ? "bg-green-900/10 border-l-2 border-l-green-500"
                        : "bg-gray-900/10 border-l-2 border-l-gray-600 opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {/* Status Badge */}
                          {order.status === "executed" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                              ✓ Executed
                            </span>
                          )}
                          {order.status === "expired" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                              ⏰ Expired
                            </span>
                          )}
                          {order.status === "pending" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              ⏳ Pending
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-medium text-sm">
                            {order.fromAmount} {order.fromToken.symbol}
                          </span>
                          <span className="text-gray-400 text-xs">→</span>
                          <span className="text-yellow-400 font-medium text-sm">
                            {order.toAmount} {order.toToken.symbol}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Rate: 1 {order.fromToken.symbol} = {order.limitRate}{" "}
                          {order.toToken.symbol}
                        </div>
                      </div>
                      {order.status === "pending" && (
                        <div className="flex items-center gap-2">
                          {executingOrders.has(order.id) && (
                            <span className="text-xs text-yellow-400 animate-pulse">
                              Executing...
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id)}
                            className="text-red-400 hover:text-red-300 p-1 h-auto"
                            disabled={executingOrders.has(order.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {order.status === "expired" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveExpiredOrder(order.id)}
                          className="text-gray-400 hover:text-gray-300 hover:bg-gray-900/20 p-1 h-auto"
                          title="Remove from List"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      {order.status === "pending" ? (
                        <>
                          <div className="flex items-center space-x-1 text-gray-400">
                            <Clock className="h-3 w-3" />
                            <span>{getTimeRemaining(order.expiryTimestamp)}</span>
                          </div>
                          <div className="text-gray-500">
                            Slippage: {order.slippage}%
                          </div>
                        </>
                      ) : order.status === "executed" ? (
                        <div className="text-green-400 text-xs">
                          ✓ Swap completed successfully
                        </div>
                      ) : (
                        <div className="text-gray-500 text-xs">
                          ⏰ Order expired without execution
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Mobile View - Natural Flow at Bottom of Page */}
      {showMobile && (
      <div className="md:hidden mt-6 mb-24 px-4">
        <div className="bg-[#121212] border-2 border-[#FCD404] shadow-2xl">
          {/* Header */}
          <div
            className="flex items-center justify-between p-3 bg-[#1A1A1A]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-yellow-400" />
              <h3 className="text-white font-semibold text-sm">
                Limit Orders ({pendingOrders.length} Active)
              </h3>
              {executedOrders.length > 0 && (
                <span className="text-xs text-green-400">
                  +{executedOrders.length} ✓
                </span>
              )}
              {expiredOrders.length > 0 && (
                <span className="text-xs text-gray-500">
                  +{expiredOrders.length} ⏰
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-0 h-auto"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Orders List */}
          {isExpanded && (
            <div className="max-h-64 overflow-y-auto">
              {orders.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  <div className="mb-2">No limit orders yet</div>
                  <div className="text-xs text-gray-500">
                    Create a limit order to see it here
                  </div>
                </div>
              ) : (
                orders.map((order) => (
                <div
                  key={order.id}
                  className={`border-t border-[#2A2A2A] p-3 transition-colors ${
                    order.status === "pending" 
                      ? "" 
                      : order.status === "executed"
                      ? "bg-green-900/10 border-l-2 border-l-green-500"
                      : "bg-gray-900/10 border-l-2 border-l-gray-600 opacity-75"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {/* Status Badge */}
                        {order.status === "executed" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            ✓ Executed
                          </span>
                        )}
                        {order.status === "expired" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
                            ⏰ Expired
                          </span>
                        )}
                        {order.status === "pending" && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-medium text-sm">
                          {order.fromAmount} {order.fromToken.symbol}
                        </span>
                        <span className="text-gray-400 text-xs">→</span>
                        <span className="text-yellow-400 font-medium text-sm">
                          {order.toAmount} {order.toToken.symbol}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Rate: {order.limitRate} {order.toToken.symbol}
                      </div>
                    </div>
                    {order.status === "pending" && (
                      <div className="flex items-center gap-2">
                        {executingOrders.has(order.id) && (
                          <span className="text-xs text-yellow-400 animate-pulse">
                            Executing...
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-red-400 hover:text-red-300 p-1 h-auto"
                          disabled={executingOrders.has(order.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {order.status === "expired" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExpiredOrder(order.id)}
                        className="text-gray-400 hover:text-gray-300 hover:bg-gray-900/20 p-1 h-auto"
                        title="Remove from List"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {order.status === "pending" ? (
                      <>
                        <div className="flex items-center space-x-1 text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{getTimeRemaining(order.expiryTimestamp)}</span>
                        </div>
                        <div className="text-gray-500">
                          Slippage: {order.slippage}%
                        </div>
                      </>
                    ) : order.status === "executed" ? (
                      <div className="text-green-400 text-xs">
                        ✓ Swap completed successfully
                      </div>
                    ) : (
                      <div className="text-gray-500 text-xs">
                        ⏰ Order expired without execution
                      </div>
                    )}
                  </div>
                </div>
              ))
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </>
  )
}

