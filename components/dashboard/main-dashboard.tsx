"use client"

import { useState, useEffect } from "react"
import { MetricsCard } from "./metrics-card"
import { SupportedChains } from "./supported-chains"
import { RevenueChart } from "./revenue-chart"
import { TradingVolumeChart } from "./trading-volume-chart"
import { AMMPlatforms } from "./amm-platforms"
import { 
  TrendingUp, 
  Network, 
  BarChart3, 
  RefreshCw, 
  DollarSign, 
  Lock 
} from "lucide-react"

// Mock data - replace with real API calls
const mockMetrics = {
  spxTokenPrice: "$0.0571",
  activeNetworks: "40+",
  totalTradingVolume: "$1,482,210",
  totalTransactionCount: "1,200",
  totalNetworkRevenue: "$35,000",
  totalValueLocked: "$----"
}

const mockRevenueData = [
  { category: "Cross-Chain Swap", value: 25000, color: "#FFD600" },
  { category: "Cross-Market Swap", value: 7000, color: "#D4AF37" },
  { category: "sFund DAO Stakers", value: 2000, color: "#B8860B" },
  { category: "sNFT", value: 1000, color: "#CD853F" }
]

const mockVolumeData = [
  { time: "00h", crossChain: 100000, crossMarket: 50000 },
  { time: "06h", crossChain: 150000, crossMarket: 75000 },
  { time: "12h", crossChain: 200000, crossMarket: 100000 },
  { time: "18h", crossChain: 180000, crossMarket: 90000 },
  { time: "24h", crossChain: 250000, crossMarket: 125000 },
  { time: "30h", crossChain: 220000, crossMarket: 110000 },
  { time: "36h", crossChain: 280000, crossMarket: 140000 },
  { time: "42h", crossChain: 300000, crossMarket: 150000 },
  { time: "48h", crossChain: 320000, crossMarket: 160000 },
  { time: "54h", crossChain: 350000, crossMarket: 175000 },
  { time: "60h", crossChain: 380000, crossMarket: 190000 },
  { time: "66h", crossChain: 400000, crossMarket: 200000 }
]

export function MainDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("3D")
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1E1E1E] bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                Trade Everything, Anytime
              </h1>
              <p className="text-gray-300 text-lg">
                In the last 24 hours, Splenex recorded <span className="font-bold text-white">12.4M</span> swaps 
                with <span className="font-bold text-white">$8.9B</span> in trading volume 
                up <span className="font-bold text-[#FFD600]">+1.8%</span> since yesterday.
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-[#FFD600] text-black rounded-lg font-medium hover:bg-[#F3DA5F] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <MetricsCard
            icon={
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                <span className="text-[#FFD600] font-bold text-lg">S</span>
              </div>
            }
            value={mockMetrics.spxTokenPrice}
            label="SPX Token Price"
            isHighlighted={true}
          />
          
          <MetricsCard
            icon={<Network className="w-8 h-8" />}
            value={mockMetrics.activeNetworks}
            label="Active Networks"
          />
          
          <MetricsCard
            icon={<TrendingUp className="w-8 h-8" />}
            value={mockMetrics.totalTradingVolume}
            label="Total Trading Volume"
          />
          
          <MetricsCard
            icon={<RefreshCw className="w-8 h-8" />}
            value={mockMetrics.totalTransactionCount}
            label="Total Transaction Count"
          />
          
          <MetricsCard
            icon={<DollarSign className="w-8 h-8" />}
            value={mockMetrics.totalNetworkRevenue}
            label="Total Network Revenue"
          />
          
          <MetricsCard
            icon={<Lock className="w-8 h-8" />}
            value={mockMetrics.totalValueLocked}
            label="Total Value Locked"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="bg-[#121212] border border-[#1E1E1E] rounded-lg p-6">
            <h3 className="text-white text-lg font-semibold mb-6">Splenex Revenue</h3>
            <RevenueChart 
              data={mockRevenueData} 
              totalValue={mockRevenueData.reduce((sum, item) => sum + item.value, 0)}
            />
          </div>

          {/* Trading Volume Chart */}
          <div className="bg-[#121212] border border-[#1E1E1E] rounded-lg p-6">
            <TradingVolumeChart
              data={mockVolumeData}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
            />
          </div>
        </div>

        {/* Supported Chains */}
        <div className="bg-[#121212] border border-[#1E1E1E] rounded-lg p-6">
          <SupportedChains />
        </div>

        {/* AMM Platforms */}
        <div className="bg-[#121212] border border-[#1E1E1E] rounded-lg p-6">
          <AMMPlatforms />
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#FFD600] rounded-lg flex items-center justify-center shadow-lg hover:bg-[#F3DA5F] transition-colors z-50">
        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </button>
    </div>
  )
}
