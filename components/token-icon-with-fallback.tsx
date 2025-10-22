/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";

interface TokenIconWithFallbackProps {
  symbol: string;
  address: string;
  chainId: number;
  chainName?: string;
  tokenId?: string;
  logoURI?: string;
  className?: string;
  size?: number;
}

/**
 * Optimized TokenIcon with Instant Fallback
 * Shows badge immediately, loads logo in background for smooth UX
 */
export function TokenIconWithFallback({
  symbol,
  address,
  chainId,
  chainName,
  tokenId,
  logoURI,
  className = "w-8 h-8 rounded-full",
  size = 32,
}: TokenIconWithFallbackProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Start as loading

  // Get best logo URL - OPTIMIZED for all chains including Base
  const getBestLogoURL = (): string | null => {
    // Priority 1: CoinGecko logoURI (if provided from API - REAL CoinGecko logo!)
    if (logoURI) {
      return logoURI;
    }

    // Priority 2: For well-known tokens, use cryptocurrency-icons (FASTEST & MOST RELIABLE)
    const cryptoIconMap: { [key: string]: string } = {
      "ETH": "eth", "WETH": "eth", "BTC": "btc", "WBTC": "btc", 
      "USDT": "usdt", "USDC": "usdc", "DAI": "dai", "BUSD": "busd",
      "LINK": "link", "UNI": "uni", "AAVE": "aave", "MATIC": "matic",
      "BNB": "bnb", "AVAX": "avax", "SOL": "sol", "DOT": "dot", "ATOM": "atom",
      "ADA": "ada", "XRP": "xrp", "DOGE": "doge", "SHIB": "shib", "LTC": "ltc",
      "CRO": "cro", "FTM": "ftm", "ALGO": "algo", "XLM": "xlm", "NEAR": "near",
      "SUSHI": "sushi", "COMP": "comp", "MKR": "mkr", "SNX": "snx", "YFI": "yfi",
    };

    const cryptoIcon = cryptoIconMap[symbol];
    if (cryptoIcon) {
      return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${cryptoIcon}.png`;
    }

    // Priority 3: For Base network - use TrustWallet Base assets
    if (chainId === 8453 && address && address !== "0x0000000000000000000000000000000000000000") {
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`;
    }

    // Priority 4: DeFi Llama for other ERC20 tokens
    if (address && address !== "0x0000000000000000000000000000000000000000") {
      return `https://icons.llamao.fi/icons/tokens/${chainId}/${address.toLowerCase()}.png`;
    }

    // Priority 5: Chain icon for native tokens
    if (address === "0x0000000000000000000000000000000000000000") {
      const chainIcons: { [key: number]: string } = {
        1: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
        56: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png",
        137: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png",
        42161: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
        10: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
        43114: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/avax.png",
        8453: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png", // Base uses ETH
        250: "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ftm.png",
      };
      return chainIcons[chainId] || null;
    }

    return null;
  };

  const logoURL = getBestLogoURL();

  // Preload image in background - CONTINUES LOADING even after showing badge!
  useEffect(() => {
    if (!logoURL) {
      setImageFailed(true);
      setIsLoading(false);
      return;
    }

    // Reset states when logoURL changes
    setImageLoaded(false);
    setImageFailed(false);
    setIsLoading(true);

    const img = new Image();
    img.src = logoURL;
    
    // No timeout needed - just keep the badge pulsing while loading
    // Logo will replace badge whenever it finishes loading

    img.onload = () => {
      setImageLoaded(true);
      setImageFailed(false);
      setIsLoading(false);
      console.log(`[Icon] ✅ ${symbol}: Logo loaded!`);
    };

    img.onerror = () => {
      setImageFailed(true);
      setIsLoading(false);
      console.log(`[Icon] ❌ ${symbol}: Logo failed`);
    };
  }, [logoURL, symbol]);

  // Fallback badge component
  const FallbackBadge = ({ isPulsing }: { isPulsing?: boolean }) => (
    <div 
      className={`${className} bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-400/40 flex items-center justify-center transition-all duration-300 ${isPulsing ? 'animate-pulse' : ''}`}
      style={{ fontSize: size / 2.5 }}
      title={isPulsing ? `Loading ${symbol} logo...` : symbol}
    >
      <span className="text-yellow-400 font-bold">
        {symbol.charAt(0)}
      </span>
    </div>
  );

  // RENDER LOGIC:
  // If logo loaded → Show logo (even if loaded 10 seconds later!)
  if (imageLoaded && logoURL) {
    return (
      <img
        src={logoURL}
        alt={symbol}
        className={`${className} transition-all duration-300`}
        style={{ opacity: 1 }}
        onError={() => {
          setImageFailed(true);
          setImageLoaded(false);
        }}
      />
    );
  }

  // Otherwise show badge:
  // - Pulsing if still loading (will auto-update to logo when it loads!)
  // - Static if permanently failed
  return <FallbackBadge isPulsing={isLoading && !imageFailed} />;
}

