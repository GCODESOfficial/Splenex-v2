"use client"

import { useEffect, useRef, useState } from "react"

interface VolumeData {
  time: string
  crossChain: number
  crossMarket: number
}

interface TradingVolumeChartProps {
  data: VolumeData[]
  selectedTimeframe: string
  onTimeframeChange: (timeframe: string) => void
}

const timeframes = ["1D", "3D", "1W", "1M", "3M", "All Time"]

export function TradingVolumeChart({ 
  data, 
  selectedTimeframe, 
  onTimeframeChange 
}: TradingVolumeChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect()
        setDimensions({ width: rect.width, height: rect.height })
      }
    }

    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || dimensions.width === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Chart dimensions
    const padding = 40
    const chartWidth = canvas.width - 2 * padding
    const chartHeight = canvas.height - 2 * padding

    // Find max values for scaling
    const maxValue = Math.max(
      ...data.flatMap(d => [d.crossChain, d.crossMarket])
    )

    // Draw grid lines
    ctx.strokeStyle = '#2A2A2A'
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 6; i++) {
      const y = padding + (chartHeight / 6) * i
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(padding + chartWidth, y)
      ctx.stroke()
    }

    // Vertical grid lines
    for (let i = 0; i <= 12; i++) {
      const x = padding + (chartWidth / 12) * i
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, padding + chartHeight)
      ctx.stroke()
    }

    // Draw Y-axis labels
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '12px Inter'
    ctx.textAlign = 'right'
    const yLabels = ['1k', '10k', '50k', '100k', '200k', '500k', '1b']
    yLabels.forEach((label, i) => {
      const y = padding + (chartHeight / 6) * i
      ctx.fillText(label, padding - 10, y + 4)
    })

    // Draw X-axis labels
    ctx.textAlign = 'center'
    data.forEach((d, i) => {
      const x = padding + (chartWidth / (data.length - 1)) * i
      ctx.fillText(d.time, x, padding + chartHeight + 20)
    })

    // Draw lines
    const drawLine = (values: number[], color: string, label: string) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()

      values.forEach((value, i) => {
        const x = padding + (chartWidth / (values.length - 1)) * i
        const y = padding + chartHeight - (value / maxValue) * chartHeight

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      })

      ctx.stroke()

      // Draw points
      ctx.fillStyle = color
      values.forEach((value, i) => {
        const x = padding + (chartWidth / (values.length - 1)) * i
        const y = padding + chartHeight - (value / maxValue) * chartHeight
        
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
      })
    }

    // Draw Cross-Chain Swap line
    drawLine(data.map(d => d.crossChain), '#FFD600', 'Cross-Chain Swap')
    
    // Draw Cross-Market Swap line
    drawLine(data.map(d => d.crossMarket), '#10B981', 'Cross-Market Swap')
  }, [data, dimensions])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white text-lg font-semibold">Trading Volume</h3>
        
        {/* Timeframe buttons */}
        <div className="flex gap-2">
          {timeframes.map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => onTimeframeChange(timeframe)}
              className={`
                px-3 py-1 rounded text-sm font-medium transition-colors
                ${selectedTimeframe === timeframe
                  ? 'bg-[#FFD600] text-black'
                  : 'bg-[#1A1A1A] text-white hover:bg-[#2A2A2A]'
                }
              `}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FFD600]" />
          <span className="text-white text-sm">Cross-Chain Swap</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#10B981]" />
          <span className="text-white text-sm">Cross-Market Swap</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-[#0D0D0D] rounded-lg p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-[300px]"
          style={{ minHeight: '300px' }}
        />
      </div>
    </div>
  )
}
