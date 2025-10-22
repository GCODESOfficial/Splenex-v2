/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface MetricsData {
  spxTokenPrice: number
  activeNetworks: number
  tradingVolume24h: number
  totalValueLocked: number
  transactionCount24h: number
}

export function OverviewMetrics() {
  const [metrics, setMetrics] = useState<MetricsData>({
    spxTokenPrice: 0,
    activeNetworks: 0,
    tradingVolume24h: 0,
    totalValueLocked: 0,
    transactionCount24h: 0,
  })

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/overview-metrics")
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch metrics:", error)
      }
    }

    fetchMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: value < 1 ? 4 : 0,
      maximumFractionDigits: value < 1 ? 4 : 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return value.toString()
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics.spxTokenPrice)}</div>
          <div className="text-yellow-400 text-sm">SPX Token Price</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-1">{metrics.activeNetworks}+</div>
          <div className="text-yellow-400 text-sm">Active Networks</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics.tradingVolume24h)}</div>
          <div className="text-yellow-400 text-sm">Trading Volume (24h)</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-1">{formatNumber(metrics.transactionCount24h)}</div>
          <div className="text-yellow-400 text-sm">Transactions (24h)</div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-6 text-center">
          <div className="text-2xl font-bold text-white mb-1">{formatCurrency(metrics.totalValueLocked)}</div>
          <div className="text-yellow-400 text-sm">Total Value Locked (TVL)</div>
        </CardContent>
      </Card>
    </div>
  )
}
