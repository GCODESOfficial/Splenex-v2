"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface RevenueData {
  name: string
  value: number
  color: string
  [key: string]: string | number
}

export function RevenueChart() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const response = await fetch("/api/revenue-data")
        if (response.ok) {
          const data = await response.json()
          setRevenueData(data.breakdown)
          setTotalRevenue(data.total)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch revenue data:", error)
      }
    }

    fetchRevenueData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchRevenueData, 60000)
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Splenex Revenue</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                dataKey="value"
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelStyle={{ color: "#fff" }}
                contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2">
          {revenueData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-yellow-400 text-sm">{item.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
