/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Image from "next/image";
import { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSwapVolume } from "@/hooks/useSwapVolume";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSwapCount } from "@/hooks/use-swap-count";
import { getChains, getTools } from "@lifi/sdk";
import { 
  TrendingUp, 
  Network, 
  BarChart3, 
  RefreshCw, 
  DollarSign, 
  Lock 
} from "lucide-react";

interface Amm {
  key: string;
  name: string;
  logoURI?: string;
  logo?: string;
  supportedChains?: number[];
  type?: string;
}

export default function Page() {
  const [chains, setChains] = useState<any[]>([]);
  const [amms, setAmms] = useState<Amm[]>([]);
  const { totalVolume, dailyData, yesterdayVolume, todayVolume, last24HoursVolume, last24HoursCount, isLoading: isVolumeLoading } = useSwapVolume();
  const { 
    totalUsers, 
    networkRevenue, 
    isLoading: isAnalyticsLoading 
  } = useAnalytics();
  
  const { 
    swapCount, 
    isLoading: isSwapCountLoading 
  } = useSwapCount();
  const [activeRange, setActiveRange] = useState("3D");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Combined loading state
  const isLoading = isVolumeLoading || isAnalyticsLoading || isSwapCountLoading;

  // Calculate percentage increase since yesterday (today vs yesterday)
  // If there's today's data but no yesterday's data, show +100% (infinite growth)
  const percentageIncrease = yesterdayVolume > 0 
    ? ((todayVolume - yesterdayVolume) / yesterdayVolume) * 100 
    : todayVolume > 0 
      ? 100 // +100% growth when there's data today but none yesterday
      : 0; // 0% when there's no data at all

  const handleRefresh = async () => {
    setIsRefreshing(true);
      try {
        // Fetch chains from LiFi (includes chains from all integrated aggregators)
        const supportedChains = await getChains();
        console.log(`[Overview] ✅ Loaded ${supportedChains.length} chains from all aggregators`);
        setChains(supportedChains);

        // Fetch all AMMs from custom API (includes LiFi + additional integrations like PancakeSwap)
        const ammsResponse = await fetch('/api/supported-amms');
        if (ammsResponse.ok) {
          const ammsData = await ammsResponse.json();
          console.log(`[Overview] ✅ Loaded ${ammsData.length} AMMs (including PancakeSwap)`);
          setAmms(ammsData);
        } else {
          // Fallback to LiFi tools if custom API fails
          const tools = await getTools();
          setAmms(tools.exchanges);
        }
      } catch (error) {
        console.error("Failed to fetch network/AMM data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  // ✅ Filter data based on active time range
  const filteredData = useMemo(() => {
    if (activeRange === "All Time") return dailyData;
    if (!dailyData || dailyData.length === 0) return [];

    const days = {
      "1D": 1,
      "3D": 3,
      "1W": 7,
      "1M": 30,
      "3M": 90,
    }[activeRange] as number | undefined;

    if (!days) return dailyData;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return dailyData.filter((d) => new Date(d.day) >= cutoff);
  }, [dailyData, activeRange]);

   const [rotation, setRotation] = useState(0)

  // Rotate according to volume
  useEffect(() => {
    if (totalVolume > 0) {
      const interval = setInterval(() => {
        setRotation((prev) => (prev + Math.min(totalVolume / 1000000, 3)) % 360)
      }, 30)
      return () => clearInterval(interval)
    }
  }, [totalVolume])

  return (
    <div className="min-h-screen bg-black text-white px-8">
      {/* Header */}
      <div className="">
        <div className=" mx-auto px-6 py-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Trade Everything, Anytime
      </h1>
              <p className="text-gray-300 text-sm">
                In the last 24 hours, Splenex recorded <span className="font-bold text-[#FCD404]">{isVolumeLoading ? "..." : last24HoursCount.toLocaleString()}</span> swaps 
                with <span className="font-bold text-[#FCD404]">${last24HoursVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> in trading volume
                {!isNaN(percentageIncrease) && yesterdayVolume > 0 && (
                  <span className="ml-1">
                    {" "}(<span className={`font-bold ${percentageIncrease >= 0 ? "text-[#20E070]" : "text-red-500"}`}>
                      {percentageIncrease >= 0 ? "+" : ""}{percentageIncrease.toFixed(1)}%
                    </span>{" "}vs yesterday)
                  </span>
                )}
                {!isNaN(percentageIncrease) && yesterdayVolume === 0 && todayVolume > 0 && (
                  <span className="ml-1">
                    {" "}(<span className="font-bold text-[#20E070]">
                      +100.0%
                    </span>{" "}vs yesterday - new data today)
                  </span>
                )}
              </p>
        </div>
            
            
        </div>
        </div>
      </div>

      {/* Main Content */}
      <div className=" mx-auto px-6 py-8 space-y-8">
        
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-1">
          {/* SPX Token Price Card - Highlighted */}
          <div className="flex flex-col  justify-center p-4  min-h-[120px] bg-gradient-to-br from-[#FFD600] to-[#F3DA5F] text-black">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
             <Image 
                    src="/images/pricelogo.svg" 
                    alt="SPX Logo" 
                    width={20} 
                    height={20} 
                    className="w-6 h-6"
                    />
                </div>

            <div className="text-2xl font-bold mb-1 text-black">
              $----
            </div>
            <div className="text-xs font-medium text-left whitespace-nowrap text-black/80">
              SPX Token Price
            </div>
          </div>
          
          {/* Active Networks */}
          <div className="flex flex-col items-start justify-center p-4 min-h-[120px] bg-[#121212] border border-[#1E1E1E] text-white">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
              {/* <Network className="w-8 h-8" /> */}
              <Image 
                src="/images/blockchain-04.svg"
                alt="Network Logo"
                width={20}
                height={20}
                className="w-8 h-8"
              />
            </div>
            <div className="text-2xl font-bold mb-1 text-white">
              {chains.length}+
            </div>
            <div className="text-xs font-medium text-center text-gray-400">
              Active Networks
            </div>
          </div>
          
          {/* Total Trading Volume */}
          <div className="flex flex-col items-start justify-center p-4  min-h-[120px] bg-[#121212] border border-[#1E1E1E] text-white">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
              {/* <TrendingUp className="w-8 h-8" /> */}
              <Image 
                src="/images/trading-volume.svg"
                alt="Trending Up Logo"
                width={20}
                height={20}
                className="w-8 h-8"
                />
            </div>
            <div className="text-2xl font-bold mb-1 text-white">
              ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-medium text-left text-gray-400">
              Total Trading Volume
            </div>
          </div>
          
          {/* Total Transaction Count */}
          <div className="flex flex-col items-start justify-center p-4  min-h-[120px] bg-[#121212] border border-[#1E1E1E] text-white">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
              {/* <RefreshCw className="w-8 h-8" /> */}
              <Image 
                src="/images/transaction-count.svg"
                alt="Transaction Count Logo"
                width={20}
                height={20}
                className="w-8 h-8"
                />
            </div>
            <div className="text-2xl font-bold mb-1 text-white">
              {isSwapCountLoading ? "..." : swapCount.toLocaleString()}
            </div>
            <div className="text-xs font-medium text-left whitespace-nowrap text-gray-400">
              Total Transaction Count
            </div>
          </div>
          
          {/* Total Network Revenue */}
          <div className="flex flex-col items-start justify-center p-4 min-h-[120px] bg-[#121212] border border-[#1E1E1E] text-white">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
              {/* <DollarSign className="w-8 h-8" /> */}
              <Image 
              src="/images/network-revenue.svg" 
              alt="Network Revenue Logo" 
              width={20} 
              height={20} 
              className="w-8 h-8"
              />
            </div>
            <div className="text-2xl font-bold mb-1 text-white">
              ${isAnalyticsLoading ? "..." : networkRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs font-medium text-left whitespace-nowrap text-gray-400">
              Total Network Revenue
            </div>
          </div>
          
          {/* Total Value Locked */}
          <div className="flex flex-col items-start justify-center p-4 min-h-[120px] bg-[#121212] border border-[#1E1E1E] text-white">
            <div className="flex items-center justify-start w-12 h-12 mb-3">
              {/* <Lock className="w-8 h-8" /> */}
              <Image 
              src="/images/total-value-locked.svg"
              alt="Locked Tokens Logo" 
              width={20} 
              height={20} 
              className="w-8 h-8"
              />
            </div>
            <div className="text-2xl font-bold mb-1 text-white">
              $----
            </div>
            <div className="text-xs font-medium text-left text-gray-400">
              Total Value Locked
            </div>
        </div>
      </div>


      {/* Supported Chains */}
      <div className="p-2">
          <h3 className="text-white text-lg font-semibold mb-4">Supported Chains</h3>
          
          <div className="relative w-full overflow-hidden mb-4">
            <div className="flex gap-4 animate-scroll whitespace-nowrap">
              {chains.length > 0 ? (
                [...chains, ...chains].map((chain, i) => (
                  <div
                    key={`${chain.id}-${i}`}
                    className="bg-[#1A1A1A] px-4 py-2 flex items-center justify-center min-w-[140px] border border-[#2A2A2A] hover:border-[#FFD600] transition-colors cursor-pointer"
                  >
                    {chain.logoURI && (
                      <Image
                        src={chain.logoURI}
                        alt={chain.name}
                        width={20}
                        height={20}
                        className="mr-2"
                      />
                    )}
                    <span className="text-sm capitalize text-white">{chain.name}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Loading networks...</p>
              )}
            </div>
          </div>

          <div className="text-gray-400 text-sm">
            {chains.length}+ blockchain networks supported
          </div>
        </div>


      {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Revenue Chart */}
          <div className="bg-[#121212] border border-[#1E1E1E] p-6 px-2 flex gap-6 items-center justify-center">
            <div
              className="relative md:w-60 md:h-60 w-40 h-40 rounded-full border-[30px] transition-all duration-500"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: "transform 0.3s linear",
                borderColor: totalVolume > 0 ? "#FED402" : "#1A1A1C",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-white">
                ${isAnalyticsLoading ? "..." : networkRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-6 text-left">
              <h3 className="text-[#FCD404] md:text-base text-sm font-semibold mb-3">Splenex Revenue</h3>
              <ul className="space-y-2 md:text-sm text-xs text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FED402]"></span>
                  <span>Cross-Chain Swap</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#AE7F40]"></span>
                  <span>Cross-Market Swap</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#32CD32]"></span>
                  <span>sFund DAO Stakers</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1 h-4 bg-[#FF6347]"></span>
                  <span>sNFT</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Trading Volume Chart */}
          <div className="bg-[#121212] border border-[#1E1E1E] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-semibold">Trading Volume</h3>
              
              {/* Timeframe buttons */}
              <div className="flex gap-2">
                {["1D", "3D", "1W", "1M", "3M", "All Time"].map((timeframe) => (
                  <button
                    key={timeframe}
                    onClick={() => setActiveRange(timeframe)}
                    className={`
                      px-3 py-1 rounded text-sm font-medium transition-colors
                      ${activeRange === timeframe
                        ? 'bg-[#FFD600] text-black'
                        : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                      }
                    `}
                  >
                    {timeframe}
                  </button>
                ))}
              </div>
</div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FFD600]" />
                <span className="text-white text-sm">Cross-Chain Swap</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="text-white text-sm">Cross-Market Swap</span>
              </div>
    </div>

            {/* Chart */}
            <div className="bg-[#0D0D0D] p-4">
              <div className="w-full h-[300px]">
            {filteredData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData}>
                  <XAxis dataKey="day" stroke="#888" />
                  <YAxis stroke="#888" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                        stroke="#FFD600"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
                  <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500 text-sm">
                No volume data available
              </span>
                  </div>
            )}
              </div>
            </div>
          </div>
        </div>

        
        {/* AMM Platforms */}
        <div className="p-6">
          <h3 className="text-white text-lg font-semibold mb-2">
            Automated Market Makers
          </h3>
          
          <p className="text-gray-400 text-sm mb-6">
            Splenex AMMs ensure optimal pricing and deep liquidity across chains — 
            so every trade is fast, fair, and efficient.
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {amms.length > 0 ? (
              amms.slice(0, 16).map((amm: Amm) => (
                <div
                  key={amm.key || amm.name}
                  className="flex items-center gap-1 p-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFD600] transition-all duration-200 cursor-pointer group"
                >
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {(amm.logoURI || amm.logo) ? (
                      <Image
                        src={amm.logoURI || amm.logo || ''}
                        alt={amm.name}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : null}
                  </div>
                  <span className="text-white text-[10px] font-medium text-center leading-tight">
                    {amm.name}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">Loading AMMs...</p>
            )}
          </div>

          <div className="mt-4 text-gray-400 text-sm">
            {amms.length}+ AMM protocols integrated
          </div>
        </div>
      </div>

      {/* Floating Chat Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-[#FFD600]flex items-center justify-center shadow-lg hover:bg-[#F3DA5F] transition-colors z-50">
        <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
        </svg>
      </button>

      {/* Infinite Scroll Animation */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          display: inline-flex;
          animation: scroll 60s linear infinite;
        }
      `}</style>
    </div>
  );
}
