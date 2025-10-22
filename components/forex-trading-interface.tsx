/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronDown, TrendingUp, TrendingDown } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface ForexPair {
  symbol: string
  name: string
  price: number
  change24h: number
  high24h: number
  low24h: number
  funding: number
}

interface Position {
  id: string
  pair: string
  side: "long" | "short"
  size: number
  entryPrice: number
  currentPrice: number
  pnl: number
  margin: number
  leverage: number
  liquidationPrice: number
  timestamp: number
}

interface Order {
  id: string
  pair: string
  side: "long" | "short"
  type: "market" | "limit"
  amount: number
  price: number
  leverage: number
  status: "pending" | "filled" | "cancelled"
  timestamp: number
}

interface ForexTradingInterfaceProps {
  onSwitchToCrypto?: () => void
}

const FOREX_PAIRS: ForexPair[] = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    price: 1.0847,
    change24h: -0.23,
    high24h: 1.0878,
    low24h: 1.0832,
    funding: 0.0012,
  },
  {
    symbol: "GBP/USD",
    name: "British Pound / US Dollar",
    price: 1.2634,
    change24h: 0.15,
    high24h: 1.2658,
    low24h: 1.2612,
    funding: -0.0008,
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen",
    price: 149.82,
    change24h: 0.45,
    high24h: 150.12,
    low24h: 149.23,
    funding: 0.0015,
  },
  {
    symbol: "AUD/USD",
    name: "Australian Dollar / US Dollar",
    price: 0.6523,
    change24h: -0.18,
    high24h: 0.6541,
    low24h: 0.6508,
    funding: 0.0003,
  },
  {
    symbol: "USD/CAD",
    name: "US Dollar / Canadian Dollar",
    price: 1.3456,
    change24h: 0.12,
    high24h: 1.3478,
    low24h: 1.3432,
    funding: -0.0005,
  },
  {
    symbol: "USD/CHF",
    name: "US Dollar / Swiss Franc",
    price: 0.8923,
    change24h: -0.08,
    high24h: 0.8945,
    low24h: 0.8901,
    funding: 0.0007,
  },
  {
    symbol: "NZD/USD",
    name: "New Zealand Dollar / US Dollar",
    price: 0.6123,
    change24h: -0.25,
    high24h: 0.6145,
    low24h: 0.6098,
    funding: 0.0002,
  },
  {
    symbol: "EUR/GBP",
    name: "Euro / British Pound",
    price: 0.8587,
    change24h: -0.35,
    high24h: 0.8612,
    low24h: 0.8563,
    funding: 0.0009,
  },
  {
    symbol: "GBP/JPY",
    name: "British Pound / Japanese Yen",
    price: 189.34,
    change24h: 0.62,
    high24h: 190.12,
    low24h: 188.76,
    funding: 0.0018,
  },
  {
    symbol: "EUR/JPY",
    name: "Euro / Japanese Yen",
    price: 162.45,
    change24h: 0.28,
    high24h: 163.12,
    low24h: 161.89,
    funding: 0.0014,
  },
]

