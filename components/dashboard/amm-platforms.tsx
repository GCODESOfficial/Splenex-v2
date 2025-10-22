"use client"

interface AMMPlatform {
  name: string
  logo: string
  isActive?: boolean
}

const AMM_PLATFORMS: AMMPlatform[] = [
  { name: "Uniswap", logo: "/images/amm/uniswap.png" },
  { name: "Balancer", logo: "/images/amm/balancer.png" },
  { name: "Pancake Swap", logo: "/images/amm/pancakeswap.png" },
  { name: "Trader Joe", logo: "/images/amm/traderjoe.png" },
  { name: "Sushiswap", logo: "/images/amm/sushiswap.png" },
  { name: "Curve Finance", logo: "/images/amm/curve.png" },
  { name: "Raydium", logo: "/images/amm/raydium.png" },
  { name: "1inch", logo: "/images/amm/1inch.png" },
  { name: "Kyber", logo: "/images/amm/kyber.png" },
  { name: "dYdX", logo: "/images/amm/dydx.png" },
  { name: "Compound", logo: "/images/amm/compound.png" },
  { name: "Aave", logo: "/images/amm/aave.png" },
  { name: "Yearn", logo: "/images/amm/yearn.png" },
  { name: "Convex", logo: "/images/amm/convex.png" },
  { name: "Frax", logo: "/images/amm/frax.png" },
  { name: "GMX", logo: "/images/amm/gmx.png" },
]

export function AMMPlatforms() {
  return (
    <div className="w-full">
      <h3 className="text-white text-lg font-semibold mb-2">
        Automated Market Makers
      </h3>
      
      <p className="text-gray-400 text-sm mb-6">
        Splenex AMMs ensure optimal pricing and deep liquidity across chains — 
        so every trade is fast, fair, and efficient.
      </p>

      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
        {AMM_PLATFORMS.map((platform, index) => (
          <div
            key={index}
            className="flex flex-col items-center gap-2 p-3 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#FFD600] transition-all duration-200 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
              <img
                src={platform.logo}
                alt={platform.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement!.innerHTML = `
                    <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-bold">
                      ${platform.name.charAt(0)}
                    </div>
                  `
                }}
              />
            </div>
            <span className="text-white text-xs font-medium text-center leading-tight">
              {platform.name}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-gray-400 text-sm">
        {AMM_PLATFORMS.length}+ AMM protocols integrated
      </div>
    </div>
  )
}
