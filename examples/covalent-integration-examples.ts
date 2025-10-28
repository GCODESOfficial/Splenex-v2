import { covalentProvider } from '../lib/token-providers'
import { ComprehensiveTokenDetector } from '../lib/comprehensive-token-detector'

/**
 * Example usage of Covalent API integration
 */

// Example 1: Using Covalent provider directly
async function exampleDirectCovalent() {
  console.log('🔍 Example 1: Direct Covalent Provider Usage')
  
  const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' // Vitalik's address
  const chain = 'eth'
  
  try {
    const tokens = await covalentProvider.fetchTokens(address, chain)
    console.log(`✅ Found ${tokens.length} tokens using Covalent provider`)
    
    tokens.forEach(token => {
      console.log(`- ${token.contract_ticker_symbol}: ${token.balance} ($${token.quote})`)
    })
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Example 2: Using comprehensive token detector (includes Covalent)
async function exampleComprehensiveDetection() {
  console.log('\n🔍 Example 2: Comprehensive Token Detection')
  
  const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const chain = 'eth'
  
  try {
    const detector = new ComprehensiveTokenDetector()
    const result = await detector.detectAllTokens(address, chain)
    
    console.log(`✅ Detection complete:`)
    console.log(`- Total tokens: ${result.tokens.length}`)
    console.log(`- Total USD value: $${result.totalUsdValue.toFixed(2)}`)
    console.log(`- Detection methods: ${result.detectionMethods.join(', ')}`)
    
    if (result.errors.length > 0) {
      console.log(`- Errors: ${result.errors.join(', ')}`)
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Example 3: Using the API route
async function exampleAPIRoute() {
  console.log('\n🔍 Example 3: API Route Usage')
  
  const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const chain = 'eth'
  
  try {
    // Direct Covalent API route
    const covalentResponse = await fetch(`/api/covalent-balances?address=${address}&chain=${chain}`)
    const covalentData = await covalentResponse.json()
    
    console.log(`✅ Covalent API route returned ${covalentData.data?.items?.length || 0} tokens`)
    
    // Fallback tokens API route (tries Moralis first, then Covalent)
    const tokensResponse = await fetch(`/api/tokens?address=${address}&chain=${chain}`)
    const tokensData = await tokensResponse.json()
    
    console.log(`✅ Tokens API route returned ${tokensData.result?.length || 0} tokens`)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Example 4: Multi-chain support
async function exampleMultiChain() {
  console.log('\n🔍 Example 4: Multi-chain Support')
  
  const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
  const chains = ['eth', 'polygon', 'arbitrum', 'optimism']
  
  for (const chain of chains) {
    try {
      console.log(`\n📡 Checking ${chain} chain...`)
      const tokens = await covalentProvider.fetchTokens(address, chain)
      console.log(`✅ ${chain}: Found ${tokens.length} tokens`)
      
      if (tokens.length > 0) {
        const totalValue = tokens.reduce((sum, token) => sum + (token.quote || 0), 0)
        console.log(`💰 ${chain}: Total value $${totalValue.toFixed(2)}`)
      }
    } catch (error) {
      console.log(`❌ ${chain}: Error - ${error.message}`)
    }
  }
}

// Example 5: Error handling and fallbacks
async function exampleErrorHandling() {
  console.log('\n🔍 Example 5: Error Handling')
  
  const invalidAddress = '0xinvalid'
  const chain = 'eth'
  
  try {
    const tokens = await covalentProvider.fetchTokens(invalidAddress, chain)
    console.log(`✅ Error handling: ${tokens.length} tokens (should be 0)`)
  } catch (error) {
    console.log(`✅ Error handling: Caught error - ${error.message}`)
  }
}

// Run all examples
async function runAllExamples() {
  console.log('🚀 Covalent Integration Examples')
  console.log('================================')
  
  await exampleDirectCovalent()
  await exampleComprehensiveDetection()
  await exampleAPIRoute()
  await exampleMultiChain()
  await exampleErrorHandling()
  
  console.log('\n✅ All examples completed!')
}

// Export for use in other files
export {
  exampleDirectCovalent,
  exampleComprehensiveDetection,
  exampleAPIRoute,
  exampleMultiChain,
  exampleErrorHandling,
  runAllExamples
}

// Run examples if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runAllExamples().catch(console.error)
}

