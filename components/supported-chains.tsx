/* eslint-disable @next/next/no-img-element */
"use client"

import { useState, useEffect } from "react"
import { useLiFi } from "@/hooks/use-lifi"

interface Chain {
  id: number
  name: string
  logoURI?: string
  nativeCurrency: {
    symbol: string
  }
}

export function SupportedChains() {
  const [chains, setChains] = useState<Chain[]>([])
  const { getSupportedChains } = useLiFi()

  useEffect(() => {
    const fetchChains = async () => {
      try {
        const supportedChains = await getSupportedChains()
        if (supportedChains && Array.isArray(supportedChains)) {
          const mainChains = supportedChains
            .filter((chain: Chain) =>
              [1, 56, 137, 42161, 10, 43114, 8453, 100, 250, 25, 1313161554, 1284, 1285, 42220].includes(chain.id),
            )
            .slice(0, 14)
          setChains(mainChains)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch supported chains:", error)
      }
    }

    fetchChains()
  }, [getSupportedChains])

  const getChainDisplayName = (chain: Chain) => {
    const nameMap: { [key: number]: string } = {
      1: "Ethereum",
      56: "BNB Chain",
      137: "Polygon",
      42161: "Arbitrum",
      10: "Optimism",
      43114: "Avalanche",
      8453: "Base",
      100: "Gnosis",
      250: "Fantom",
      25: "Cronos",
      1313161554: "Aurora",
      1284: "Moonbeam",
      1285: "Moonriver",
      42220: "Celo",
    }
    return nameMap[chain.id] || chain.name
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
      <h2 className="text-white text-lg font-medium mb-4">Supported Chains</h2>
      <div className="flex flex-wrap gap-3">
        {chains.map((chain) => (
          <div
            key={chain.id}
            className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-full border border-gray-600"
          >
            {chain.logoURI && (
              <img
                src={chain.logoURI || "/placeholder.svg"}
                alt={chain.name}
                className="w-5 h-5 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = "none"
                }}
              />
            )}
            <span className="text-white text-sm">{getChainDisplayName(chain)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
