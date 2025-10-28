/**
 * Address-Neutral Swap Interface Demo
 * 
 * This component demonstrates how to use the address-neutral quote system
 * that treats all token addresses equally without making assumptions.
 */

"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddressNeutralQuote, AddressNeutralToken, createAddressNeutralQuoteRequest, formatQuoteOutput } from '@/hooks/use-address-neutral-quote';

// Example tokens with various address types
const EXAMPLE_TOKENS: AddressNeutralToken[] = [
  // Native tokens
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "0x0000000000000000000000000000000000000000", // Native ETH
    chainId: 1,
    chainName: "Ethereum",
    decimals: 18,
  },
  {
    symbol: "BNB",
    name: "Binance Coin",
    address: "0x0000000000000000000000000000000000000000", // Native BNB
    chainId: 56,
    chainName: "BSC",
    decimals: 18,
  },
  {
    symbol: "MATIC",
    name: "Polygon",
    address: "0x0000000000000000000000000000000000000000", // Native MATIC
    chainId: 137,
    chainName: "Polygon",
    decimals: 18,
  },
  
  // ERC20 tokens
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // ERC20 USDC
    chainId: 1,
    chainName: "Ethereum",
    decimals: 6,
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", // ERC20 USDT
    chainId: 1,
    chainName: "Ethereum",
    decimals: 6,
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // ERC20 WETH
    chainId: 1,
    chainName: "Ethereum",
    decimals: 18,
  },
  
  // Custom/unknown tokens
  {
    symbol: "CUSTOM",
    name: "Custom Token",
    address: "0x1234567890abcdef1234567890abcdef12345678", // Custom address
    chainId: 1,
    chainName: "Ethereum",
    decimals: 18,
  },
  {
    symbol: "UNKNOWN",
    name: "Unknown Token",
    address: "0xabcdef1234567890abcdef1234567890abcdef12", // Unknown address
    chainId: 1,
    chainName: "Ethereum",
    decimals: 18,
  },
];

export function AddressNeutralSwapDemo() {
  const [fromToken, setFromToken] = useState<AddressNeutralToken>(EXAMPLE_TOKENS[0]);
  const [toToken, setToToken] = useState<AddressNeutralToken>(EXAMPLE_TOKENS[3]);
  const [fromAmount, setFromAmount] = useState("1.0");
  const [fromAddress] = useState("0x1234567890abcdef1234567890abcdef12345678");
  
  const { getQuote, executeSwap, isLoading, quote, error, clearQuote } = useAddressNeutralQuote();

  const handleGetQuote = async () => {
    console.log('🔄 Getting quote with address-neutral approach');
    console.log(`From: ${fromToken.symbol} (${fromToken.address})`);
    console.log(`To: ${toToken.symbol} (${toToken.address})`);
    console.log(`Amount: ${fromAmount}`);
    
    const request = createAddressNeutralQuoteRequest(
      fromToken,
      toToken,
      fromAmount,
      fromAddress
    );
    
    await getQuote(request);
  };

  const handleExecuteSwap = async () => {
    if (!quote) return;
    
    console.log('🚀 Executing swap with address-neutral approach');
    console.log(`Provider: ${quote.provider}`);
    console.log(`Output: ${quote.toAmount}`);
    
    await executeSwap(quote, fromAddress);
  };

  const handleTokenChange = (tokenType: 'from' | 'to', token: AddressNeutralToken) => {
    if (tokenType === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
    clearQuote(); // Clear previous quote when tokens change
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Address-Neutral Swap Demo</h1>
        <p className="text-gray-600">
          This demo shows how the quote system treats all token addresses equally,
          without making assumptions about whether they're native or ERC20 tokens.
        </p>
      </div>

      {/* Token Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">From Token</label>
          <select
            value={fromToken.address}
            onChange={(e) => {
              const token = EXAMPLE_TOKENS.find(t => t.address === e.target.value);
              if (token) handleTokenChange('from', token);
            }}
            className="w-full p-2 border rounded-md"
          >
            {EXAMPLE_TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.address.slice(0, 10)}...
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            <strong>Address:</strong> {fromToken.address}
            <br />
            <strong>Type:</strong> {fromToken.address === "0x0000000000000000000000000000000000000000" ? "Native" : "Contract"}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">To Token</label>
          <select
            value={toToken.address}
            onChange={(e) => {
              const token = EXAMPLE_TOKENS.find(t => t.address === e.target.value);
              if (token) handleTokenChange('to', token);
            }}
            className="w-full p-2 border rounded-md"
          >
            {EXAMPLE_TOKENS.map((token) => (
              <option key={token.address} value={token.address}>
                {token.symbol} - {token.address.slice(0, 10)}...
              </option>
            ))}
          </select>
          <div className="text-xs text-gray-500">
            <strong>Address:</strong> {toToken.address}
            <br />
            <strong>Type:</strong> {toToken.address === "0x0000000000000000000000000000000000000000" ? "Native" : "Contract"}
          </div>
        </div>
      </div>

      {/* Amount Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Amount</label>
        <Input
          type="number"
          value={fromAmount}
          onChange={(e) => {
            setFromAmount(e.target.value);
            clearQuote(); // Clear quote when amount changes
          }}
          placeholder="Enter amount"
          className="w-full"
        />
      </div>

      {/* Quote Button */}
      <Button
        onClick={handleGetQuote}
        disabled={isLoading || !fromAmount || parseFloat(fromAmount) <= 0}
        className="w-full"
      >
        {isLoading ? "Getting Quote..." : "Get Quote"}
      </Button>

      {/* Quote Display */}
      {quote && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="font-semibold text-green-800 mb-2">Quote Received</h3>
          <div className="space-y-1 text-sm">
            <div><strong>Provider:</strong> {quote.provider}</div>
            <div><strong>Output Amount:</strong> {formatQuoteOutput(quote, toToken.decimals)} {toToken.symbol}</div>
            <div><strong>Price Impact:</strong> {quote.priceImpact || 0}%</div>
            <div><strong>Gas Estimate:</strong> {quote.estimatedGas}</div>
            {quote.path && (
              <div><strong>Path:</strong> {quote.path.join(' → ')}</div>
            )}
          </div>
          
          <Button
            onClick={handleExecuteSwap}
            disabled={isLoading}
            className="mt-3 w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? "Executing..." : "Execute Swap"}
          </Button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <h3 className="font-semibold text-red-800 mb-2">Error</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Explanation */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold text-blue-800 mb-2">How This Works</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <p>• <strong>Address-Neutral:</strong> All token addresses are treated equally</p>
          <p>• <strong>No Assumptions:</strong> System doesn't assume native vs ERC20</p>
          <p>• <strong>Aggregator Handles:</strong> External aggregators interpret addresses</p>
          <p>• <strong>Universal:</strong> Works with any token address format</p>
          <p>• <strong>Flexible:</strong> Supports custom and unknown tokens</p>
        </div>
      </div>

      {/* Console Log */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h3 className="font-semibold text-gray-800 mb-2">Console Output</h3>
        <p className="text-sm text-gray-600">
          Check the browser console to see the address-neutral processing logs.
          The system logs all addresses without making type assumptions.
        </p>
      </div>
    </div>
  );
}

export default AddressNeutralSwapDemo;
