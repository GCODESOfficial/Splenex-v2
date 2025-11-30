/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useMemo, useState } from "react"
import { useWallet } from "@/hooks/use-wallet"
import { useSecondaryWallet } from "@/hooks/use-secondary-wallet"
import { detectWallets, type DetectedWallet } from "@/lib/detect-wallets"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Wallet, ExternalLink, Search } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ConnectingModal } from "./connecting-modal"

interface WalletModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  swapWalletType?: "from" | "to" | null
  onSwapWalletConnected?: (address: string, type: "from" | "to") => void
  isSecondaryWallet?: boolean // Flag to use secondary wallet hook
}

interface WalletInfo {
  id: string
  name: string
  icon: string
  installUrl: string
  isInstalled?: boolean
  provider?: any
}

const normalize = (s: string) =>
  (s || "").toLowerCase().replace(/\s+/g, "").replace(/wallet/g, "").replace(/[-.]/g, "")

/** WalletConnect Explorer icons fetch */
const fetchWalletIcons = async (): Promise<WalletInfo[]> => {
  try {
    const pid = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    const url = `https://explorer-api.walletconnect.com/v3/wallets?projectId=${pid}`
    const res = await fetch(url)
    if (!res.ok) throw new Error("Explorer API failed")
    const data = await res.json()
    const entries = (data.listings && Object.values(data.listings)) || []

    return (entries as any[]).map((w: any) => ({
      id: (w.id || w.name || "").toString(),
      name: w.name,
      icon: w.image_url?.md || w.image_url?.sm || "/placeholder.svg",
      installUrl: w.homepage || w.app?.browser || "https://walletconnect.com/explorer",
    }))
  } catch {
    return [
      {
        id: "metamask",
        name: "MetaMask",
        icon: "https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg",
        installUrl: "https://metamask.io/",
      },
      {
        id: "coinbase",
        name: "Coinbase Wallet",
        icon: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
        installUrl: "https://www.coinbase.com/wallet",
      },
      {
        id: "okx",
        name: "OKX Wallet",
        icon: "https://static.okx.com/cdn/assets/imgs/221/8B0F8A7B25C5B0B0.png",
        installUrl: "https://okx.com/web3",
      },
      {
        id: "trust",
        name: "Trust Wallet",
        icon: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
        installUrl: "https://trustwallet.com/",
      },
      {
        id: "rabby",
        name: "Rabby Wallet",
        icon: "https://rabby.io/favicon.svg",
        installUrl: "https://rabby.io/",
      },
      {
        id: "brave",
        name: "Brave Wallet",
        icon: "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
        installUrl: "https://brave.com/wallet/",
      },
      {
        id: "phantom",
        name: "Phantom",
        icon: "/placeholder.svg",
        installUrl: "https://phantom.app/",
      },
      {
        id: "keplr",
        name: "Keplr",
        icon: "/placeholder.svg",
        installUrl: "https://wallet.keplr.app/",
      },
    ]
  }
}

