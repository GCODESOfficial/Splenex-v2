"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertTriangle, Info } from "lucide-react"

interface SlippageSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentSlippage: number
  onSlippageChange: (slippage: number) => void
}

export function SlippageSettingsModal({
  isOpen,
  onClose,
  currentSlippage,
  onSlippageChange,
}: SlippageSettingsModalProps) {
  const [slippage, setSlippage] = useState(currentSlippage)
  const [customSlippage, setCustomSlippage] = useState("")
  const [isCustom, setIsCustom] = useState(false)

  useEffect(() => {
    setSlippage(currentSlippage)
    // Check if current slippage is a preset value
    const presetValues = [0.1, 0.5, 1.0]
    if (!presetValues.includes(currentSlippage)) {
      setIsCustom(true)
      setCustomSlippage(currentSlippage.toString())
    }
  }, [currentSlippage])

  const presetSlippages = [
    { value: 0.1, label: "0.1%" },
    { value: 0.5, label: "0.5%" },
    { value: 1.0, label: "1.0%" },
  ]

  const handlePresetClick = (value: number) => {
    setSlippage(value)
    setIsCustom(false)
    setCustomSlippage("")
  }

  const handleCustomSlippageChange = (value: string) => {
    setCustomSlippage(value)
    const numValue = Number.parseFloat(value)
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 50) {
      setSlippage(numValue)
      setIsCustom(true)
    }
  }

  const handleSave = () => {
    onSlippageChange(slippage)
    onClose()
  }

  const getSlippageWarning = (slippageValue: number) => {
    if (slippageValue < 0.1) {
      return { type: "error", message: "Slippage too low - transaction may fail" }
    }
    if (slippageValue > 5) {
      return { type: "warning", message: "High slippage - you may lose funds to MEV" }
    }
    if (slippageValue > 1) {
      return { type: "caution", message: "High slippage tolerance" }
    }
    return null
  }

  const warning = getSlippageWarning(slippage)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#191919] border-2 border-yellow-400 p-0">
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg">Slippage Settings</DialogTitle>
              
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Info */}
            <div className="flex items-start space-x-3 p-3 bg-[#241E08]">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                Slippage tolerance is the maximum price change you&apos;re willing to accept. Higher slippage reduces failed
                transactions but increases price impact.
              </div>
            </div>

            {/* Preset Slippage Options */}
            <div>
              <label className="text-white text-sm font-medium mb-3 block">Slippage Tolerance</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {presetSlippages.map((preset) => (
                  <Button
                    key={preset.value}
                    variant={!isCustom && slippage === preset.value ? "default" : "outline"}
                    onClick={() => handlePresetClick(preset.value)}
                    className={
                      !isCustom && slippage === preset.value
                        ? "bg-yellow-400 text-black hover:bg-yellow-500 border-yellow-400"
                        : "text-white border-gray-600 hover:bg-gray-800 hover:border-gray-500"
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom Slippage Input */}
              <div className="relative">
                <Input
                  type="number"
                  placeholder="Custom"
                  value={customSlippage}
                  onChange={(e) => handleCustomSlippageChange(e.target.value)}
                  onFocus={() => setIsCustom(true)}
                  className={`bg-[#241E08] border-gray-600 rounded-none text-white pr-8 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isCustom ? "border-yellow-400" : ""}`}
                  min="0"
                  max="50"
                  step="0.1"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">%</span>
              </div>
            </div>

            {/* Warning Messages */}
            {warning && (
              <div
                className={`flex items-start space-x-3 p-3 rounded-lg ${
                  warning.type === "error"
                    ? "bg-red-900/20 border border-red-500/30"
                    : warning.type === "warning"
                      ? "bg-orange-900/20 border border-orange-500/30"
                      : "bg-yellow-900/20 border border-yellow-500/30"
                }`}
              >
                <AlertTriangle
                  className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                    warning.type === "error"
                      ? "text-red-400"
                      : warning.type === "warning"
                        ? "text-orange-400"
                        : "text-yellow-400"
                  }`}
                />
                <div
                  className={`text-sm ${
                    warning.type === "error"
                      ? "text-red-300"
                      : warning.type === "warning"
                        ? "text-orange-300"
                        : "text-yellow-300"
                  }`}
                >
                  {warning.message}
                </div>
              </div>
            )}

            {/* Current Selection Display */}
            <div className="p-3 bg-[#241E08]">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Current Slippage:</span>
                <span className="text-white font-medium">{slippage.toFixed(1)}%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 text-white border-gray-600 hover:bg-gray-800 bg-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-yellow-400 text-black hover:bg-yellow-500">
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
