"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface AnalysisDataPoint {
  time: string
  crossChainSwap: number
  crossMarketSwap: number
}

export function AnalysisChart() {
  const [analysisData, setAnalysisData] = useState<AnalysisDataPoint[]>([])

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch("/api/analysis-data")
        if (response.ok) {
          const data = await response.json()
          setAnalysisData(data)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch analysis data:", error)
      }
    }

    fetchAnalysisData()
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchAnalysisData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analysisData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" fontSize={12} />
            <YAxis stroke="#9CA3AF" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "6px",
              }}
              labelStyle={{ color: "#fff" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="crossChainSwap"
              stroke="#FFD600"
              strokeWidth={2}
              name="Cross-Chain Swap"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="crossMarketSwap"
              stroke="#10B981"
              strokeWidth={2}
              name="Cross-Market Swap"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