export function WalletModal({
  open,
  onOpenChange,
  swapWalletType,
  onSwapWalletConnected,
  isSecondaryWallet = false,
}: WalletModalProps) {
  const { connect, isConnecting, connectingWallet, isConnected, address } = useWallet()
  const { 
    connectSecondaryWallet, 
    isSecondaryConnecting, 
    isSecondaryConnected, 
    secondaryAddress,
    secondaryWalletType
  } = useSecondaryWallet()

  const [searchTerm, setSearchTerm] = useState("")
  const [wallets, setWallets] = useState<WalletInfo[]>([])
  const [selectedWalletName, setSelectedWalletName] = useState("")
  const [selectedWalletId, setSelectedWalletId] = useState("")
  const [justConnectedSwapWallet, setJustConnectedSwapWallet] = useState(false)

  // Use appropriate connecting state based on wallet type
  const activelyConnecting = isSecondaryWallet ? isSecondaryConnecting : isConnecting
  const showConnectingModal = activelyConnecting && (connectingWallet !== null || selectedWalletId !== "")

  /** Load wallets
   *  - provider-based installed detection only
   *  - keep uninstalled wallets visible
   *  - dedupe by normalized id/name
   */
  useEffect(() => {
    const load = async () => {
      const explorerList = await fetchWalletIcons()
      const detectedList: DetectedWallet[] = detectWallets() || []

      const detectedById = new Map<string, DetectedWallet>()
      const detectedByName = new Map<string, DetectedWallet>()
      for (const d of detectedList) {
        if (!d) continue
        const nid = normalize(d.id || "")
        const nname = normalize(d.name || "")
        if (nid) detectedById.set(nid, d)
        if (nname) detectedByName.set(nname, d)
      }

      const merged: WalletInfo[] = explorerList.map((w) => {
        const nid = normalize(w.id)
        const nname = normalize(w.name)
        const matched = detectedById.get(nid) || detectedByName.get(nname)

        return {
          ...w,
          isInstalled: !!(matched && matched.provider),
          provider: matched?.provider,
        }
      })

      const seen = new Set<string>()
      const unique: WalletInfo[] = []
      for (const w of merged) {
        const key = normalize(w.id) || normalize(w.name)
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(w)
      }

      const hasRabby = unique.some((w) => normalize(w.id) === "rabby" && w.isInstalled)
      if (hasRabby) {
        for (const w of unique) {
          if (normalize(w.id) === "metamask") w.isInstalled = false
        }
      }

      unique.sort((a, b) => {
        if (!!a.isInstalled !== !!b.isInstalled) return a.isInstalled ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      setWallets(unique)
    }

    if (open) load()
  }, [open])

  /** Auto close after connect - both swap and regular connections */
  useEffect(() => {
    // For secondary wallet
    if (isSecondaryWallet && isSecondaryConnected && open && secondaryAddress) {
      if (justConnectedSwapWallet && swapWalletType && onSwapWalletConnected) {
        onSwapWalletConnected(secondaryAddress, swapWalletType)
      }
      onOpenChange(false)
      setJustConnectedSwapWallet(false)
    }
    // For primary wallet
    else if (!isSecondaryWallet && isConnected && open && address) {
      if (justConnectedSwapWallet && swapWalletType && onSwapWalletConnected) {
        onSwapWalletConnected(address, swapWalletType)
      }
      onOpenChange(false)
      setJustConnectedSwapWallet(false)
    }
  }, [
    justConnectedSwapWallet, 
    isConnected, 
    isSecondaryConnected,
    isSecondaryWallet,
    open, 
    onOpenChange, 
    address, 
    secondaryAddress,
    swapWalletType, 
    onSwapWalletConnected
  ])

  const filtered = useMemo(
    () => wallets.filter((w) => w.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [wallets, searchTerm]
  )

  /**
   * Try connecting directly via provider:
   *  - EVM/EIP-1193 (provider.request('eth_requestAccounts'))
   *  - Phantom (provider.connect())
   *  - Keplr (provider.enable(chainId))
   *
   * Returns true on success, false on failure.
   */
  const tryProviderRequest = async (provider: any) => {
    try {
      if (!provider) return false

      // Phantom (Solana)
      if (provider.isPhantom || provider?.connect && provider?.publicKey) {
        // provider.connect() returns { publicKey } or throws
        await provider.connect()
        return true
      }

      // Keplr (Cosmos)
      // keplr.enable(chainId) is required; pick preferred or default to cosmoshub-4
      if (provider?.enable && (provider?.mode === "keplr" || provider === (window as any).keplr || provider?.isKeplr)) {
        const preferred = localStorage.getItem("preferredKeplrChain") || "cosmoshub-4"
        await provider.enable(preferred)
        return true
      }

      // EIP-1193
      if (typeof provider.request === "function") {
        await provider.request({ method: "eth_requestAccounts" })
        return true
      }

      // legacy
      if (typeof provider.enable === "function") {
        await provider.enable()
        return true
      }

      return false
    } catch (err) {
      return false
    }
  }

  const handleConnect = async (wallet: WalletInfo) => {
    setSelectedWalletName(wallet.name)
    setSelectedWalletId(wallet.id)

    // Choose appropriate connect function
    const connectFunction = isSecondaryWallet ? connectSecondaryWallet : connect

    // If installed and we have a provider, use it directly
    if (wallet.isInstalled && wallet.provider) {
      try {
        // Pass the specific provider to connect function
        await connectFunction(wallet.id, wallet.provider)
        if (swapWalletType) setJustConnectedSwapWallet(true)
        return
      } catch (err) {
        console.error(`[WalletModal] provider connect failed for ${wallet.name}:`, err)
      }
    }

    // If not installed or provider flow failed, try your app's connect (e.g., WalletConnect)
    try {
      await connectFunction(wallet.id)
      if (swapWalletType) setJustConnectedSwapWallet(true)
      return
    } catch (err) {
      console.error(`[WalletModal] connect by id failed for ${wallet.name}:`, err)
    }

    // Last resort: open install URL
    try {
      window.open(wallet.installUrl, "_blank")
    } catch (e) {
      console.error("[WalletModal] failed to open install URL", e)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-black rounded-none border-[#FCD404] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              {swapWalletType
                ? `Connect ${swapWalletType === "from" ? "Source" : "Destination"} Wallet`
                : "Connect Wallet"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative pr-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search wallets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#191919] border-gray-700 rounded-none text-white placeholder-gray-400"
              />
            </div>

            <ScrollArea className="h-[320px] pr-4">
              <div className="space-y-2">
                {filtered.map((wallet) => (
                  <Button
                    key={`${wallet.id}-${wallet.name}`}
                    onClick={() => handleConnect(wallet)}
                    disabled={isConnecting}
                    className={`w-full justify-between h-12 border transition-colors rounded-none ${
                      wallet.isInstalled
                        ? "bg-[#241E08] border-[#FCD404] text-white"
                        : "bg-[#191919] border-gray-700 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={wallet.icon || "/placeholder.svg"}
                        alt={`${wallet.name} icon`}
                        className="w-6 h-6 rounded"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                      <span>{wallet.name}</span>
                      {wallet.isInstalled && (
                        <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Installed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!wallet.isInstalled && <ExternalLink className="h-4 w-4 text-gray-400" />}
                      {isConnecting && connectingWallet === wallet.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <ConnectingModal
        open={showConnectingModal}
        onOpenChange={(o) => {
          if (!o) onOpenChange(true)
        }}
        walletName={selectedWalletName}
        walletId={selectedWalletId}
      />
    </>
  )
}
