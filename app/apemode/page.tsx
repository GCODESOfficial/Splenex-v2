/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { ApeModeActivationModal, type ApeModeConfig } from "@/components/apemode-activation-modal"
import { ApeModeSwapInterface } from "@/components/apemode-swap-interface"
import { useWallet } from "@/hooks/use-wallet"

export default function ApeModePage() {
  const { isConnected } = useWallet()
  const [apeModeConfig, setApeModeConfig] = useState<ApeModeConfig | null>(null)

  const handleActivateApeMode = (config: ApeModeConfig) => {
    setApeModeConfig(config)
    console.log("[v0] ApeMode activated with config:", config)
  }

  const handleDeactivateApeMode = () => {
    setApeModeConfig(null)
    console.log("[v0] ApeMode deactivated")
  }

  return (
    <div className=" m-auto flex justify-center pt-28 bg-black text-white p-6">
      {!apeModeConfig?.isActive ? (
        <ApeModeActivationModal
          isOpen={true}
          onClose={() => {}}
          onActivate={handleActivateApeMode}
        />
      ) : (
        <ApeModeSwapInterface
          config={apeModeConfig}
          fromToken={{} as any}   // 🔥 plug in actual token state
          toToken={{} as any}
          onExecuteSwap={async () => {}}
          onDeactivate={handleDeactivateApeMode}
          isConnected={isConnected}
        />
      )}
    </div>
  )
}
