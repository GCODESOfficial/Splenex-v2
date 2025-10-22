"use client"

import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Zap } from "lucide-react"

export function ComingSoonInterface() {
  return (
    <div className="flex flex-col items-center justify-center py-10 space-y-6">
      {/* Icon */}
      <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
        <TrendingUp className="h-8 w-8 text-black" />
      </div>

      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">Perpetual Trading</h2>
        <p className="text-gray-400 text-lg">Coming Soon</p>
      </div>

      {/* Features */}
      <div className="space-y-4 max-w-sm">
        <div className="flex items-center space-x-3 text-gray-300">
          <Zap className="h-5 w-5 text-yellow-400" />
          <span>Leverage up to 100x</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-300">
          <TrendingUp className="h-5 w-5 text-yellow-400" />
          <span>Long & Short positions</span>
        </div>
        <div className="flex items-center space-x-3 text-gray-300">
          <Clock className="h-5 w-5 text-yellow-400" />
          <span>24/7 trading</span>
        </div>
      </div>

      {/* Description */}
      <div className="text-center text-gray-400 text-sm max-w-md leading-relaxed">
        Get ready for advanced perpetual trading with leverage, short selling, and professional-grade tools. Sign up for
        early access notifications.
      </div>

      {/* Notify Button */}
      <Button className="bg-yellow-400 hover:bg-yellow-500 text-black font-medium px-8">
        Notify Me When Available
      </Button>

      {/* Progress Indicator */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Development Progress</span>
          <span>75%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-yellow-400 h-2 rounded-full" style={{ width: "75%" }}></div>
        </div>
      </div>
    </div>
  )
}
