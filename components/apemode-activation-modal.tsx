"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Check } from "lucide-react"

interface ApeModeActivationModalProps {
  isOpen: boolean
  onClose: () => void
  onActivate: (config: ApeModeConfig) => void
}

export interface ApeModeConfig {
  apeBalance: string
  timeFrame: "30m" | "1h" | "3h" | "5h" | "Custom"
  customHours?: number
  isActive: boolean
  slippage: number
}

export function ApeModeActivationModal({ onClose, onActivate }: ApeModeActivationModalProps) {
  const [slippage, setSlippage] = useState(1)
  const [timeFrame, setTimeFrame] = useState<"30m" | "1h" | "3h" | "5h" | "Custom">("1h")
  const [customHours, setCustomHours] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  const handleActivate = () => {
    const config: ApeModeConfig = {
      apeBalance: "0", // no balance input in UI, keep placeholder
      timeFrame,
      customHours: timeFrame === "Custom" ? Number(customHours) : undefined,
      isActive: true,
      slippage,
    }

    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onActivate(config)
      onClose()
      setTimeFrame("1h")
      setCustomHours("")
      setSlippage(1)
    }, 2000)
  }

  if (showSuccess) {
    return (
      <div>
        <div className="max-w-md bg-black overflow-hidden relative">
          <div className="bg-[#FED402] h-9 w-11/12 mx-auto"></div>
          <div className="p-10 text-center border border-[#F3DA5F]">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="absolute top-12 right-4 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
            <div className="mb-10">
              <div className="w-16 h-16 bg-yellow-400 rounded-full mx-auto flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-black" />
              </div>
              <h2 className="text-white text-xl font-semibold mb-1">ApeMode successfully Activated.</h2>
              <p className="text-[#FCD404] text-sm">Trade at the speed of degen.</p>
            </div>
            <Button onClick={onClose} className="bg-[#1F1F1F] text-[#8F8F8F] px-8 py-2 rounded-none border border-[#FCD404]">
              Close
            </Button>
          </div>
          <div className="bg-[#FED402] h-9 w-11/12 mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="max-w-md bg-black  overflow-hidden">
        {/* Yellow top bar */}
        <div className="bg-[#FED402] h-9 w-11/12 mx-auto"></div>

        <div className="p-6 border border-[#F3DA5F]">
          <h2 className="text-[#FCD404] text-lg font-semibold mb-2">Activate Ape Mode</h2>
          <p className="text-gray-400 text-sm mb-6">Set it once. Swap like a cheetah on Red Bull</p>

          {/* Slippage Control */}
          <div className="mb-6">
            <label className="text-white text-sm font-medium mb-2 block">Max Slippage</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.1}
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="flex-1 accent-yellow-400"
              />
              <span className="bg-[#1F1F1F] px-3 py-1 text-white text-sm">{slippage.toFixed(1)}X</span>
            </div>
          </div>

          {/* Flash Time */}
          <div className="mb-6">
            <label className="text-white text-sm font-medium mb-2 block">Flash Time:</label>
            <div className="flex flex-wrap gap-2">
              {(["30m", "1h", "3h", "5h", "Custom"] as const).map((frame) => (
                <Button
                  key={frame}
                  variant={timeFrame === frame ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeFrame(frame)}
                  className={
                    timeFrame === frame
                      ? "bg-yellow-400 text-black hover:bg-yellow-500 rounded-none border-none"
                      : "bg-[#1F1F1F] rounded-none border-none text-gray-400 hover:text-white"
                  }
                >
                  {frame === "30m" ? "30 mins" : frame === "1h" ? "1 hr" : frame === "3h" ? "3 hrs" : frame === "5h" ? "5 hrs" : "Custom"}
                </Button>
              ))}
            </div>
            {timeFrame === "Custom" && (
              <Input
                type="number"
                placeholder="Enter hours"
                value={customHours}
                onChange={(e) => setCustomHours(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 mt-2"
              />
            )}
          </div>

          {/* Activate button */}
          <Button
            onClick={handleActivate}
            disabled={timeFrame === "Custom" && !customHours}
            className="w-full bg-gradient-to-r from-[#F3DA5F] to-[#FCD404] rounded-none text-black font-medium py-3"
          >
            Activate Ape Mode
          </Button>

          {/* Note */}
          <p className="text-gray-400 text-xs mt-4">
            <span className="font-semibold">Note:</span> ApeMode activates only when your wallet is live. No bots, no
            scripts, just speed with Splenex precision.
          </p>
        </div>

        {/* Yellow bottom bar */}
        <div className="bg-[#FED402] h-9 w-11/12 mx-auto"></div>
      </div>
    </div>
  )
}
