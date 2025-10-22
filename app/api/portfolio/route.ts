/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/portfolio/route.ts
import { NextRequest } from "next/server"

type ChainIdHex =
  | "0x1"   // Ethereum
  | "0x89"  // Polygon
  | "0xa"   // Optimism
  | "0xa4b1"// Arbitrum
  | "0x2105"// Base
  | "0x38"  // BSC
  | string

interface PortfolioRequest {
  address: string
  chainId: ChainIdHex
}

interface TokenBalance {
  address: string
  symbol: string
  name: string
  balance: string // human-readable
  price: number   // USD
  usdValue: number
}

interface PortfolioResponse {
  tokens: TokenBalance[]
  totalUsd: number
}

const ALCHEMY_KEYS: Record<string, string | undefined> = {
  ethereum: process.env.ALCHEMY_API_KEY_ETHEREUM,
  polygon: process.env.ALCHEMY_API_KEY_POLYGON,
  arbitrum: process.env.ALCHEMY_API_KEY_ARBITRUM,
  optimism: process.env.ALCHEMY_API_KEY_OPTIMISM,
  base: process.env.ALCHEMY_API_KEY_BASE,
  zksync: process.env.ALCHEMY_API_KEY_ZKSYNC,
}

const MORALIS_KEY = process.env.MORALIS_API_KEY

function normalizeHexChainId(hex: string): string {
  const lower = hex.toLowerCase()
  return lower.startsWith("0x") ? lower : `0x${parseInt(lower, 10).toString(16)}`
}

function chainMeta(chainId: ChainIdHex) {
  const id = normalizeHexChainId(chainId)
  switch (id) {
    case "0x1":
      return { alchemy: { name: "ethereum", url: (key: string) => `https://eth-mainnet.g.alchemy.com/v2/${key}` }, moralis: { name: "eth" }, decimals: 18 }
    case "0x89":
      return { alchemy: { name: "polygon", url: (key: string) => `https://polygon-mainnet.g.alchemy.com/v2/${key}` }, moralis: { name: "polygon" }, decimals: 18 }
    case "0xa4b1":
      return { alchemy: { name: "arbitrum", url: (key: string) => `https://arb-mainnet.g.alchemy.com/v2/${key}` }, moralis: { name: "arbitrum" }, decimals: 18 }
    case "0xa":
      return { alchemy: { name: "optimism", url: (key: string) => `https://opt-mainnet.g.alchemy.com/v2/${key}` }, moralis: { name: "optimism" }, decimals: 18 }
    case "0x2105":
      return { alchemy: { name: "base", url: (key: string) => `https://base-mainnet.g.alchemy.com/v2/${key}` }, moralis: { name: "base" }, decimals: 18 }
    case "0x38":
      // Alchemy doesn't cover BSC → use Moralis
      return { alchemy: null, moralis: { name: "bsc" }, decimals: 18 }
    default:
      // Fallback to Moralis generic EVM (best-effort)
      return { alchemy: null, moralis: { name: id }, decimals: 18 }
  }
}

/** ---------- Alchemy helpers ---------- */
async function alchemyGetTokens(baseUrl: string, address: string) {
  const url = `${baseUrl}/v2/getTokenBalances`
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, withMetadata: true }),
  })
  if (!res.ok) throw new Error("Alchemy token balances failed")
  return res.json()
}

async function alchemyGetTokenPrice(baseUrl: string, contractAddress: string): Promise<number> {
  // Token Price V2 endpoint
  const url = `${baseUrl}/v2/getTokenPrice`
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contractAddress }),
  })
  if (!res.ok) return 0
  const data = await res.json()
  return typeof data?.usdPrice === "number" ? data.usdPrice : 0
}

