/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface AMM {
  name: string
  key?: string
  logo?: string
  isActive: boolean
  type?: string
}

export function AutomatedMarketMakers() {
  const [amms, setAmms] = useState<AMM[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchAMMs = async () => {
      try {
        const response = await fetch("/api/supported-amms")
        if (response.ok) {
          const data = await response.json()
          setAmms(data)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch AMMs:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAMMs()
  }, [])

  const dexs = amms.filter(amm => amm.type === "DEX" || amm.type === "DEX Aggregator")
  const bridges = amms.filter(amm => amm.type === "Bridge")
  const totalCount = amms.length

  return (
    <div className="bg-[#121212] border border-[#FCD404] p-6">
      <div className="mb-4">
        <h2 className="text-white text-xl font-semibold mb-2">
          Liquidity Sources
        </h2>
        <p className="text-gray-400 text-sm">
          Splenex aggregates liquidity from <span className="text-yellow-400 font-semibold">{totalCount}+</span> DEXs and bridges across all chains,
          ensuring optimal pricing and deep liquidity for every trade.
        </p>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-400 py-8">
          Loading AMMs...
        </div>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="bg-[#1A1A1A] border border-[#2A2A2A] mb-4">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
            >
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger 
              value="dexs"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
            >
              DEXs ({dexs.length})
            </TabsTrigger>
            <TabsTrigger 
              value="bridges"
              className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
            >
              Bridges ({bridges.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {amms.map((amm, index) => (
                <div
                  key={`${amm.key || amm.name}-${index}`}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    amm.isActive 
                      ? "bg-[#1A1A1A] border-[#2A2A2A] hover:border-yellow-400" 
                      : "bg-[#1A1A1A]/50 border-[#1A1A1A] opacity-60"
                  }`}
                >
                  {amm.logo ? (
                    <img 
                      src={amm.logo} 
                      alt={amm.name}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                      <span className="text-yellow-400 text-xs font-bold">
                        {amm.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-white text-xs font-medium">{amm.name}</div>
                    {amm.type && (
                      <div className="text-gray-500 text-[10px] mt-0.5">{amm.type}</div>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${amm.isActive ? "bg-green-400" : "bg-gray-500"}`} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dexs">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {dexs.map((amm, index) => (
                <div
                  key={`${amm.key || amm.name}-${index}`}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    amm.isActive 
                      ? "bg-[#1A1A1A] border-[#2A2A2A] hover:border-yellow-400" 
                      : "bg-[#1A1A1A]/50 border-[#1A1A1A] opacity-60"
                  }`}
                >
                  {amm.logo ? (
                    <img 
                      src={amm.logo} 
                      alt={amm.name}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                      <span className="text-yellow-400 text-xs font-bold">
                        {amm.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-white text-xs font-medium">{amm.name}</div>
                    {amm.type && (
                      <div className="text-gray-500 text-[10px] mt-0.5">{amm.type}</div>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${amm.isActive ? "bg-green-400" : "bg-gray-500"}`} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="bridges">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {bridges.map((amm, index) => (
                <div
                  key={`${amm.key || amm.name}-${index}`}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${
                    amm.isActive 
                      ? "bg-[#1A1A1A] border-[#2A2A2A] hover:border-yellow-400" 
                      : "bg-[#1A1A1A]/50 border-[#1A1A1A] opacity-60"
                  }`}
                >
                  {amm.logo ? (
                    <img 
                      src={amm.logo} 
                      alt={amm.name}
                      className="w-8 h-8 rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-yellow-400/20 rounded-full flex items-center justify-center">
                      <span className="text-yellow-400 text-xs font-bold">
                        {amm.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-white text-xs font-medium">{amm.name}</div>
                    {amm.type && (
                      <div className="text-gray-500 text-[10px] mt-0.5">{amm.type}</div>
                    )}
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full ${amm.isActive ? "bg-green-400" : "bg-gray-500"}`} />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
