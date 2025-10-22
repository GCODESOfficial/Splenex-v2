"use client";

import { useWallet } from "@/hooks/use-wallet";
import { SimpleNavbar } from "@/components/simple-navbar";
import { Wallet, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function PortfolioPage() {
  const { 
    isConnected, 
    address, 
    tokenBalances, 
    totalUsdBalance,
    refreshBalances 
  } = useWallet();

  if (!isConnected) {
    return (
      <>
        <SimpleNavbar />
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <div className="text-center">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h2 className="text-2xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400">Connect your wallet to view your portfolio</p>
          </div>
        </div>
      </>
    );
  }

  // Group tokens by chain
  const tokensByChain = tokenBalances.reduce((acc: any, token) => {
    const chain = token.chain || "Unknown";
    if (!acc[chain]) {
      acc[chain] = [];
    }
    acc[chain].push(token);
    return acc;
  }, {});

  // Calculate percentage for each token
  const tokensWithPercent = tokenBalances.map(token => ({
    ...token,
    percentage: totalUsdBalance > 0 ? (token.usdValue / totalUsdBalance) * 100 : 0,
  }));

  return (
    <>
      <SimpleNavbar />
      <div className="bg-black text-white min-h-screen px-4 md:px-12 py-10 pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Portfolio</h1>
            <p className="text-gray-400 text-sm">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
          <Button
            onClick={refreshBalances}
            variant="outline"
            className="border-yellow-400 text-yellow-400 hover:bg-yellow-400/10 rounded-none"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-[#0C0C0C] border border-yellow-400/30 p-8 mb-8 text-center">
          <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
          <p className="text-4xl md:text-5xl font-bold text-yellow-400">
            ${totalUsdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-gray-500 text-xs mt-2">Across {Object.keys(tokensByChain).length} networks</p>
        </div>

        {/* Holdings by Chain */}
        <div className="space-y-6">
          {Object.entries(tokensByChain).map(([chain, tokens]: [string, any]) => {
            const chainTotal = tokens.reduce((sum: number, t: any) => sum + t.usdValue, 0);
            
            return (
              <div key={chain} className="bg-[#0C0C0C] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-yellow-400">{chain}</h3>
                  <span className="text-gray-400 text-sm">
                    ${chainTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="space-y-3">
                  {tokens.map((token: any, index: number) => (
                    <div
                      key={`${token.address}-${index}`}
                      className="flex items-center justify-between p-3 bg-[#1F1F1F] hover:bg-[#252525] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                          <span className="text-lg">{token.symbol.slice(0, 1)}</span>
                        </div>
                        <div>
                          <div className="text-white font-medium">{token.symbol}</div>
                          <div className="text-gray-400 text-xs">{token.name}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-white font-semibold">
                          {parseFloat(token.balance).toLocaleString(undefined, { maximumFractionDigits: 6 })} {token.symbol}
                        </div>
                        <div className="text-gray-400 text-sm">
                          ${token.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-yellow-400 text-xs">
                          {((token.usdValue / totalUsdBalance) * 100).toFixed(2)}% of portfolio
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No holdings message */}
        {tokenBalances.length === 0 && (
          <div className="bg-[#0C0C0C] border border-gray-800 p-12 text-center">
            <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-600" />
            <h3 className="text-xl font-semibold mb-2">No Assets Found</h3>
            <p className="text-gray-400 text-sm">
              We couldn't find any tokens in your wallet. Try refreshing or check your connection.
            </p>
          </div>
        )}
      </div>
    </>
  );
}


