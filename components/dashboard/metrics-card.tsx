"use client"

import { ReactNode } from "react"

interface MetricsCardProps {
  icon: ReactNode
  value: string
  label: string
  isHighlighted?: boolean
  className?: string
}

export function MetricsCard({ 
  icon, 
  value, 
  label, 
  isHighlighted = false,
  className = ""
}: MetricsCardProps) {
  return (
    <div className={`
      flex flex-col items-center justify-center p-6 rounded-lg min-h-[120px]
      ${isHighlighted 
        ? 'bg-gradient-to-br from-[#FFD600] to-[#F3DA5F] text-black' 
        : 'bg-[#121212] border border-[#1E1E1E] text-white'
      }
      ${className}
    `}>
      <div className="flex items-center justify-center w-12 h-12 mb-3">
        {icon}
      </div>
      <div className={`
        text-2xl font-bold mb-1
        ${isHighlighted ? 'text-black' : 'text-white'}
      `}>
        {value}
      </div>
      <div className={`
        text-sm font-medium text-center
        ${isHighlighted ? 'text-black/80' : 'text-gray-400'}
      `}>
        {label}
      </div>
    </div>
  )
}