export function ForexTradingInterface({ onSwitchToCrypto }: ForexTradingInterfaceProps) {
  const { isConnected, balance } = useWallet()
  const [selectedPair, setSelectedPair] = useState<ForexPair>(FOREX_PAIRS[0])
  const [tradeSide, setTradeSide] = useState<"long" | "short">("long")
  const [orderType, setOrderType] = useState<"market" | "limit">("market")
  const [amount, setAmount] = useState("")
  const [leverage, setLeverage] = useState([1])
  const [limitPrice, setLimitPrice] = useState("")
  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [availableBalance, setAvailableBalance] = useState(0)
  const [priceData, setPriceData] = useState<any[]>([])
  const [isPairModalOpen, setIsPairModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isConnected && balance) {
      setAvailableBalance(Number(balance))
    } else {
      setAvailableBalance(0)
    }
  }, [isConnected, balance])

  useEffect(() => {
    const fetchForexData = async () => {
      try {
        const response = await fetch(`/api/forex-data?symbol=${selectedPair.symbol}`)
        const data = await response.json()

        if (data.success) {
          setSelectedPair((prev) => ({
            ...prev,
            price: data.price,
            change24h: data.change24h,
            high24h: data.high24h,
            low24h: data.low24h,
          }))
          setPriceData(data.priceHistory || [])

          setPositions((prevPositions) =>
            prevPositions.map((position) => {
              if (position.pair === selectedPair.symbol) {
                const priceDiff = data.price - position.entryPrice
                const pnl = position.side === "long" ? priceDiff * position.size : -priceDiff * position.size
                return {
                  ...position,
                  currentPrice: data.price,
                  pnl: pnl,
                }
              }
              return position
            }),
          )
        }
      } catch (error) {
        console.error("Forex data fetch error:", error)
      }
    }

    fetchForexData()
    const interval = setInterval(fetchForexData, 10000)
    return () => clearInterval(interval)
  }, [selectedPair.symbol])

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
    script.type = "text/javascript"
    script.async = true
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "FX:${selectedPair.symbol.replace("/", "")}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "enable_publishing": false,
        "backgroundColor": "rgba(19, 23, 34, 1)",
        "gridColor": "rgba(42, 46, 57, 0.5)",
        "hide_top_toolbar": false,
        "hide_legend": false,
        "save_image": false,
        "container_id": "tradingview_chart"
      }`

    const chartContainer = document.getElementById("tradingview_chart")
    if (chartContainer) {
      chartContainer.innerHTML = ""
      chartContainer.appendChild(script)
    }
  }, [selectedPair.symbol])

  const calculateMargin = () => {
    if (!amount) return 0
    const notionalValue = Number.parseFloat(amount) * (selectedPair?.price || 0)
    return notionalValue / (leverage[0] || 1)
  }

  const calculateLiquidationPrice = () => {
    if (!amount || !selectedPair?.price) return 0
    const margin = calculateMargin()
    const maintenanceMargin = margin * 0.05 // 5% maintenance margin
    const marginPerUnit = maintenanceMargin / Number.parseFloat(amount)

    if (tradeSide === "long") {
      return selectedPair.price - marginPerUnit
    } else {
      return selectedPair.price + marginPerUnit
    }
  }

  const calculateFee = () => {
    if (!amount || !selectedPair?.price) return 0
    const notionalValue = Number.parseFloat(amount) * selectedPair.price
    const feeRate = orderType === "market" ? 0.0008 : 0.0006 // Higher fee for market orders
    return notionalValue * feeRate
  }

  const handleSubmitOrder = async () => {
    if (!isConnected) {
      alert("Please connect your wallet first")
      return
    }

    if (!amount || Number.parseFloat(amount) <= 0) {
      alert("Please enter a valid amount")
      return
    }

    const margin = calculateMargin()
    if (margin > availableBalance) {
      alert("Insufficient margin")
      return
    }

    if (orderType === "limit" && (!limitPrice || Number.parseFloat(limitPrice) <= 0)) {
      alert("Please enter a valid limit price")
      return
    }

    setIsLoading(true)

    try {
      const orderData = {
        pair: selectedPair.symbol,
        side: tradeSide,
        type: orderType,
        amount: Number.parseFloat(amount),
        price: orderType === "limit" ? Number.parseFloat(limitPrice) : selectedPair.price,
        leverage: leverage[0],
        margin,
        liquidationPrice: calculateLiquidationPrice(),
        fee: calculateFee(),
        timestamp: Date.now(),
      }

      const response = await fetch("/api/forex-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (result.success) {
        if (orderType === "market") {
          const newPosition: Position = {
            id: Date.now().toString(),
            pair: selectedPair.symbol,
            side: tradeSide,
            size: Number.parseFloat(amount),
            entryPrice: selectedPair.price,
            currentPrice: selectedPair.price,
            pnl: 0,
            margin,
            leverage: leverage[0],
            liquidationPrice: calculateLiquidationPrice(),
            timestamp: Date.now(),
          }
          setPositions((prev) => [...prev, newPosition])

          setAvailableBalance((prev) => prev - margin - calculateFee())

          alert(`Position opened successfully! Entry price: $${selectedPair.price.toFixed(4)}`)
        } else {
          const newOrder: Order = {
            id: Date.now().toString(),
            pair: selectedPair.symbol,
            side: tradeSide,
            type: orderType,
            amount: Number.parseFloat(amount),
            price: Number.parseFloat(limitPrice),
            leverage: leverage[0],
            status: "pending",
            timestamp: Date.now(),
          }
          setOrders((prev) => [...prev, newOrder])
          alert(`Limit order placed successfully at $${limitPrice}`)
        }

        // Reset form
        setAmount("")
        setLimitPrice("")
      } else {
        alert("Order failed: " + result.error)
      }
    } catch (error) {
      console.error("Order submission error:", error)
      alert("Order failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const closePosition = async (positionId: string) => {
    const position = positions.find((p) => p.id === positionId)
    if (!position) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/forex-close-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId, currentPrice: selectedPair.price }),
      })

      const result = await response.json()
      if (result.success) {
        // Remove position and update balance
        setPositions((prev) => prev.filter((p) => p.id !== positionId))
        setAvailableBalance((prev) => prev + position.margin + position.pnl - calculateFee())
        alert(`Position closed. PnL: $${position.pnl.toFixed(2)}`)
      }
    } catch (error) {
      console.error("Position close error:", error)
      alert("Failed to close position")
    } finally {
      setIsLoading(false)
    }
  }

  const isInsufficientMargin = calculateMargin() > availableBalance

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex flex-col lg:flex-row h-screen">
        <div className="flex-1 p-4">
          <div className="bg-gray-900 rounded-lg h-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center space-x-4">
                <Dialog open={isPairModalOpen} onOpenChange={setIsPairModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" className="text-white hover:bg-gray-800">
                      <span className="text-lg font-bold">{selectedPair.symbol}</span>
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Select Trading Pair</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {FOREX_PAIRS.map((pair) => (
                        <Button
                          key={pair.symbol}
                          variant="ghost"
                          className="w-full justify-start hover:bg-gray-800 p-4"
                          onClick={() => {
                            setSelectedPair(pair)
                            setIsPairModalOpen(false)
                          }}
                        >
                          <div className="flex justify-between w-full">
                            <div>
                              <div className="font-bold text-left">{pair.symbol}</div>
                              <div className="text-sm text-gray-400 text-left">{pair.name}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono">${(pair?.price || 0).toFixed(4)}</div>
                              <div
                                className={`text-sm ${(pair?.change24h || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                              >
                                {(pair?.change24h || 0) >= 0 ? "+" : ""}
                                {(pair?.change24h || 0).toFixed(2)}%
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center space-x-6 text-sm">
                  <div>
                    <span className="text-gray-400">Market Price</span>
                    <div className="font-mono">${(selectedPair?.price || 0).toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">24H Change</span>
                    <div
                      className={`flex items-center ${(selectedPair?.change24h || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {(selectedPair?.change24h || 0) >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {(selectedPair?.change24h || 0) >= 0 ? "+" : ""}
                      {(selectedPair?.change24h || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">24H High</span>
                    <div className="font-mono">${(selectedPair?.high24h || 0).toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">24H Low</span>
                    <div className="font-mono">${(selectedPair?.low24h || 0).toFixed(4)}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Funding</span>
                    <div className="font-mono">{((selectedPair?.funding || 0) * 100).toFixed(4)}%</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4">
              <div className="bg-gray-800 rounded-lg h-96">
                <div id="tradingview_chart" className="w-full h-full rounded-lg" style={{ minHeight: "384px" }} />
              </div>
            </div>

            <div className="p-4">
              <Tabs defaultValue="positions" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                  <TabsTrigger value="orders">Open Orders ({orders.length})</TabsTrigger>
                  <TabsTrigger value="positions">Positions ({positions.length})</TabsTrigger>
                  <TabsTrigger value="history">Trade History</TabsTrigger>
                </TabsList>

                <TabsContent value="orders" className="mt-4">
                  <div className="bg-gray-800 rounded-lg p-4 min-h-32">
                    {orders.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">No Data Available</div>
                    ) : (
                      <div className="space-y-2">
                        {orders.map((order) => (
                          <div key={order.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                            <span>
                              {order.pair} {order.side.toUpperCase()}
                            </span>
                            <span>
                              {order.amount} @ ${order.price}
                            </span>
                            <Badge variant="outline">{order.status}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="positions" className="mt-4">
                  <div className="bg-gray-800 rounded-lg p-4 min-h-32">
                    {positions.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">No Data Available</div>
                    ) : (
                      <div className="space-y-2">
                        {positions.map((position) => (
                          <div key={position.id} className="flex justify-between items-center p-2 bg-gray-700 rounded">
                            <span>
                              {position.pair} {position.side.toUpperCase()}
                            </span>
                            <span>Size: {position.size}</span>
                            <span className={position.pnl >= 0 ? "text-green-400" : "text-red-400"}>
                              PnL: ${(position?.pnl || 0).toFixed(2)}
                            </span>
                            <Button
                              onClick={() => closePosition(position.id)}
                              className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-2 py-1"
                            >
                              Close
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="bg-gray-800 rounded-lg p-4 min-h-32">
                    <div className="text-center text-gray-400 py-8">No Data Available</div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-80 p-4">
          <Card className="bg-gray-900 border-gray-700 h-full">
            <div className="p-4 space-y-4">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setTradeSide("long")}
                  className={`flex-1 ${
                    tradeSide === "long"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  Long
                </Button>
                <Button
                  onClick={() => setTradeSide("short")}
                  className={`flex-1 ${
                    tradeSide === "short"
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  }`}
                >
                  Short
                </Button>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={() => setOrderType("market")}
                  variant={orderType === "market" ? "default" : "outline"}
                  className="flex-1"
                >
                  Market
                </Button>
                <Button
                  onClick={() => setOrderType("limit")}
                  variant={orderType === "limit" ? "default" : "outline"}
                  className="flex-1"
                >
                  Limit
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Available Balance</span>
                  <span className="text-white">{(availableBalance || 0).toFixed(2)} USDC</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount</label>
                <div className="flex">
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <Button
                    onClick={() => setAmount((availableBalance * leverage[0]).toString())}
                    className="ml-2 bg-gray-700 hover:bg-gray-600"
                  >
                    Max
                  </Button>
                </div>
              </div>

              {orderType === "limit" && (
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Price</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-gray-400">Max Leverage: 100x</label>
                  <span className="text-white">{leverage[0]}X</span>
                </div>
                <Slider value={leverage} onValueChange={setLeverage} max={100} min={1} step={1} className="w-full" />
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Size</span>
                  <span className="text-white">
                    {amount ? (Number.parseFloat(amount) * (selectedPair?.price || 0)).toFixed(2) : "-"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Liq. Price</span>
                  <span className="text-white">{amount ? calculateLiquidationPrice().toFixed(4) : "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Est. Slippage</span>
                  <span className="text-white">0.02%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Fee</span>
                  <span className="text-yellow-400">{amount ? `$${calculateFee().toFixed(4)}` : "Estimate"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Available OI</span>
                  <span className="text-white">$6,000.00</span>
                </div>
              </div>

              <Button
                onClick={handleSubmitOrder}
                disabled={!isConnected || isInsufficientMargin || !amount || isLoading}
                className={`w-full h-12 font-medium ${
                  isInsufficientMargin
                    ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                    : tradeSide === "long"
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                {!isConnected
                  ? "Connect Wallet"
                  : isInsufficientMargin
                    ? "Insufficient margin"
                    : isLoading
                      ? "Processing..."
                      : `Submit Order`}
              </Button>

              <div className="space-y-1 text-xs text-gray-400 border-t border-gray-700 pt-4">
                <div className="flex justify-between">
                  <span>Balance</span>
                  <span>{(availableBalance || 0).toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span>Unrealized PNL</span>
                  <span
                    className={
                      (positions.reduce((total, pos) => total + (pos?.pnl || 0), 0) || 0) >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {(positions.reduce((total, pos) => total + (pos?.pnl || 0), 0) || 0).toFixed(2)} USD
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
