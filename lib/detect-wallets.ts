/* eslint-disable @typescript-eslint/no-explicit-any */

export interface DetectedWallet {
  id: string
  name: string
  provider: any
}

/** Map provider → canonical id/name */
function providerId(p: any): { id: string; name: string } {
  if (!p) return { id: "injected", name: "Injected Wallet" }
  if (p.isRabby) return { id: "rabby", name: "Rabby Wallet" }
  if (p.isBraveWallet && !p.isMetaMask) return { id: "brave", name: "Brave Wallet" }
  if (p.isCoinbaseWallet || p.isCoinbaseBrowser) return { id: "coinbase", name: "Coinbase Wallet" }
  if (p.isOkxWallet) return { id: "okx", name: "OKX Wallet" }
  if (p.isTrust) return { id: "trust", name: "Trust Wallet" }
  if (p.isZerion) return { id: "zerion", name: "Zerion Wallet" }
  if (p.isFrame) return { id: "frame", name: "Frame" }
  if (p.isTally) return { id: "taho", name: "Taho" }
  if (p.isMetaMask) return { id: "metamask", name: "MetaMask" }
  return { id: "injected", name: "Injected Wallet" }
}

/** Detect installed wallets (EIP-6963 + legacy + globals) */
export function detectWallets(): DetectedWallet[] {
  const detected: DetectedWallet[] = []
  if (typeof window === "undefined") return detected

  const addUnique = (id: string, name: string, provider: any) => {
    if (!id) return
    if (!detected.some((d) => d.id === id)) {
      detected.push({ id, name, provider })
    }
  }

  // ---- EIP-6963 ----
  const registry: Map<any, { id: string; name: string }> = new Map()
  function announceHandler(event: any) {
    const prov = event?.detail?.provider
    const info = event?.detail?.info
    if (!prov || !info) return
    const id = (info.rdns || providerId(prov).id).toLowerCase()
    const name = info.name || providerId(prov).name
    if (!Array.from(registry.values()).some((v) => v.id === id)) {
      registry.set(prov, { id, name })
    }
  }
  window.addEventListener("eip6963:announceProvider", announceHandler as EventListener)
  window.dispatchEvent(new Event("eip6963:requestProvider"))
  registry.forEach((meta, prov) => addUnique(meta.id, meta.name, prov))

  // ---- Legacy ethereum.providers ----
  const eth = (window as any).ethereum
  const providers: any[] = Array.isArray(eth?.providers) ? eth.providers : [eth].filter(Boolean)
  for (const prov of providers) {
    const meta = providerId(prov)
    addUnique(meta.id, meta.name, prov)
  }

  // ---- Special globals ----
  if ((window as any).rabby) addUnique("rabby", "Rabby Wallet", (window as any).rabby)
  if ((window as any).solana?.isPhantom) addUnique("phantom", "Phantom", (window as any).solana)
  if ((window as any).keplr) addUnique("keplr", "Keplr", (window as any).keplr)

  // ---- Priority: Rabby > MetaMask ----
  const rabby = detected.find((d) => d.id === "rabby")
  if (rabby) {
    return [rabby, ...detected.filter((d) => d.id !== "metamask")]
  }

  // Sort alphabetically
  return detected.sort((a, b) => a.name.localeCompare(b.name))
}
