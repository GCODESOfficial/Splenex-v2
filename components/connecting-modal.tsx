/* eslint-disable @next/next/no-img-element */
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ConnectingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletName?: string
  walletId?: string
}

const WALLET_ICONS: { [key: string]: string } = {
  metamask: "https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg",
  coinbase: "https://avatars.githubusercontent.com/u/18060234?s=280&v=4",
  trust: "https://trustwallet.com/assets/images/media/assets/trust_platform.svg",
  rabby: "https://rabby.io/assets/images/logo-128.png",
  okx: "https://static.okx.com/cdn/assets/imgs/221/8B0F8A7B25C5B0B0.png",
  brave: "https://brave.com/static-assets/images/brave-logo-sans-text.svg",
  phantom: "https://phantom.app/img/logo.png",
  walletconnect: "https://walletconnect.com/static/favicon.png",
}

export function ConnectingModal({ open, onOpenChange, walletName, walletId }: ConnectingModalProps) {
  const walletIcon = walletId ? WALLET_ICONS[walletId] : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm bg-[#191919] border-[#FCD404] p-8 rounded-none">
        <DialogHeader>
          <DialogTitle className="text-white text-lg font-medium">Connecting</DialogTitle>
          <DialogDescription className="sr-only">Connecting to {walletName || 'wallet'}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center space-y-6">

          {/* Wallet Icons Bar */}
          <div className="flex items-center justify-center bg-[#FFD600] rounded-lg p-3 w-full max-w-[200px]">
            <div className="flex items-center gap-3">
              {walletIcon ? (
                <div className="flex items-center justify-center">
                  <img
                    src={walletIcon || "/placeholder.svg"}
                    alt={`${walletName} icon`}
                    className="w-8 h-8 rounded-full object-contain"
                    width={32}
                    height={32}
                    style={{ width: "auto", height: "auto" }}
                    onError={(e) => {
                      e.currentTarget.src = `/placeholder.svg?height=32&width=32&query=${walletName} wallet logo`
                    }}
                  />
                </div>
              ) : (
                <>
                  {/* MetaMask Icon */}
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>

                  {/* WalletConnect Icon */}
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded"></div>
                  </div>

                  {/* Third Wallet Icon */}
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <div className="w-4 h-4 bg-white rounded-sm"></div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Trust Message */}
          <div className="text-center">
            <p className="text-gray-300 text-sm">
              Only connect with sites you trust.{" "}
              <a href="#" className="text-[#FFD600] hover:underline">
                Learn more
              </a>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Back
            </Button>

            <Button disabled className="flex-1 bg-[#FFD600] text-black hover:bg-[#FFD600]/90">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
