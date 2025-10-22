"use client"

import { getAllEnabledChains } from "@/lib/chains-config"
import { useState } from "react"

export function SupportedChains() {
  const [showAll, setShowAll] = useState(false)
  const allChains = getAllEnabledChains()
  const displayedChains = showAll ? allChains : allChains.slice(0, 13)

  return (
    <div className="w-full">
      <h3 className="text-white text-lg font-semibold mb-4">Supported Chains</h3>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {displayedChains.map((chain) => (
              <div
                key={chain.id}
                className="flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFD600] transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center">
                  <img
                    src={chain.logo}
                    alt={chain.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                          ${chain.symbol.charAt(0)}
                        </div>
                      `
                    }}
                  />
                </div>
                <span className="text-white text-xs font-medium text-center leading-tight">
                  {chain.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {allChains.length > 13 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex-shrink-0 px-4 py-2 text-[#FFD600] hover:text-white transition-colors text-sm font-medium"
          >
            {showAll ? 'Show Less' : `+${allChains.length - 13} More`}
          </button>
        )}
      </div>
      
      <div className="text-gray-400 text-sm">
        {allChains.length}+ blockchain networks supported
      </div>
    </div>
  )
}
