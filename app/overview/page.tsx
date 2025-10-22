"use client"
import { OverviewMetrics } from "@/components/overview-metrics"
import { SupportedChains } from "@/components/supported-chains"
import { RevenueChart } from "@/components/revenue-chart"
import { AnalysisChart } from "@/components/analysis-chart"
import { AutomatedMarketMakers } from "@/components/automated-market-makers"
import { SimpleNavbar } from "@/components/simple-navbar"

export default function OverviewPage() {
  return (
    <div className="min-h-screen bg-black">
      <SimpleNavbar />
      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center py-8">
            <h1 className="text-white text-2xl font-medium mb-2">
              Join thousands of traders powering the future of cross-chain liquidity
            </h1>
          </div>

          {/* Top Metrics */}
          <OverviewMetrics />

          {/* Supported Chains */}
          <SupportedChains />

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Donut Chart */}
            <RevenueChart />

            {/* Analysis Line Chart */}
            <AnalysisChart />
          </div>

          {/* Automated Market Makers */}
          <AutomatedMarketMakers />
        </div>
      </main>
    </div>
  )
}
