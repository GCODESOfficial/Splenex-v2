/* eslint-disable @typescript-eslint/no-explicit-any */
/* app/comingsoon.tsx */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react"
import { getChains } from "@lifi/sdk"

export default function ComingSoon() {
  const [chains, setChains] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChains() {
      try {
        // Fetch all supported chains from LiFi (includes chains from all aggregators)
        const supportedChains = await getChains()
        console.log(`[ComingSoon] ✅ Loaded ${supportedChains.length} chains`)
        setChains(supportedChains)
      } catch (error) {
        console.error("Failed to fetch chains:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchChains()
  }, [])


  return (
    <section className="flex items-center justify-center min-h-screen mt-4 md:mt-14">
      {/* Card */}
      <div className="relative bg-[#1c1e1d] text-white w-11/12 md:w-[400px] border border-[#FFD600]">
        {/* Top yellow bar */}
        <div className="absolute -top-4 left-0 right-0 h-4 bg-[#FFD600]" />

        {/* Main content */}
        <div className="flex flex-col items-center justify-center py-26 px-6 text-center space-y-4">
          {/* Hourglass Icon */}
          <div className="mb-6">
            <video autoPlay loop muted className="w-50 h-50">
              <source src="/ComingSoonAnimation.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold">Coming Soon</h2>

          {/* Subtitle */}
          <p className=" text-[#B1B1B1]">
            Non-custodial strategies with <br /> transparent metrics.
          </p>
        </div>

        {/* Divider */}
        <div className="border h-6 bg-black border-[#FFD600]" />

        {/* Bottom section */}
        <div className="flex items-center justify-between text-xs md:text-sm px-4 py-3 bg-[#191919]">
          {/* Price */}
          <div className="flex items-center gap-1 font-medium text-white text-xl">
            <Image
              src="/images/token-icon.svg" // <-- replace with your actual image path
              alt="Token Icon"
              width={20}
              height={20}
              className="w-6 h-6 rounded-full"
            />
            $---,---
          </div>

          {/* MarketCap */}
          <div className="text-[#8F8F8F]">
            MarketCap <br />
            <span className="text-[#FFD262] font-semibold">---,---</span>
          </div>

          {/* Holders */}
          <div className="text-[#8F8F8F]">
            Holders <br />
            <span className="text-white font-semibold">---,---</span>
          </div>

          {/* Networks */}
          <div className="text-[#8F8F8F]">
            Networks <br />
            <span className="text-white font-semibold">{!loading ? `${chains.length}+` : "--"}</span>
          </div>
        </div>

        {/* Bottom yellow bar */}
        <div className="absolute -bottom-4 left-0 right-0 h-4 bg-[#FFD600]" />
      </div>
    </section>
  );
}
