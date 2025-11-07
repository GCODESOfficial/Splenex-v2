/**
 * Server-side test script for Moralis balance fetching
 * 
 * Usage:
 *   npx tsx test-moralis-server.ts
 * 
 * This will test with the wallet: 0xb827487001633584f38a076fb758deecdfdcfafe
 */

import dotenv from "dotenv"
import { resolve } from "path"

// Load environment variables FIRST before importing anything else
dotenv.config({ path: resolve(process.cwd(), ".env.local") })
dotenv.config({ path: resolve(process.cwd(), ".env") })

// Now import after env vars are loaded
import { moralisService } from "./lib/moralis-service"

async function testMoralis() {
  const walletAddress = "0xb827487001633584f38a076fb758deecdfdcfafe"
  
  // Test multiple chains to find all tokens
  const chainsToTest = ["eth", "bsc", "polygon", "arbitrum", "optimism", "base", "avalanche", "fantom"]
  
  console.log("\n" + "=".repeat(80))
  console.log("🧪 Testing Moralis Balance Fetching (Server-Side)")
  console.log("=".repeat(80))
  console.log(`📍 Wallet: ${walletAddress}`)
  console.log(`🔗 Testing ${chainsToTest.length} chains: ${chainsToTest.join(", ")}`)
  console.log("=".repeat(80))
  
  // Check API key
  const apiKey = process.env.MORALIS_API_KEY
  if (!apiKey) {
    console.error("\n❌ MORALIS_API_KEY not found in environment variables")
    console.error("   Please set it in .env.local or .env file")
    process.exit(1)
  }
  
  console.log(`✅ Moralis API key configured (${apiKey.substring(0, 8)}...)`)
  console.log("=".repeat(80))
  console.log()
  
  try {
    const allTokensAcrossChains: any[] = []
    
    // Test each chain
    for (const chainName of chainsToTest) {
      console.log(`\n${"=".repeat(80)}`)
      console.log(`🔗 Testing chain: ${chainName.toUpperCase()}`)
      console.log("=".repeat(80))
      console.log()
      
      const moralisChain = chainName.toLowerCase()
    
    let allTokens: any[] = []
    let cursor: string | undefined = undefined
    let page = 1
    const pageSize = 100
    
    console.log(`[Direct] Fetching all tokens with pagination...`)
    console.log()
    
    do {
      // Try without spam filter to get ALL tokens including possible spam
      let url = `https://deep-index.moralis.io/api/v2.2/wallets/${walletAddress}/tokens?chain=${moralisChain}&limit=${pageSize}&exclude_spam=false`
      if (cursor) {
        url += `&cursor=${cursor}`
      }
      
      console.log(`[Direct] 📄 Page ${page}: ${url}`)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        }
      })
      
      console.log(`[Direct] Response status: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Direct] ❌ API request failed: ${response.status}`)
        console.error(`[Direct] Error: ${errorText}`)
        throw new Error(`Moralis API failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.result && data.result.length > 0) {
        allTokens.push(...data.result)
        console.log(`[Direct] ✅ Page ${page}: ${data.result.length} tokens (Total: ${allTokens.length})`)
        console.log(`[Direct] Total in API: ${data.total || 'N/A'}`)
        console.log(`[Direct] Has cursor: ${!!data.cursor}`)
      }
      
      cursor = data.cursor
      page++
      
      if (!cursor || data.result?.length === 0) {
        break
      }
      
      console.log()
      } while (cursor)
      
      console.log()
      console.log(`[Direct] ✅ ${chainName.toUpperCase()}: ${allTokens.length} total tokens from ${page - 1} page(s)`)
      
      if (allTokens.length > 0) {
        // Add chain info to tokens
        allTokens.forEach((token: any) => {
          token.chain = chainName
          allTokensAcrossChains.push(token)
        })
        
        console.log(`[Direct] 📋 Tokens on ${chainName.toUpperCase()}:`)
        allTokens.forEach((token: any, index: number) => {
          console.log(`   ${index + 1}. ${token.symbol} - ${token.name} ($${token.usd_value?.toFixed(2) || 0})`)
        })
      } else {
        console.log(`[Direct] ⚠️  No tokens on ${chainName.toUpperCase()}`)
      }
    }
    
    console.log()
    console.log("=".repeat(80))
    console.log(`📊 TOTAL ACROSS ALL CHAINS: ${allTokensAcrossChains.length} tokens`)
    console.log("=".repeat(80))
    console.log()
    
    if (allTokensAcrossChains.length === 0) {
      console.log("⚠️  No tokens found across any chain")
      return
    }
    
    // Process all tokens
    const startTime = Date.now()
    
    // Convert raw tokens using service logic
    const tokens = allTokensAcrossChains.map((token: any) => {
      const decimals = Number(token.decimals) || 18
      
      // Use formatted balance if available, otherwise calculate
      let balance: number
      if (token.balance_formatted) {
        balance = parseFloat(token.balance_formatted)
      } else {
        const rawBalance = BigInt(token.balance || '0')
        const divisor = BigInt(10 ** Math.min(decimals, 18))
        const quotient = rawBalance / divisor
        const remainder = rawBalance % divisor
        balance = Number(quotient) + Number(remainder) / Number(divisor)
      }
      
      return {
        symbol: token.symbol || 'Unknown',
        name: token.name || 'Unknown Token',
        balance: balance.toString(),
        usdValue: token.usd_value || 0,
        price: token.usd_price || 0,
        address: token.token_address,
        chain: token.chain || chainName,
        chainId: token.chain === 'eth' ? '0x1' : 
                token.chain === 'bsc' ? '0x38' :
                token.chain === 'polygon' ? '0x89' :
                token.chain === 'arbitrum' ? '0xa4b1' :
                token.chain === 'optimism' ? '0xa' :
                token.chain === 'base' ? '0x2105' :
                token.chain === 'avalanche' ? '0xa86a' :
                token.chain === 'fantom' ? '0xfa' : '0x1',
        decimals: decimals,
        logoUrl: token.thumbnail || token.logo,
        isNative: token.native_token || false
      }
    }).filter((token: any) => parseFloat(token.balance) > 0)
    
    const duration = Date.now() - startTime
    
    console.log()
    console.log("=".repeat(80))
    console.log("📊 Results")
    console.log("=".repeat(80))
    console.log(`⏱️  Fetch completed in ${duration}ms`)
    console.log(`📊 Found ${tokens.length} tokens\n`)
    
    if (tokens.length === 0) {
      console.log("⚠️  No tokens found")
      console.log()
      console.log("Possible reasons:")
      console.log("  - Wallet has no tokens on this chain")
      console.log("  - All tokens have zero balance")
      console.log("  - API returned empty result")
      process.exit(0)
    }
    
    console.log("📋 Token Details:")
    console.log("-".repeat(80))
    
    tokens.forEach((token, index) => {
      console.log(`${index + 1}. ${token.symbol.padEnd(15)} ${token.name}`)
      console.log(`   Balance:  ${parseFloat(token.balance).toFixed(10).padStart(15)}`)
      console.log(`   Address:  ${token.address}`)
      console.log(`   Decimals: ${token.decimals}`)
      console.log(`   Chain:    ${token.chain}`)
      console.log(`   ChainId:  ${token.chainId}`)
      console.log(`   Logo:     ${token.logoUrl || 'N/A'}`)
      console.log(`   USD:      $${token.usdValue.toFixed(2)}`)
      console.log(`   Price:    $${token.price.toFixed(6)}`)
      console.log()
    })
    
    console.log("-".repeat(80))
    
    // Summary
    const totalBalance = tokens.reduce((sum, t) => sum + parseFloat(t.balance), 0)
    const tokensWithLogo = tokens.filter(t => t.logoUrl).length
    
    console.log("📈 Summary:")
    console.log(`   Total tokens:        ${tokens.length}`)
    console.log(`   Tokens with logo:    ${tokensWithLogo}`)
    console.log(`   Total balance:       ${totalBalance.toFixed(6)}`)
    console.log()
    
    console.log("=".repeat(80))
    console.log("✅ Test completed successfully!")
    console.log("=".repeat(80))
    console.log()
    
  } catch (error) {
    console.error()
    console.error("=".repeat(80))
    console.error("❌ Error occurred")
    console.error("=".repeat(80))
    
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
      console.error()
      console.error("Stack trace:")
      console.error(error.stack)
    } else {
      console.error("Unknown error:", error)
    }
    
    process.exit(1)
  }
}

testMoralis()

