/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X, Copy, BarChart3, TrendingUp, Maximize2 } from "lucide-react"

interface Token {
  symbol: string
  name: string
  address: string
  chainId: number
  chainName: string
}

interface TokenPriceChartProps {
  isOpen: boolean
  onClose: () => void
  fromToken: Token
  toToken: Token
}

// ===================================================
//   LIVE DEX + BINANCE CHART  (keeps your old UI)
// ===================================================
interface FastChartProps {
  symbol: string
  timeframe: string
}

function FastChart({ symbol, timeframe }: FastChartProps) {
  const [priceData, setPriceData] = useState<any[]>([])
  const [currentPrice, setCurrentPrice] = useState<number>(0)
  const [priceChange, setPriceChange] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)
  const [source, setSource] = useState<string>("")
  const [pairAddress, setPairAddress] = useState<string>("")

  // === Detect Dex pair automatically ===
  useEffect(() => {
    const fetchPair = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${symbol}`)
        const json = await res.json()
        if (json?.pairs?.length) {
          const pair = json.pairs[0]
          setPairAddress(pair.pairAddress)
          setSource(pair.dexId || "DexScreener")
        } else setSource("Binance")
      } catch {
        setSource("Binance")
      }
    }
    fetchPair()
  }, [symbol])

  // === Live WebSocket Stream ===
  useEffect(() => {
    let ws: WebSocket | null = null
    setIsLoading(true)

    const pushCandle = (price: number, volume: number) => {
      setPriceData(prev => {
        const newData = [...prev, {
          time: Date.now(),
          open: price,
          high: price * 1.002,
          low: price * 0.998,
          close: price,
          volume,
          price,
        }].slice(-100)
        return newData
      })
      setCurrentPrice(price)
    }

    const connectDex = () => {
      const url = "wss://io.dexscreener.com/ws/token-price"
      ws = new WebSocket(url)
      ws.onopen = () =>
        ws?.send(JSON.stringify({ type: "subscribe", payload: { symbol: pairAddress || symbol } }))
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === "price") {
          const p = parseFloat(msg.payload.priceUsd || "0")
          const v = parseFloat(msg.payload.volume?.usd || "0")
          if (p > 0) pushCandle(p, v)
        }
      }
    }

    const connectBinance = () => {
      const pair = `${symbol.toUpperCase()}USDT`
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pair.toLowerCase()}@kline_1m`)
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.k) {
          const p = parseFloat(data.k.c)
          const v = parseFloat(data.k.q)
          pushCandle(p, v)
        }
      }
    }

    if (source === "Binance") connectBinance()
    else connectDex()

    setIsLoading(false)
    return () => ws?.close()
  }, [symbol, source, pairAddress])

  // === Helpers ===
  const formatPrice = (p: number) => {
    if (!p) return "-"
    if (p < 0.0001) return `$${p.toExponential(2)}`
    if (p < 0.01) return `$${p.toFixed(6)}`
    if (p < 1) return `$${p.toFixed(4)}`
    if (p < 100) return `$${p.toFixed(2)}`
    return `$${p.toLocaleString()}`
  }

  useEffect(() => {
    if (priceData.length > 2) {
      const first = priceData[0].price
      const last = priceData[priceData.length - 1].price
      setPriceChange(((last - first) / first) * 100)
    }
  }, [priceData])

  // === Loading placeholder ===
  if (isLoading || priceData.length < 2) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-pulse">
          <div className="h-8 w-32 bg-gray-700 rounded mb-2 mx-auto"></div>
          <div className="h-4 w-24 bg-gray-700 rounded mx-auto"></div>
        </div>
      </div>
    )
  }

  // === SVG Rendering (same visual) ===
  const chartData = priceData.slice(-80)
  const maxPrice = Math.max(...chartData.map(p => p.high))
  const minPrice = Math.min(...chartData.map(p => p.low))
  const maxVolume = Math.max(...chartData.map(p => p.volume))
  const priceRange = maxPrice - minPrice
  const width = 800, height = 320, padding = 40

  return (
    <div className="w-full h-full p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold text-white">{formatPrice(currentPrice)}</div>
          <div className={`flex items-center text-sm ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
            <span className="text-lg font-bold">{priceChange >= 0 ? "+" : ""}</span>
            {priceChange.toFixed(2)}%
          </div>
        </div>
        <div className="text-sm text-gray-400">
          {symbol} • Live • {source}
        </div>
      </div>

      {/* Chart */}
      <div className="h-60 bg-[#131722] rounded-lg border border-gray-700 mb-4 relative overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 800 320">
          {/* Grid lines */}
          {Array.from({ length: 6 }, (_, i) => {
            const price = minPrice + (priceRange * i / 6)
            const y = padding + (height - 2 * padding) - ((price - minPrice) / priceRange) * (height - 2 * padding)
            return (
              <g key={i}>
                <line x1={padding} y1={y} x2={width - padding} y2={y}
                      stroke="#2A2E39" strokeWidth="1" opacity="0.5" />
                <text x={padding - 10} y={y + 4}
                      fill="#787B86" fontSize="12" textAnchor="end">
                  {formatPrice(price)}
                </text>
              </g>
            )
          })}

          {/* Candles */}
          {chartData.map((c, i) => {
            const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding)
            const openY = padding + (height - 2 * padding) - ((c.open - minPrice) / priceRange) * (height - 2 * padding)
            const closeY = padding + (height - 2 * padding) - ((c.close - minPrice) / priceRange) * (height - 2 * padding)
            const highY = padding + (height - 2 * padding) - ((c.high - minPrice) / priceRange) * (height - 2 * padding)
            const lowY = padding + (height - 2 * padding) - ((c.low - minPrice) / priceRange) * (height - 2 * padding)
            const color = c.close >= c.open ? "#26A69A" : "#EF5350"
            const candleW = Math.max(2, (width - 2 * padding) / chartData.length * 0.8)
            return (
              <g key={i}>
                <line x1={x} y1={highY} x2={x} y2={lowY} stroke={color} strokeWidth="1" />
                <rect x={x - candleW / 2} y={Math.min(openY, closeY)} width={candleW}
                      height={Math.abs(closeY - openY)} fill={color} opacity="0.9" />
              </g>
            )
          })}

          {/* Volume bars */}
          <g transform={`translate(0, ${height - 60})`}>
            {chartData.map((c, i) => {
              const x = padding + (i / (chartData.length - 1)) * (width - 2 * padding)
              const h = (c.volume / maxVolume) * 40
              const color = c.close >= c.open ? "#26A69A" : "#EF5350"
              return <rect key={i} x={x - 1} y={40 - h} width="2" height={h} fill={color} opacity="0.3" />
            })}
          </g>
        </svg>

        <div className="absolute bottom-4 right-4 text-xs text-gray-500">
          Candlestick • Live • {source}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center">
          <div className="text-gray-400">24h High</div>
          <div className="text-white font-semibold">{formatPrice(Math.max(...priceData.map(p => p.price)))}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">24h Low</div>
          <div className="text-white font-semibold">{formatPrice(Math.min(...priceData.map(p => p.price)))}</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Volume</div>
          <div className="text-white font-semibold">
            ${(priceData.reduce((s, p) => s + p.volume, 0) / 1e6).toFixed(1)}M
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-800 text-center">
        <div className="text-xs text-gray-500">
          ⚡ Real-time Candlestick & Volume • {symbol} ({source})
        </div>
      </div>
    </div>
  )
}

// ===================================================
//              MAIN CHART CONTAINER (UI)
// ===================================================
export function TokenPriceChart({ isOpen, onClose, fromToken, toToken }: TokenPriceChartProps) {
  const [timeframe, setTimeframe] = useState<"5m" | "1h" | "4h" | "24h" | "7d" | "30d" | "Max">("24h")
  const [activeToken, setActiveToken] = useState<Token>(fromToken)

  useEffect(() => {
    if (isOpen) setActiveToken(fromToken)
  }, [isOpen, fromToken, toToken])

  const copyAddress = () => navigator.clipboard.writeText(activeToken.address)

  return (
    <div>
      <div className="max-w-6xl h-[700px] bg-black border border-gray-800 p-0 overflow-hidden">
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="text-white font-medium">{activeToken.symbol}</div>
                <div className="text-gray-400">{activeToken.name}</div>
              </div>
              <div className="flex items-center space-x-2 ml-8">
                <Button
                  variant={activeToken === fromToken ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveToken(fromToken)}
                  className={activeToken === fromToken ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}>
                  {fromToken.symbol}
                </Button>
                <span className="text-gray-500">/</span>
                <Button
                  variant={activeToken === toToken ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveToken(toToken)}
                  className={activeToken === toToken ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-white"}>
                  {toToken.symbol}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-400">
                {activeToken.symbol}/{toToken.symbol === activeToken.symbol ? fromToken.symbol : toToken.symbol}
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Token info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-bold text-white">{activeToken.symbol}</div>
                <div className="text-gray-400">{activeToken.name}</div>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <div className="w-4 h-4 bg-yellow-400 rounded-sm flex items-center justify-center">
                  <span className="text-black text-xs font-bold">{activeToken.symbol.charAt(0)}</span>
                </div>
                <span className="text-gray-400">
                  {activeToken.address.slice(0, 8)}...{activeToken.address.slice(-4)}
                </span>
                <Button variant="ghost" size="sm" onClick={copyAddress} className="p-1 h-auto text-gray-400 hover:text-white">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="text-center">
                <div className="text-gray-400">Network</div>
                <div className="text-white font-medium">{activeToken.chainName}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Chart Source</div>
                <div className="text-white font-medium">Live ({activeToken.symbol})</div>
              </div>
            </div>
          </div>

          {/* Timeframe + controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-1">
              {(["5m", "1h", "4h", "24h", "7d", "30d", "Max"] as const).map(tf => (
                <Button key={tf} variant="ghost" size="sm"
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-2 text-xs ${timeframe === tf ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
                  {tf}
                </Button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2"><TrendingUp className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2"><BarChart3 className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-2"><Maximize2 className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 min-h-0">
            <FastChart symbol={activeToken.symbol} timeframe={timeframe} />
          </div>

          {/* Footer info */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800 text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Chart Provider</span><span className="text-white">DexScreener / Binance</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Data Source</span><span className="text-white">Real-time</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400">Token</span><span className="text-white">{activeToken.symbol}</span>
              </div>
            </div>
            <div className="text-gray-400 text-xs">⚡ Live Feed via DexScreener & Binance</div>
          </div>
        </div>
      </div>
    </div>
  )
}