/** ---------- Moralis helpers ---------- */
async function moralisGetTokens(chain: string, address: string) {
  // https://docs.moralis.io/web3-data-api/evm/reference/get-wallet-token-balances
  const url = `https://deep-index.moralis.io/api/v2.2/wallets/${address}/tokens?chain=${chain}`
  const res = await fetch(url, {
    headers: { "X-API-Key": MORALIS_KEY || "" },
  })
  if (!res.ok) throw new Error("Moralis token balances failed")
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { address, chainId } = (await req.json()) as PortfolioRequest
    if (!address || !chainId) {
      return new Response(JSON.stringify({ error: "address and chainId required" }), { status: 400 })
    }

    const meta = chainMeta(chainId)

    let tokens: TokenBalance[] = []
    let totalUsd = 0

    if (meta.alchemy) {
      const key = ALCHEMY_KEYS[meta.alchemy.name]
      if (!key) throw new Error(`Missing ALCHEMY_API_KEY for ${meta.alchemy.name}`)
      const baseUrl = meta.alchemy.url(key)

      const data = await alchemyGetTokens(baseUrl, address)
      const balances = (data?.tokenBalances || []) as any[]

      // Native balance as "0xeeee..." isn't included by getTokenBalances; fetch via core eth_getBalance is client-side in your hook.
      // Here we focus on ERC-20s.
      const out: TokenBalance[] = []
      for (const b of balances) {
        const raw = b.tokenBalance as string | undefined
        const meta = b.tokenMetadata || {}
        const decimals = Number(meta.decimals ?? 18)
        const symbol = meta.symbol || "TOKEN"
        const name = meta.name || symbol
        const addr = (meta.address || b.contractAddress || "").toLowerCase()
        if (!raw || !addr) continue

        // human amount
        const amount =
          decimals > 0 ? Number(BigInt(raw) / BigInt(10) ** BigInt(Math.min(decimals, 18))) +
            Number((BigInt(raw) % (BigInt(10) ** BigInt(Math.min(decimals, 18)))))/10**Math.min(decimals,18)
          : Number(raw)

        // price
        const price = await alchemyGetTokenPrice(baseUrl, addr).catch(() => 0)
        const usdValue = amount * (price || 0)

        out.push({
          address: addr,
          symbol,
          name,
          balance: amount.toString(),
          price: price || 0,
          usdValue,
        })
      }

      tokens = out.filter(t => isFinite(t.usdValue))
      totalUsd = tokens.reduce((a, t) => a + t.usdValue, 0)
    } else if (meta.moralis && MORALIS_KEY) {
      const data = await moralisGetTokens(meta.moralis.name, address)
      const out: TokenBalance[] = (data?.result || []).map((t: any) => {
        const decimals = Number(t.decimals ?? 18)
        const raw = t.balance as string
        const pow = 10 ** Math.min(decimals, 18)
        const amount = decimals > 0 ? Number(BigInt(raw) / BigInt(pow)) + Number((BigInt(raw) % BigInt(pow))) / pow : Number(raw)
        const price = typeof t.usdPrice === "number" ? t.usdPrice : 0
        const usdValue = amount * price
        return {
          address: (t.token_address || "").toLowerCase(),
          symbol: t.symbol || "TOKEN",
          name: t.name || t.symbol || "TOKEN",
          balance: amount.toString(),
          price,
          usdValue,
        }
      })
      tokens = out.filter(t => isFinite(t.usdValue))
      totalUsd = tokens.reduce((a, t) => a + t.usdValue, 0)
    } else {
      // No pricing provider available for this chain → return empty tokens (client still has native balance)
      tokens = []
      totalUsd = 0
    }

    const resp: PortfolioResponse = { tokens, totalUsd: Number(totalUsd.toFixed(2)) }
    return new Response(JSON.stringify(resp), { status: 200, headers: { "content-type": "application/json" } })
  } catch (e) {
    // Fail-safe: never crash UI
    return new Response(JSON.stringify({ tokens: [], totalUsd: 0 }), { status: 200, headers: { "content-type": "application/json" } })
  }
}
