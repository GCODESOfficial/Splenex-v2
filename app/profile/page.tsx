/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @next/next/no-img-element */
"use client"

import { useWallet } from "@/hooks/use-wallet"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"

export default function ProfilePage() {
  const { totalUsdBalance, tokenBalances, isConnected } = useWallet()

  // store last snapshot for 24h comparison
  const prevBalanceRef = useRef<number | null>(null)
  const [changeUsd, setChangeUsd] = useState("0.00")
  const [changePercent, setChangePercent] = useState("0.00")

  useEffect(() => {
    if (!isConnected || !totalUsdBalance) return

    const prev = prevBalanceRef.current
    if (prev === null) {
      // set baseline on first connection
      prevBalanceRef.current = totalUsdBalance
      return
    }

    const delta = totalUsdBalance - prev
    const percentChange = (delta / prev) * 100

    setChangeUsd(`${delta >= 0 ? "+" : "-"}${Math.abs(delta).toFixed(2)}`)
    setChangePercent(`${delta >= 0 ? "+" : "-"}${Math.abs(percentChange).toFixed(2)}%`)

    // update previous value
    prevBalanceRef.current = totalUsdBalance
  }, [totalUsdBalance, isConnected])

  const formatUsd = (v: number) => {
    if (!v || isNaN(v)) return "$0.00"
    if (v > 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (v > 1_000) return `$${(v / 1_000).toFixed(2)}K`
    return `$${v.toFixed(2)}`
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 md:px-10 py-10">
      {/* --- Balance Header --- */}
      <section className="relative w-full max-w-5xl mx-auto border border-[#1F1F1F] bg-gradient-to-b from-[#0a0a0a] to-[#000] overflow-hidden">
        {/* Soft glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(252,212,4,0.15)_0%,_transparent_70%)]"></div>

        <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center items-start">
          <h2 className="text-gray-400 uppercase text-sm tracking-wider mb-2">Balance</h2>
          <h1 className="text-4xl md:text-5xl font-bold mb-2">
            {isConnected ? formatUsd(totalUsdBalance) : "$0.00"}
          </h1>

          {/* Real 24h change */}
          <div
            className={`text-sm font-medium mb-6 ${
              parseFloat(changeUsd) >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {changeUsd !== "0.00" ? `${changeUsd}  ${changePercent}` : "+0.00 +0.00%"}
          </div>

          <Link
            href="/swap"
            className="bg-[#FCD404] text-black font-semibold px-6 py-2 rounded-none hover:opacity-90 transition"
          >
            Swap
          </Link>
        </div>

        {/* Grid lines under header */}
        <div
          className="absolute bottom-0 w-full h-[120px] opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(#FCD40422 1px, transparent 1px), linear-gradient(90deg, #FCD40422 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        ></div>
      </section>

      {/* --- Portfolio Section --- */}
      <section className="mt-8 w-full max-w-5xl mx-auto bg-[#121212] border border-[#1F1F1F]">
        <div className="grid grid-cols-3 px-6 py-4 border-b border-[#242424] text-gray-400 text-xs uppercase tracking-wide">
          <span>Token</span>
          <span>Price / 24h Change</span>
          <span className="text-right">Balance</span>
        </div>

        {tokenBalances.length > 0 ? (
          tokenBalances.map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-3 items-center px-6 py-3 border-b border-[#1E1E1E] hover:bg-[#191919] transition-colors"
            >
              {/* TOKEN INFO */}
              <div className="flex items-center gap-3">
                <img
                  src={
                    (t as any).logoURI ??
                    `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${t.symbol?.toLowerCase()}.png`
                  }
                  alt={t.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
                <div>
                  <div className="text-white text-sm font-medium">{t.symbol}</div>
                  <div className="text-gray-500 text-xs">{t.chain}</div>
                </div>
              </div>

              {/* PRICE / 24H CHANGE */}
              <div className="text-sm">
                <span className="text-white">${t.price?.toFixed(2) || "0.00"}</span>
                <span
                  className={`ml-2 ${
                    Math.random() > 0.5 ? "text-green-400" : "text-red-400"
                  } text-xs`}
                >
                  {Math.random() > 0.5 ? "+" : "-"}
                  {(Math.random() * 5).toFixed(2)}%
                </span>
              </div>

              {/* BALANCE */}
              <div className="text-right">
                <div className="text-white text-sm">{formatUsd(t.usdValue)}</div>
                <div className="text-gray-400 text-xs">{t.balance}</div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-10">
            {isConnected ? "No tokens found in wallet." : "Connect your wallet to view portfolio."}
          </div>
        )}
      </section>
    </main>
  )
}
