"use client"

import { useWallet } from "@/hooks/use-wallet"
import { ChevronDown, Copy, LogOut, User } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const CHAIN_NAMES: { [key: string]: string } = {
  "0x1": "Ethereum",
  "0x89": "Polygon",
  "0xa4b1": "Arbitrum",
  "0xa": "Optimism",
}

// Wallet icons mapping - using reliable CDN URLs
const WALLET_ICONS: { [key: string]: string } = {
  rabby: "https://rabby.io/assets/images/logo-128.png",
  metamask: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
  coinbase: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
  trust: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
  brave: "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
  okx: "https://static.okx.com/cdn/assets/imgs/221/8B0F8A7B25C5B0B0.png",
  phantom: "https://phantom.app/img/logo.png",
  walletconnect: "https://walletconnect.com/static/favicon.png",
  zerion: "https://zerion.io/favicon.ico",
}

const WalletIcon = ({ walletType, className = "w-5 h-5" }: { walletType?: string | null; className?: string }) => {
  if (!walletType) return null

  const logoUrl = WALLET_ICONS[walletType.toLowerCase()]
  
  if (!logoUrl) return null

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt={`${walletType} logo`}
      className={`${className} rounded object-contain`}
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

export function WalletDropdown() {
  const { address, disconnect, balance, chainId, connectedWallet } = useWallet()
  
  console.log('[WalletDropdown] connectedWallet from useWallet:', connectedWallet)

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      console.log("[v0] Address copied")
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="md:bg-[#121212] md:p-2 px-1 md:px-2 text-white">
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">{address ? formatAddress(address) : "Wallet"}</span>
            <ChevronDown className="h-4 w-4" />
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 mx-auto  bg-[#121212] border border-[#FCD404] rounded-none">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <WalletIcon walletType={connectedWallet} className="w-4 h-4" />
            <span className="text-sm font-medium text-white">{connectedWallet ? connectedWallet.charAt(0).toUpperCase() + connectedWallet.slice(1) : 'Wallet'}</span>
          </div>

          <div className="text-xs text-gray-400 font-mono">{address && formatAddress(address)}</div>

          {balance && <div className="text-sm text-white mt-1">{balance} ETH</div>}

          {chainId && <div className="text-xs text-gray-400 mt-1">Network: {CHAIN_NAMES[chainId] || "Unknown"}</div>}
        </div>

        <DropdownMenuItem onClick={copyAddress} className="text-white hover:bg-gray-800">
          <Copy className="h-4 w-4 mr-2" />
          Copy Address
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-gray-700" />

        <DropdownMenuItem onClick={disconnect} className="text-red-400 hover:bg-red-900/20">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
