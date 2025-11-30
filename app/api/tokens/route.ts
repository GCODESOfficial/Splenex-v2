/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { moralisService } from '@/lib/moralis-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('address')
    const chain = searchParams.get('chain')

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    if (!chain) {
      return NextResponse.json(
        { success: false, error: 'Chain is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Use Moralis service to fetch token balances
    // Moralis service already filters for verified tokens with balance > 0
    const tokenBalances = await moralisService.getTokenBalances(walletAddress, chain)

    // Additional client-side filtering to ensure only tokens with actual balance
    const tokensWithBalance = tokenBalances.filter((token) => {
      const balance = parseFloat(token.balance || '0')
      // Only include tokens with balance > 0 (filter out any edge cases)
      return balance > 0.00000001
    })

    // Convert to the format expected by the client
    const result = tokensWithBalance.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      balance: token.balance,
      usdValue: token.usdValue,
      price: token.price,
      token_address: token.address,
      contract_address: token.address,
      decimals: token.decimals,
      logo: token.logoUrl,
      chain: token.chain,
      chainId: token.chainId,
      isNative: token.isNative,
    }))

    return NextResponse.json({
      success: true,
      result: result,
    })
  } catch (error: any) {
    console.error('[API /tokens] Error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Handle specific Moralis errors
    if (errorMessage.includes('API key not configured')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Moralis API key not configured. Please set MORALIS_API_KEY in your .env file.',
          result: []
        },
        { status: 500 }
      )
    }

    if (errorMessage.includes('rate limit')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Moralis API rate limit exceeded. Please try again later.',
          result: []
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        result: []
      },
      { status: 500 }
    )
  }
}

