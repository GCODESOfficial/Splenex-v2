"use client"

import { useState, useEffect, useMemo } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { TrendingUp, RefreshCw, X, Loader2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function BalanceDisplay() {
  const { totalUsdBalance, tokenBalances, refreshBalances, isConnected, isLoadingBalances } = useWallet()
  const [showTooltip, setShowTooltip] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

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
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const formatUsd = (v: number) => {
    if (!v || isNaN(v)) return "$0.00"
    if (v > 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
    if (v > 1_000) return `$${(v / 1_000).toFixed(2)}K`
    return `$${v.toFixed(2)}`
  }

  const handleClick = () => {
    if (isMobile) {
      setIsPortfolioModalOpen(true)
    } else {
      router.push("/profile")
    }
  }

  return (
    <div className="relative">
      <div
        className="flex items-center gap-1 md:gap-2 md:px-3 md:py-3 md:bg-[#121212] cursor-pointer select-none"
        onMouseEnter={() => !isMobile && setShowTooltip(true)}
        onMouseLeave={() => !isMobile && setShowTooltip(false)}
        onClick={handleClick}
      >
        <Image src="/images/purse.svg" alt="wallet" width={18} height={18} />
        <div className="flex flex-col">
          <span className="text-white font-semibold text-sm">
            {isConnected ? formatUsd(totalUsdBalance) : "$0.00"}
          </span>
        </div>

        <button
          onClick={async (e) => {
            e.stopPropagation()
            setIsRefreshing(true)
            await refreshBalances()
            setIsRefreshing(false)
          }}
          disabled={isRefreshing || isLoadingBalances}
          className="md:ml-3 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          title="Refresh balances"
        >
          {isRefreshing || isLoadingBalances ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* --- Hover tooltip (Desktop only) --- */}
      {showTooltip && isConnected && !isMobile && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-[#121212] border border-[#1E1E1E] shadow-xl z-50 p-4 max-h-[80vh] overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 mb-3 border-b border-gray-700 pb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-white font-semibold">Multi-Chain Portfolio</span>
            <span className="ml-auto text-xs text-gray-400">{Object.keys(tokensByChain).length} chains</span>
          </div>

          <div className="overflow-y-auto space-y-3 flex-1">
            {Object.entries(tokensByChain).sort((a, b) => (chainTotals[b[0]] || 0) - (chainTotals[a[0]] || 0)).map(([chain, tokens]) => (
              <div key={chain} className="border-b border-gray-800 pb-2 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-yellow-400">{chain}</span>
                  <span className="text-xs text-gray-400">{formatUsd(chainTotals[chain] || 0)}</span>
                </div>
                <div className="space-y-1.5 pl-2">
                  {tokens.map((t, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <span className="text-white text-sm font-medium">{t.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xs">{parseFloat(t.balance).toFixed(6)}</div>
                        <div className="text-gray-400 text-xs">${t.usdValue?.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 border-t border-gray-700 pt-2 flex justify-between text-sm">
            <span className="text-gray-400">Total Balance</span>
            <span className="text-green-400 font-semibold">{formatUsd(totalUsdBalance)}</span>
          </div>
        </div>
      )}

      {/* --- Modal (Mobile only) --- */}
      <Dialog open={isPortfolioModalOpen} onOpenChange={setIsPortfolioModalOpen}>
        <DialogContent className="bg-[#121212] border border-[#FCD404] text-white rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-yellow-400 flex justify-between items-center">
              Multi-Chain Portfolio
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPortfolioModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-4 max-h-[60vh] overflow-y-auto">
            {Object.entries(tokensByChain).sort((a, b) => (chainTotals[b[0]] || 0) - (chainTotals[a[0]] || 0)).map(([chain, tokens]) => (
              <div key={chain} className="border-b border-[#1E1E1E] pb-3 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-yellow-400">{chain}</span>
                  <span className="text-xs text-gray-400">{formatUsd(chainTotals[chain] || 0)}</span>
                </div>
                <div className="space-y-2 pl-2">
                  {tokens.map((t, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <span className="text-white text-sm font-medium">{t.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white text-xs">{parseFloat(t.balance).toFixed(6)}</div>
                        <div className="text-gray-400 text-xs">${t.usdValue?.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-700 pt-3 flex justify-between text-sm">
            <span className="text-gray-400">Total Balance</span>
            <span className="text-green-400 font-semibold">{formatUsd(totalUsdBalance)}</span>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
