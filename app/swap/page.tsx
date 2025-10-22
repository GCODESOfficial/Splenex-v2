/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState } from "react"
import { SimpleSwapInterface } from "@/components/simple-swap-interface"
import { ForexTradingInterface } from "@/components/forex-trading-interface"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, TrendingUp } from "lucide-react"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"swap" | "forex">("swap")

  return (
    <div className="md:min-h-screen bg-black">

      <SimpleSwapInterface />

      
      {/* <SimpleNavbar /> */}
      {/* <main className="pt-20">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-center mb-6">
            <div className="flex bg-gray-900 border border-gray-700 rounded-lg p-1">
              <Button
                variant={activeTab === "swap" ? "default" : "ghost"}
                className={`flex items-center gap-2 ${
                  activeTab === "swap"
                    ? "bg-[#FFD600] text-black hover:bg-[#FFD600]/90"
                    : "text-gray-300 hover:text-white"
                }`}
                onClick={() => setActiveTab("swap")}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Swap
              </Button>
              <Button
                variant={activeTab === "forex" ? "default" : "ghost"}
                className={`flex items-center gap-2 ${
                  activeTab === "forex"
                    ? "bg-[#FFD600] text-black hover:bg-[#FFD600]/90"
                    : "text-gray-300 hover:text-white"
                }`}
                onClick={() => setActiveTab("forex")}
              >
                <TrendingUp className="h-4 w-4" />
                Forex Trading
              </Button>
            </div>
          </div>

          {activeTab === "swap" ? <SimpleSwapInterface /> : <ForexTradingInterface />}
        </div>
      </main> */}
    </div>
  )
}
