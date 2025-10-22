/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useAccount, useBalance, useEnsName } from "wagmi"
import { Button } from "@/components/ui/button"
import { WalletModal } from "./wallet-modal"
import { WalletDropdown } from "./wallet-dropdown"
import { Menu, X, Wallet, TrendingUp } from "lucide-react"

function useIsClient() {
  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])
  return isClient
}

export function EnhancedNavbar() {
  const isClient = useIsClient()
  const { address, isConnected, chain } = useAccount()
  const { data: balance } = useBalance({ address })
  const { data: ensName } = useEnsName({ address })

  const [showWalletModal, setShowWalletModal] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    console.log("[v0] Wallet connection state:", { isConnected, address, chain: chain?.name })
  }, [isConnected, address, chain])

  if (!isClient) {
    return (
      <nav className="w-full bg-black/95 backdrop-blur-sm h-16 flex items-center justify-between px-4 fixed top-0 z-50 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#FFD600]" />
          <span className="text-white font-bold text-lg">DeFi Platform</span>
        </div>
        <div className="w-32 h-8 bg-gray-800 animate-pulse rounded"></div>
      </nav>
    )
  }

  const formatBalance = (bal: any) => {
    if (!bal) return "0.00"
    const value = Number.parseFloat(bal.formatted)
    if (value < 0.0001) return "< 0.0001"
    return value.toFixed(4)
  }

  return (
    <>
      <nav className="w-full bg-black/95 backdrop-blur-sm h-16 flex items-center justify-between px-4 fixed top-0 z-50 border-b border-gray-800">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-[#FFD600]" />
          <span className="text-white font-bold text-lg hidden sm:block">DeFi Platform</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <nav className="flex items-center gap-4 text-sm">
            <a href="#swap" className="text-gray-300 hover:text-white transition-colors">
              Swap
            </a>
            <a href="#pools" className="text-gray-300 hover:text-white transition-colors">
              Pools
            </a>
            <a href="#portfolio" className="text-gray-300 hover:text-white transition-colors">
              Portfolio
            </a>
            <a href="#analytics" className="text-gray-300 hover:text-white transition-colors">
              Analytics
            </a>
          </nav>
        </div>

        {/* Wallet Section */}
        <div className="flex items-center gap-3">
          {/* Network Indicator */}
          {isConnected && chain && (
            <div className="hidden sm:flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-300">{chain.name}</span>
            </div>
          )}

          {/* Balance Display */}
          {isConnected && balance && (
            <div className="hidden sm:flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-700">
              <Wallet className="h-3 w-3 text-[#FFD600]" />
              <span className="text-sm text-white font-medium">
                {formatBalance(balance)} {balance.symbol}
              </span>
            </div>
          )}

          {/* Wallet Connection */}
          {!isConnected ? (
            <Button
              onClick={() => {
                console.log("[v0] Opening wallet modal")
                setShowWalletModal(true)
              }}
              className="bg-[#FFD600] text-black hover:bg-[#FFD600]/90 font-medium"
            >
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet
            </Button>
          ) : (
            <WalletDropdown />
          )}

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-black/95 backdrop-blur-sm z-40 md:hidden">
          <div className="flex flex-col p-4 space-y-4">
            {/* Mobile Navigation */}
            <nav className="flex flex-col space-y-3">
              <a
                href="#swap"
                className="text-white hover:text-[#FFD600] transition-colors py-2 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Swap
              </a>
              <a
                href="#pools"
                className="text-white hover:text-[#FFD600] transition-colors py-2 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pools
              </a>
              <a
                href="#portfolio"
                className="text-white hover:text-[#FFD600] transition-colors py-2 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Portfolio
              </a>
              <a
                href="#analytics"
                className="text-white hover:text-[#FFD600] transition-colors py-2 px-3 rounded"
                onClick={() => setMobileMenuOpen(false)}
              >
                Analytics
              </a>
            </nav>

            {/* Mobile Wallet Info */}
            {isConnected && (
              <div className="border-t border-gray-800 pt-4 space-y-3">
                {chain && (
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <span className="text-gray-400 text-sm">Network</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-white text-sm">{chain.name}</span>
                    </div>
                  </div>
                )}

                {balance && (
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <span className="text-gray-400 text-sm">Balance</span>
                    <span className="text-white text-sm font-medium">
                      {formatBalance(balance)} {balance.symbol}
                    </span>
                  </div>
                )}

                {address && (
                  <div className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <span className="text-gray-400 text-sm">Address</span>
                    <span className="text-white text-sm font-mono">
                      {ensName || `${address.slice(0, 6)}...${address.slice(-4)}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      <WalletModal open={showWalletModal} onOpenChange={setShowWalletModal} />
    </>
  )
}
