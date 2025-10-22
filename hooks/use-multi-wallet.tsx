/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useCallback, useEffect } from "react"
import { useWallet } from "./use-wallet"

interface SwapWallet {
  address: string
  chainId: string
  balance: string
  isConnected: boolean
  walletType: string
  provider: any
}

interface MultiWalletState {
  mainWallet: {
    address: string | undefined
    isConnected: boolean
    balance: string | undefined
    chainId: string | undefined
  }
  swapWallets: {
    from: SwapWallet | null
    to: SwapWallet | null
  }
}

interface ConnectedWallet {
  address: string
  chainId: string
  balance: string
  walletType: string
  provider: any
  isConnected: boolean
}

export function useMultiWallet() {
  const mainWallet = useWallet()
  const [swapWallets, setSwapWallets] = useState<{
    from: SwapWallet | null
    to: SwapWallet | null
  }>({
    from: null,
    to: null,
  })

  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([])

  useEffect(() => {
    if (mainWallet.isConnected && mainWallet.address) {
      const mainWalletData: SwapWallet = {
        address: mainWallet.address,
        chainId: mainWallet.chainId || "0x1",
        balance: mainWallet.balance || "0",
        isConnected: true,
        walletType: "main",
        provider: typeof window !== "undefined" ? window.ethereum : null,
      }

      setConnectedWallets((prev) => {
        const existing = prev.find((w) => w.address === mainWallet.address)
        if (!existing) {
          return [
            ...prev,
            {
              address: mainWallet.address!,
              chainId: mainWallet.chainId || "0x1",
              balance: mainWallet.balance || "0",
              walletType: "main",
              provider: typeof window !== "undefined" ? window.ethereum : null,
              isConnected: true,
            },
          ]
        }
        return prev
      })

      setSwapWallets((prev) => ({
        from: prev.from || mainWalletData,
        to: prev.to || mainWalletData,
      }))
    }
  }, [mainWallet.isConnected, mainWallet.address, mainWallet.chainId, mainWallet.balance])

  const getWalletBalance = async (address: string, provider: any): Promise<string> => {
    try {
      if (!provider) return "0.000000000000000000"

      const hex: string = await provider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })
      
      if (!hex || hex === "0x") return "0.000000000000000000"
      
      const wei = BigInt(hex)
      const weiString = wei.toString()
      
      // Convert wei to ETH with proper precision using string manipulation
      if (weiString === "0") return "0.000000000000000000"
      
      // Pad with zeros to ensure we have at least 18 decimal places
      const paddedWei = weiString.padStart(19, "0")
      const integerPart = paddedWei.slice(0, -18) || "0"
      const decimalPart = paddedWei.slice(-18)
      
      // Remove trailing zeros from decimal part
      const trimmedDecimal = decimalPart.replace(/0+$/, "")
      
      if (trimmedDecimal === "") {
        return `${integerPart}.000000000000000000`
      }
      
      // Pad trimmed decimal to show meaningful precision
      const finalDecimal = trimmedDecimal.padEnd(6, "0").slice(0, 18)
      
      return `${integerPart}.${finalDecimal}`
    } catch (error) {
      console.error("[v0] Error getting wallet balance:", error)
      return "0.000000000000000000"
    }
  }

  const getWalletProvider = (walletId: string): any => {
    if (typeof window === "undefined") return null

    switch (walletId) {
      case "metamask":
        return window.ethereum?.isMetaMask ? window.ethereum : null
      case "coinbase":
        return window.ethereum?.isCoinbaseWallet ? window.ethereum : null
      case "brave":
        return window.ethereum?.isBraveWallet ? window.ethereum : null
      case "trust":
        return window.ethereum?.isTrust ? window.ethereum : null
      case "rabby":
        return window.ethereum?.isRabby ? window.ethereum : null
      case "okx":
        return window.ethereum?.isOkxWallet ? window.ethereum : null
      default:
        return window.ethereum
    }
  }

  const connectSwapWallet = useCallback(async (type: "from" | "to", walletId: string) => {
    try {
      console.log(`[v0] Connect new wallet for ${type}`)
      console.log(`[v0] Requesting wallet connection...`, walletId)

      const provider = getWalletProvider(walletId)
      if (!provider) {
        throw new Error(`${walletId} provider not found`)
      }

      console.log(`[v0] Connecting to swap wallet:`, walletId)

      let accounts
      try {
        accounts = await provider.request({
          method: "eth_requestAccounts",
        })
      } catch (connectionError: any) {
        // Handle user rejection or connection failure gracefully
        if (connectionError.code === 4001) {
          throw new Error(`User rejected ${walletId} connection request`)
        } else if (connectionError.code === -32002) {
          throw new Error(`${walletId} connection request already pending`)
        } else {
          throw new Error(`Failed to connect to ${walletId}: ${connectionError.message || "Unknown error"}`)
        }
      }

      if (accounts.length === 0) {
        throw new Error("No accounts returned from wallet")
      }

      const address = accounts[0]
      console.log(`[v0] Successfully connected to swap wallet:`, address)

      const chainId = await provider.request({
        method: "eth_chainId",
      })

      const balance = await getWalletBalance(address, provider)

      const walletData: SwapWallet = {
        address,
        chainId,
        balance,
        isConnected: true,
        walletType: walletId,
        provider,
      }

      setConnectedWallets((prev) => {
        const existing = prev.find((w) => w.address === address)
        if (!existing) {
          return [
            ...prev,
            {
              address,
              chainId,
              balance,
              walletType: walletId,
              provider,
              isConnected: true,
            },
          ]
        }
        return prev.map((w) => (w.address === address ? { ...w, isConnected: true } : w))
      })

      setSwapWallets((prev) => ({
        ...prev,
        [type]: walletData,
      }))

      console.log(`[v0] Swap wallet connected for ${type}:`, address)
      return address
    } catch (error) {
      console.error(`[v0] Failed to connect ${type} swap wallet:`, error)
      return null
    }
  }, [])

  const switchToConnectedWallet = useCallback(
    (type: "from" | "to", address: string) => {
      const connectedWallet = connectedWallets.find((w) => w.address === address && w.isConnected)

      if (!connectedWallet) {
        console.error(`[v0] Wallet ${address} is not connected`)
        return
      }

      const walletData: SwapWallet = {
        address: connectedWallet.address,
        chainId: connectedWallet.chainId,
        balance: connectedWallet.balance,
        isConnected: true,
        walletType: connectedWallet.walletType,
        provider: connectedWallet.provider,
      }

      setSwapWallets((prev) => ({
        ...prev,
        [type]: walletData,
      }))

      console.log(`[v0] Switched ${type} wallet to:`, address)
    },
    [connectedWallets],
  )

  const setSwapWalletAddress = useCallback(
    (type: "from" | "to", address: string) => {
      const connectedWallet = connectedWallets.find((w) => w.address === address)

      if (connectedWallet) {
        // Use the connected wallet data
        switchToConnectedWallet(type, address)
      } else {
        // Create a non-connected wallet entry for pasted addresses
        const walletData: SwapWallet = {
          address,
          chainId: "0x1",
          balance: "0",
          isConnected: false,
          walletType: "pasted",
          provider: null,
        }

        setSwapWallets((prev) => ({
          ...prev,
          [type]: walletData,
        }))
      }
    },
    [connectedWallets, switchToConnectedWallet],
  )

  const disconnectSwapWallet = useCallback((type: "from" | "to") => {
    setSwapWallets((prev) => ({
      ...prev,
      [type]: null,
    }))
  }, [])

  const disconnectWallet = useCallback((address: string) => {
    setConnectedWallets((prev) => prev.map((w) => (w.address === address ? { ...w, isConnected: false } : w)))

    // Update swap wallets if they're using this address
    setSwapWallets((prev) => ({
      from: prev.from?.address === address ? null : prev.from,
      to: prev.to?.address === address ? null : prev.to,
    }))
  }, [])

  const refreshWalletBalances = useCallback(async () => {
    const updatedWallets = await Promise.all(
      connectedWallets.map(async (wallet) => {
        if (!wallet.isConnected || !wallet.provider) return wallet

        try {
          const balance = await getWalletBalance(wallet.address, wallet.provider)
          const chainId = await wallet.provider.request({ method: "eth_chainId" })

          return { ...wallet, balance, chainId }
        } catch (error) {
          console.error(`[v0] Error refreshing balance for ${wallet.address}:`, error)
          return wallet
        }
      }),
    )

    setConnectedWallets(updatedWallets)

    // Update swap wallets with new balances
    setSwapWallets((prev) => ({
      from: prev.from
        ? {
            ...prev.from,
            balance: updatedWallets.find((w) => w.address === prev.from?.address)?.balance || prev.from.balance,
          }
        : null,
      to: prev.to
        ? {
            ...prev.to,
            balance: updatedWallets.find((w) => w.address === prev.to?.address)?.balance || prev.to.balance,
          }
        : null,
    }))
  }, [connectedWallets])

  return {
    mainWallet,
    swapWallets,
    connectedWallets, // Expose all connected wallets
    connectSwapWallet,
    switchToConnectedWallet, // New function to switch between connected wallets
    setSwapWalletAddress,
    disconnectSwapWallet,
    disconnectWallet, // New function to disconnect specific wallets
    refreshWalletBalances, // New function to refresh balances
  }
}
