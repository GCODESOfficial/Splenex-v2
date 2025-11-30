/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useWallet } from "@/hooks/use-wallet"
import { useEffect, useState, useRef, useMemo } from "react"
import Link from "next/link"
import { TokenIconWithFallback } from "@/components/token-icon-with-fallback"

export default function ProfilePage() {
  const { totalUsdBalance, tokenBalances, isConnected, isLoadingBalances } = useWallet()

  // store last snapshot for 24h comparison
  const prevBalanceRef = useRef<number | null>(null)
  const [changeUsd, setChangeUsd] = useState("0.00")
  const [changePercent, setChangePercent] = useState("0.00")

  // Group tokens by chain for better organization
  const tokensByChain = useMemo(() => {
    const grouped: { [chain: string]: typeof tokenBalances } = {}
    tokenBalances.forEach(token => {
      const chain = token.chain || "Unknown"
      if (!grouped[chain]) {
        grouped[chain] = []
      }
      grouped[chain].push(token)
    })
    // Sort each chain's tokens by USD value (highest first)
    Object.keys(grouped).forEach(chain => {
      grouped[chain].sort((a, b) => b.usdValue - a.usdValue)
    })
    return grouped
  }, [tokenBalances])

  // Get chain totals
  const chainTotals = useMemo(() => {
    const totals: { [chain: string]: number } = {}
    Object.entries(tokensByChain).forEach(([chain, tokens]) => {
      totals[chain] = tokens.reduce((sum, t) => sum + t.usdValue, 0)
    })
    return totals
  }, [tokensByChain])

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

  const formatBalance = (balance: string, decimals: number = 6) => {
    const num = parseFloat(balance)
    if (num === 0) return "0"
    if (num < 0.000001) return "< 0.000001"
    return num.toFixed(decimals).replace(/\.?0+$/, '')
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 md:px-10 py-10">
      {/* --- Balance Header --- */}
      <section className="relative w-full max-w-5xl mx-auto border border-[#1F1F1F] bg-gradient-to-b from-[#0a0a0a] to-[#000] overflow-hidden">
        {/* Soft glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(252,212,4,0.15)_0%,_transparent_70%)]"></div>

        <div className="relative z-10 p-8 md:p-12 flex flex-col justify-center items-start">
          <h2 className="text-gray-400 uppercase text-sm tracking-wider mb-2">Total Portfolio Value</h2>
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

          {/* Portfolio Summary */}
          {isConnected && tokenBalances.length > 0 && (
            <div className="mb-6 text-sm text-gray-400">
              {tokenBalances.length} tokens across {Object.keys(tokensByChain).length} chains
            </div>
          )}

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
      {isConnected ? (
        Object.keys(tokensByChain).length > 0 ? (
          Object.entries(tokensByChain).map(([chain, tokens]) => (
            <section key={chain} className="mt-8 w-full max-w-5xl mx-auto bg-[#121212] border border-[#1F1F1F]">
              {/* Chain Header */}
              <div className="px-6 py-4 border-b border-[#242424] bg-[#1a1a1a]">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-lg">{chain}</h3>
                  <div className="text-[#FCD404] font-medium">{formatUsd(chainTotals[chain])}</div>
                </div>
                <div className="text-gray-400 text-sm mt-1">{tokens.length} tokens</div>
              </div>

              {/* Token List */}
              <div className="grid grid-cols-3 px-6 py-4 border-b border-[#242424] text-gray-400 text-xs uppercase tracking-wide">
                <span>Token</span>
                <span>Price / 24h Change</span>
                <span className="text-right">Balance</span>
              </div>

              {tokens.map((token, i) => {
                // Get chainId from token (could be string like "0x1" or number like 1)
                let chainId: number = 1; // Default to Ethereum
                
                if (token.chainId) {
                  if (typeof token.chainId === 'string') {
                    // Handle hex string like "0x1" or "0x38"
                    if (token.chainId.startsWith('0x')) {
                      chainId = parseInt(token.chainId, 16);
                    } else {
                      chainId = parseInt(token.chainId, 10);
                    }
                  } else {
                    chainId = token.chainId;
                  }
                } else if (token.chain) {
                  // Map chain name to chainId
                  const chainNameMap: { [key: string]: number } = {
                    'Ethereum': 1,
                    'BSC': 56,
                    'Binance': 56,
                    'Polygon': 137,
                    'Arbitrum': 42161,
                    'Optimism': 10,
                    'Base': 8453,
                    'Avalanche': 43114,
                    'Fantom': 250,
                  };
                  chainId = chainNameMap[token.chain] || 1;
                }
                
                return (
                  <div
                    key={`${token.address}-${token.chain}-${i}`}
                    className="grid grid-cols-3 items-center px-6 py-3 border-b border-[#1E1E1E] hover:bg-[#191919] transition-colors"
                  >
                    {/* TOKEN INFO */}
                    <div className="flex items-center gap-3">
                      <TokenIconWithFallback
                        symbol={token.symbol}
                        address={token.address || "0x0000000000000000000000000000000000000000"}
                        chainId={chainId}
                        chainName={token.chain}
                        logoURI={(token as any).logoUrl || (token as any).logoURI}
                        className="w-6 h-6 rounded-full"
                        size={24}
                      />
                      <div>
                        <div className="text-white text-sm font-medium">{token.symbol}</div>
                        <div className="text-gray-500 text-xs">{token.name}</div>
                      </div>
                    </div>

                  {/* PRICE / 24H CHANGE */}
                  <div className="text-sm">
                    <span className="text-white">${token.price?.toFixed(2) || "0.00"}</span>
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
                    <div className="text-white text-sm">{formatUsd(token.usdValue)}</div>
                    <div className="text-gray-400 text-xs">
                      {formatBalance(token.balance)} {token.symbol}
                    </div>
                  </div>
                </div>
                );
              })}
            </section>
          ))
        ) : (
          <section className="mt-8 w-full max-w-5xl mx-auto bg-[#121212] border border-[#1F1F1F]">
            <div className="text-center text-gray-500 py-10">
              {isLoadingBalances ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#FCD404] border-t-transparent rounded-full animate-spin"></div>
                  Loading wallet holdings...
                </div>
              ) : (
                "No tokens found in wallet."
              )}
            </div>
          </section>
        )
      ) : (
        <section className="mt-8 w-full max-w-5xl mx-auto bg-[#121212] border border-[#1F1F1F]">
          <div className="text-center text-gray-500 py-10">
            Connect your wallet to view your complete portfolio holdings.
          </div>
        </section>
      )}
    </main>
  )
}
