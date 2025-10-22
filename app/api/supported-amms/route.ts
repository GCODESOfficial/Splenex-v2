import { NextResponse } from "next/server"

export async function GET() {
  try {
    const amms = await getSupportedAMMs()

    return NextResponse.json(amms)
  } catch (error) {
    console.error("[v0] Failed to fetch supported AMMs:", error)
    return NextResponse.json({ error: "Failed to fetch AMMs" }, { status: 500 })
  }
}

async function getSupportedAMMs() {
  try {
    // Fetch real-time supported DEXs and bridges from LiFi
    const response = await fetch("https://li.quest/v1/tools", {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`LiFi API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract DEXs (exchanges) and Bridges
    const dexs = data.exchanges || [];
    const bridges = data.bridges || [];

    // Combine and format AMMs
    const formattedAMMs = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...dexs.map((dex: any) => ({
        name: dex.name,
        key: dex.key,
        logo: dex.logoURI,
        isActive: true,
        type: "DEX",
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...bridges.map((bridge: any) => ({
        name: bridge.name,
        key: bridge.key,
        logo: bridge.logoURI,
        isActive: true,
        type: "Bridge",
      })),
    ];

    console.log(`[AMM] Fetched ${formattedAMMs.length} AMMs/DEXs from LiFi`);
    return formattedAMMs;
  } catch (error) {
    console.error("[AMM] Error fetching from LiFi, using fallback list:", error);
    
    // Fallback to comprehensive hardcoded list if API fails
    const fallbackAMMs = [
      { name: "Uniswap V2", key: "uniswap-v2", isActive: true, type: "DEX" },
      { name: "Uniswap V3", key: "uniswap-v3", isActive: true, type: "DEX" },
      { name: "PancakeSwap V2", key: "pancakeswap-v2", isActive: true, type: "DEX" },
      { name: "PancakeSwap V3", key: "pancakeswap-v3", isActive: true, type: "DEX" },
      { name: "SushiSwap", key: "sushiswap", isActive: true, type: "DEX" },
      { name: "Curve", key: "curve", isActive: true, type: "DEX" },
      { name: "Balancer", key: "balancer", isActive: true, type: "DEX" },
      { name: "1inch", key: "1inch", isActive: true, type: "DEX Aggregator" },
      { name: "Kyber", key: "kyber", isActive: true, type: "DEX" },
      { name: "Quickswap", key: "quickswap", isActive: true, type: "DEX" },
      { name: "Trader Joe", key: "traderjoe", isActive: true, type: "DEX" },
      { name: "SpookySwap", key: "spookyswap", isActive: true, type: "DEX" },
      { name: "Raydium", key: "raydium", isActive: true, type: "DEX" },
      { name: "Orca", key: "orca", isActive: true, type: "DEX" },
      { name: "DODO", key: "dodo", isActive: true, type: "DEX" },
      { name: "Bancor", key: "bancor", isActive: true, type: "DEX" },
      { name: "Velodrome", key: "velodrome", isActive: true, type: "DEX" },
      { name: "Camelot", key: "camelot", isActive: true, type: "DEX" },
      { name: "Maverick", key: "maverick", isActive: true, type: "DEX" },
      { name: "GMX", key: "gmx", isActive: true, type: "DEX" },
      { name: "Zyberswap", key: "zyberswap", isActive: true, type: "DEX" },
      { name: "Beethoven X", key: "beethoven", isActive: true, type: "DEX" },
      { name: "WooFi", key: "woofi", isActive: true, type: "DEX" },
      { name: "Solidly", key: "solidly", isActive: true, type: "DEX" },
      { name: "Aerodrome", key: "aerodrome", isActive: true, type: "DEX" },
      { name: "BaseSwap", key: "baseswap", isActive: true, type: "DEX" },
      { name: "SyncSwap", key: "syncswap", isActive: true, type: "DEX" },
      { name: "Mute", key: "mute", isActive: true, type: "DEX" },
      { name: "Stargate", key: "stargate", isActive: true, type: "Bridge" },
      { name: "Hop Protocol", key: "hop", isActive: true, type: "Bridge" },
      { name: "Connext", key: "connext", isActive: true, type: "Bridge" },
      { name: "Across", key: "across", isActive: true, type: "Bridge" },
      { name: "Celer cBridge", key: "celer", isActive: true, type: "Bridge" },
      { name: "Multichain", key: "multichain", isActive: true, type: "Bridge" },
      { name: "Synapse", key: "synapse", isActive: true, type: "Bridge" },
      { name: "Wormhole", key: "wormhole", isActive: true, type: "Bridge" },
      { name: "Axelar", key: "axelar", isActive: true, type: "Bridge" },
      { name: "LayerZero", key: "layerzero", isActive: true, type: "Bridge" },
    ];

    return fallbackAMMs;
  }
}
