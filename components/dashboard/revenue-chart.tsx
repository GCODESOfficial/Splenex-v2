"use client"

import { useEffect, useRef } from "react"

interface RevenueData {
  category: string
  value: number
  color: string
}

interface RevenueChartProps {
  data: RevenueData[]
  totalValue: number
}

export function RevenueChart({ data, totalValue }: RevenueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = 80
    const innerRadius = 50

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate total
    const total = data.reduce((sum, item) => sum + item.value, 0)

    // Draw donut chart
    let currentAngle = -Math.PI / 2

    data.forEach((item) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI

      // Draw arc
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true)
      ctx.closePath()
      ctx.fillStyle = item.color
      ctx.fill()

      currentAngle += sliceAngle
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI)
    ctx.fillStyle = '#FFD600'
    ctx.fill()

    // Draw center text
    ctx.fillStyle = '#000000'
    ctx.font = 'bold 16px Inter'
    ctx.textAlign = 'center'
    ctx.fillText('$', centerX, centerY - 5)
    ctx.font = 'bold 12px Inter'
    ctx.fillText(totalValue.toLocaleString(), centerX, centerY + 10)
  }, [data, totalValue])

  return (
    <div className="flex items-center gap-8">
      {/* Chart */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={200}
          height={200}
          className="w-[200px] h-[200px]"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-medium">
                {item.category}
              </span>
              <span className="text-gray-400 text-sm">
                ${item.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
