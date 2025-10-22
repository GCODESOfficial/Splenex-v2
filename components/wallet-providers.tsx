"use client"

import type React from "react"
import { WagmiProvider, createConfig, http } from "wagmi"
import { mainnet, polygon } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { injected, metaMask } from "wagmi/connectors"

const queryClient = new QueryClient()

const chains = [mainnet, polygon] as const

const connectors = [injected({ shimDisconnect: true }), metaMask()]

const config = createConfig({
  chains,
  connectors,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
})

export function WalletProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
