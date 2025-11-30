/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Zap, Pause, Play, RotateCcw } from "lucide-react"
import type { ApeModeConfig } from "./apemode-activation-modal"

interface ApeModeSwapInterfaceProps {
  config: ApeModeConfig
  fromToken: any
  toToken: any
  onExecuteSwap: (amount: string) => Promise<void>
  onDeactivate: () => void
  isConnected: boolean
}

export function ApeModeSwapInterface({
  config,
  fromToken,
  toToken,
  onExecuteSwap,
  onDeactivate,
  isConnected,
}: ApeModeSwapInterfaceProps) {
  const [isActive, setIsActive] = useState(false)
  const [swapCount, setSwapCount] = useState(0)
  const [totalVolume, setTotalVolume] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [swapAmount, setSwapAmount] = useState("")
  const [swapInterval, setSwapInterval] = useState(30) // seconds between swaps
  const [maxSwaps, setMaxSwaps] = useState(10)

 // Calculate time frame in seconds
const getTimeFrameInSeconds = () => {
  switch (config.timeFrame) {
    case "30m":
      return 30 * 60 // 1800s
    case "1h":
      return 60 * 60 // 3600s
    case "3h":
      return 3 * 3600 // 10800s
    case "5h":
      return 5 * 3600 // 18000s
    case "Custom":
      return (config.customHours || 1) * 3600
    default:
      return 3600 // fallback to 1h
  }
}

  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isActive, timeRemaining])

  useEffect(() => {
    if (isActive && swapCount < maxSwaps && timeRemaining > 0) {
      const swapTimer = setInterval(async () => {
        if (swapAmount && Number.parseFloat(swapAmount) > 0) {
          try {
            await onExecuteSwap(swapAmount)
            setSwapCount((prev) => prev + 1)
            setTotalVolume((prev) => prev + Number.parseFloat(swapAmount))
          } catch (error) {
            console.error("[v0] ApeMode swap failed:", error)
          }
        }
      }, swapInterval * 1000)

      return () => clearInterval(swapTimer)
    }
  }, [isActive, swapCount, maxSwaps, timeRemaining, swapAmount, swapInterval, onExecuteSwap])

  const handleStart = () => {
    if (!swapAmount || Number.parseFloat(swapAmount) <= 0) {
      alert("Please enter a valid swap amount")
      return
    }

    setIsActive(true)
    setTimeRemaining(getTimeFrameInSeconds())
    setSwapCount(0)
    setTotalVolume(0)
  }

  const handlePause = () => {
    setIsActive(false)
  }

  const handleReset = () => {
    setIsActive(false)
    setSwapCount(0)
    setTotalVolume(0)
    setTimeRemaining(0)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const progress = maxSwaps > 0 ? (swapCount / maxSwaps) * 100 : 0

  return (
    <div className="bg-[#121214] border border-[#F3DA5F] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <img src="/images/apemode.svg" alt="ApeMode" className="h-5 w-5" />
          <h2 className="text-white text-lg font-semibold">ApeMode Active</h2>
          <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-400" : "bg-red-400"}`} />
        </div>
        <Button
          onClick={onDeactivate}
          variant="outline"
          size="sm"
          className="border-[#1F1F1F] border-2 rounded-none text-gray-400 hover:text-white bg-transparent"
        >
          Deactivate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1F1F1F] p-3 text-center">
          <div className="text-yellow-400 text-lg font-bold">{swapCount}</div>
          <div className="text-gray-400 text-xs">Swaps</div>
        </div>
        <div className="bg-[#1F1F1F] p-3 text-center">
          <div className="text-yellow-400 text-lg font-bold">{totalVolume.toFixed(4)}</div>
          <div className="text-gray-400 text-xs">Volume</div>
        </div>
        <div className="bg-[#1F1F1F] p-3 text-center">
          <div className="text-yellow-400 text-lg font-bold">{formatTime(timeRemaining)}</div>
          <div className="text-gray-400 text-xs">Time Left</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-2">
          <span>Progress</span>
          <span>
            {swapCount}/{maxSwaps} swaps
          </span>
        </div>
        <Progress value={progress} className="h-2 bg-[#1F1F1F]" />
      </div>

      {/* Configuration */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Swap Amount</label>
            <Input
              type="number"
              placeholder="0.001"
              value={swapAmount}
              onChange={(e) => setSwapAmount(e.target.value)}
              disabled={isActive}
              className="bg-[#1F1F1F] rounded-none border-none text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Interval (sec)</label>
            <Input
              type="number"
              placeholder="30"
              value={swapInterval}
              onChange={(e) => setSwapInterval(Number(e.target.value))}
              disabled={isActive}
              className="bg-[#1F1F1F] rounded-none border-none text-white"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm mb-1 block">Max Swaps</label>
          <Input
            type="number"
            placeholder="10"
            value={maxSwaps}
            onChange={(e) => setMaxSwaps(Number(e.target.value))}
            disabled={isActive}
            className="bg-[#1F1F1F] rounded-none border-none text-white focus:outline-none focus:ring-0 focus:border-none"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-2">
        {!isActive ? (
          <Button
            onClick={handleStart}
            disabled={!isConnected || !swapAmount}
            className="flex-1 bg-gradient-to-r from-[#F3DA5F] to-[#FCD404] rounded-none text-black font-bold"
          >
            <Play className="h-4 w-4 mr-2" />
            Start ApeMode
          </Button>
        ) : (
          <Button onClick={handlePause} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white">
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </Button>
        )}

        <Button
          onClick={handleReset}
          variant="outline"
          className="border-[#1F1F1F] rounded-none border-2 text-gray-400 hover:text-white bg-transparent"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Warning */}
      <div className="mt-4 p-3 bg-yellow-400/10 border border-yellow-400/20">
        <p className="text-yellow-400 text-xs">
          ⚠️ ApeMode executes automated swaps. Monitor your positions and ensure sufficient balance.
        </p>
      </div>
    </div>
  )
}
