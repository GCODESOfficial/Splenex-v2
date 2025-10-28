import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useSplenexSwapContract } from '../hooks/use-splenex-swap-contract';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, ArrowUpDown, Calculator, TrendingUp } from 'lucide-react';
import { debounce } from '@/lib/performance-optimizer';

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  dexName: string;
  swapData: string;
  gasEstimate: string;
  priceImpact: number;
}

interface SplenexSwapInterfaceProps {
  fromToken: Token | null;
  toToken: Token | null;
  fromAmount: string;
  onFromAmountChange: (amount: string) => void;
  onTokenChange: (field: 'from' | 'to', token: Token) => void;
  isConnected: boolean;
  walletAddress: string;
  getQuote: (request: any) => Promise<SwapQuote | null>;
}

export function SplenexSwapInterface({
  fromToken,
  toToken,
  fromAmount,
  onFromAmountChange,
  onTokenChange,
  isConnected,
  walletAddress,
  getQuote
}: SplenexSwapInterfaceProps) {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [taxInfo, setTaxInfo] = useState<{ taxAmount: string; netAmount: string; taxRate: number } | null>(null);
  const [supportedDEXes, setSupportedDEXes] = useState<string[]>([]);
  const [selectedDEX, setSelectedDEX] = useState<string>('');

  const {
    isLoading: isSwapLoading,
    error: swapError,
    calculateTax,
    getSupportedDEXes,
    executeTokenSwap,
    executeETHSwap,
    executeTokenToETHSwap,
    executeMultiHopSwap,
    contractAddress
  } = useSplenexSwapContract();

  // Load supported DEXes on mount
  useEffect(() => {
    const loadSupportedDEXes = async () => {
      try {
        const dexes = await getSupportedDEXes();
        setSupportedDEXes(dexes);
        if (dexes.length > 0) {
          setSelectedDEX(dexes[0]);
        }
      } catch (error) {
        console.error('Failed to load supported DEXes:', error);
      }
    };

    if (isConnected) {
      loadSupportedDEXes();
    }
  }, [isConnected, getSupportedDEXes]);

  // Calculate tax when amount changes
  useEffect(() => {
    const calculateTaxInfo = async () => {
      if (!fromAmount || !fromToken || fromAmount === '0') {
        setTaxInfo(null);
        return;
      }

      try {
        const amountInWei = ethers.utils.parseUnits(fromAmount, fromToken.decimals);
        const taxData = await calculateTax(amountInWei.toString());
        setTaxInfo(taxData);
      } catch (error) {
        console.error('Failed to calculate tax:', error);
        setTaxInfo(null);
      }
    };

    calculateTaxInfo();
  }, [fromAmount, fromToken, calculateTax]);

  // Optimized quote fetching with debouncing
  const getSwapQuote = useCallback(
    debounce(async () => {
      if (!fromToken || !toToken || !fromAmount || fromAmount === '0' || !selectedDEX) {
        setQuote(null);
        return;
      }

      setIsLoadingQuote(true);
      setQuoteError(null);

      try {
        const quoteRequest = {
          fromToken: fromToken.address,
          toToken: toToken.address,
          fromAmount: ethers.utils.parseUnits(fromAmount, fromToken.decimals).toString(),
          fromAddress: walletAddress,
          dexName: selectedDEX
        };

        const swapQuote = await getQuote(quoteRequest);
        if (swapQuote) {
          setQuote(swapQuote);
        } else {
          setQuoteError('No quote available for this token pair');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to get quote';
        setQuoteError(errorMessage);
        console.error('Quote error:', error);
      } finally {
        setIsLoadingQuote(false);
      }
    }, 300), // 300ms debounce for faster response
    [fromToken, toToken, fromAmount, walletAddress, selectedDEX, getQuote]
  );

  // Get quote when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      getSwapQuote();
    }, 500); // Debounce

    return () => clearTimeout(timeoutId);
  }, [getSwapQuote]);

  const handleSwap = async () => {
    if (!quote || !fromToken || !toToken || !walletAddress) {
      return;
    }

    try {
      let txHash: string | null = null;

      if (fromToken.address === ethers.constants.AddressZero) {
        // ETH to Token swap
        txHash = await executeETHSwap({
          tokenOut: toToken.address,
          minAmountOut: quote.toAmount,
          dexName: quote.dexName,
          swapData: quote.swapData,
          userAddress: walletAddress,
          value: quote.fromAmount
        });
      } else if (toToken.address === ethers.constants.AddressZero) {
        // Token to ETH swap
        txHash = await executeTokenToETHSwap({
          tokenIn: fromToken.address,
          amountIn: quote.fromAmount,
          minAmountOut: quote.toAmount,
          dexName: quote.dexName,
          swapData: quote.swapData,
          userAddress: walletAddress
        });
      } else {
        // Token to Token swap
        txHash = await executeTokenSwap({
          tokenIn: fromToken.address,
          tokenOut: toToken.address,
          amountIn: quote.fromAmount,
          minAmountOut: quote.toAmount,
          dexName: quote.dexName,
          swapData: quote.swapData,
          userAddress: walletAddress
        });
      }

      if (txHash) {
        console.log('Swap completed successfully:', txHash);
        
        // Log swap analytics to database
        try {
          const fromAmountNum = Number.parseFloat(fromAmount);
          const toAmountNum = Number.parseFloat(quote.toAmount);
          
          // Calculate USD value (simplified - you might want to use the centralized function)
          let usdValue = 0;
          if (fromToken.symbol === 'USDT' || fromToken.symbol === 'USDC' || fromToken.symbol === 'DAI') {
            usdValue = fromAmountNum;
          } else {
            // For other tokens, use a rough estimate or fetch price
            usdValue = fromAmountNum * 0.5; // Placeholder - should use price API
          }
          
          const swapData = {
            timestamp: new Date().toISOString(),
            from_token: fromToken.symbol,
            to_token: toToken.symbol,
            from_amount: fromAmountNum.toString(),
            to_amount: toAmountNum.toString(),
            from_chain: fromToken.chainId || 1,
            to_chain: toToken.chainId || 1,
            swap_volume_usd: usdValue,
            wallet_address: walletAddress,
            tx_hash: txHash,
            gas_fee_revenue: 0, // Contract handles this differently
            original_gas_fee: 0,
            total_gas_fee: 0,
            additional_charge: 0,
            from_chain_id: fromToken.chainId || 1,
            to_chain_id: toToken.chainId || 1,
          };
          
          const { logSwapAnalytics } = await import('@/lib/swapAnalytics');
          const success = await logSwapAnalytics(swapData);
          
          if (success) {
            console.log(`[SplenexSwap] ✅ Swap analytics logged successfully: $${usdValue.toFixed(2)} USD`);
          } else {
            console.error(`[SplenexSwap] ❌ Failed to log swap analytics to database`);
          }
        } catch (analyticsError) {
          console.error('[SplenexSwap] Error logging swap analytics:', analyticsError);
        }
        
        // Reset form or show success message
        onFromAmountChange('0');
        setQuote(null);
      }
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const formatAmount = (amount: string, decimals: number) => {
    try {
      return ethers.utils.formatUnits(amount, decimals);
    } catch {
      return '0';
    }
  };

  const isSwapDisabled = !isConnected || !quote || !fromToken || !toToken || !fromAmount || fromAmount === '0' || isSwapLoading;

  return (
    <div className="space-y-6">
      {/* Contract Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Splenex Advanced Swap Contract
          </CardTitle>
          <CardDescription>
            Automatic tax collection with DEX integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Contract Address:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {contractAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : 'Not deployed'}
              </code>
            </div>
            {taxInfo && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax Rate:</span>
                <Badge variant="secondary">{taxInfo.taxRate}%</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tax Information */}
      {taxInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Tax Calculation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Input Amount:</span>
                <span className="font-medium">{fromAmount} {fromToken?.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax Amount:</span>
                <span className="font-medium text-red-600">{taxInfo.taxAmount} {fromToken?.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Net Amount:</span>
                <span className="font-medium text-green-600">{taxInfo.netAmount} {fromToken?.symbol}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DEX Selection */}
      <Card>
        <CardHeader>
          <CardTitle>DEX Selection</CardTitle>
          <CardDescription>Choose the DEX for your swap</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedDEX} onValueChange={setSelectedDEX}>
            <SelectTrigger>
              <SelectValue placeholder="Select a DEX" />
            </SelectTrigger>
            <SelectContent>
              {supportedDEXes.map((dex) => (
                <SelectItem key={dex} value={dex}>
                  {dex}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Swap Interface */}
      <Card>
        <CardHeader>
          <CardTitle>Swap Tokens</CardTitle>
          <CardDescription>Execute swaps with automatic tax collection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">From</label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.0"
                value={fromAmount}
                onChange={(e) => onFromAmountChange(e.target.value)}
                disabled={!isConnected}
              />
              <Select
                value={fromToken?.address || ''}
                onValueChange={(value) => {
                  const token = { address: value, symbol: 'ETH', name: 'Ethereum', decimals: 18 };
                  onTokenChange('from', token);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ethers.constants.AddressZero}>ETH</SelectItem>
                  {/* Add more tokens as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (fromToken && toToken) {
                  onTokenChange('from', toToken);
                  onTokenChange('to', fromToken);
                }
              }}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <label className="text-sm font-medium">To</label>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="0.0"
                value={quote ? formatAmount(quote.toAmount, toToken?.decimals || 18) : '0'}
                disabled
              />
              <Select
                value={toToken?.address || ''}
                onValueChange={(value) => {
                  const token = { address: value, symbol: 'USDT', name: 'Tether USD', decimals: 6 };
                  onTokenChange('to', token);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Token" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0xA0b86a33E6441b8C4C8C0C4F8eB1f8eB1f8eB1f8">USDT</SelectItem>
                  {/* Add more tokens as needed */}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quote Information */}
          {isLoadingQuote && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Getting quote...</span>
            </div>
          )}

          {quoteError && (
            <Alert variant="destructive">
              <AlertDescription>{quoteError}</AlertDescription>
            </Alert>
          )}

          {quote && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DEX:</span>
                <Badge variant="outline">{quote.dexName}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Price Impact:</span>
                <span className={`text-sm ${quote.priceImpact > 5 ? 'text-red-600' : 'text-green-600'}`}>
                  {quote.priceImpact.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estimated Gas:</span>
                <span className="text-sm">{quote.gasEstimate}</span>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={isSwapDisabled}
            className="w-full"
            size="lg"
          >
            {isSwapLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            ) : (
              'Swap with Tax Collection'
            )}
          </Button>

          {swapError && (
            <Alert variant="destructive">
              <AlertDescription>{swapError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
