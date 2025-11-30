/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect, useRef } from "react";

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
 * Bulletproof TokenIcon with Comprehensive Fallback System
 * ALWAYS shows an icon - never fails to render
 * Tries multiple sources automatically until one works
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
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const triedUrlsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  // Generate ALL possible logo URLs in priority order (DexScreener + TrustWallet)
  const getAllLogoURLs = (): string[] => {
    const urls: string[] = [];
    const addressLower = address?.toLowerCase() || '';
    const symbolUpper = symbol?.toUpperCase() || '';
    const isNativeToken = !addressLower || addressLower === "0x0000000000000000000000000000000000000000" || addressLower === "native";

    // Handle native tokens (ETH, BNB, MATIC, AVAX, etc.)
    if (isNativeToken) {
      // Native token icon mapping (symbol-based)
      const nativeTokenIcons: { [key: string]: string } = {
        "ETH": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png",
        "BNB": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png",
        "MATIC": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png",
        "AVAX": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/avax.png",
        "FTM": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/ftm.png",
        "OP": "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
        "ARB": "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
        "BASE": "https://assets.coingecko.com/coins/images/27509/small/base.png",
      };

      // Priority 1: Provided logoURI
      if (logoURI && logoURI.startsWith('http')) {
        urls.push(logoURI);
      }

      // Priority 2: Symbol-based icon from cryptocurrency-icons
      if (symbolUpper && nativeTokenIcons[symbolUpper]) {
        urls.push(nativeTokenIcons[symbolUpper]);
      }

      // Priority 3: CoinGecko by symbol
      if (symbolUpper) {
        const coingeckoMap: { [key: string]: string } = {
          "ETH": "ethereum", "BNB": "binancecoin", "MATIC": "matic-network",
          "AVAX": "avalanche-2", "FTM": "fantom", "OP": "optimism",
          "ARB": "arbitrum", "BASE": "base",
        };
        const coingeckoId = coingeckoMap[symbolUpper];
        if (coingeckoId) {
          urls.push(`https://assets.coingecko.com/coins/images/${getCoinGeckoImageId(coingeckoId)}/large/${coingeckoId}.png`);
        }
      }

      return urls.filter(url => url && url.startsWith('http'));
    }

    // Skip if address is invalid (non-native)
    if (addressLower.length < 42) {
      return [];
    }

    // Priority 1: Provided logoURI (from DexScreener API)
    if (logoURI && logoURI.startsWith('http')) {
      urls.push(logoURI);
    }

    // Priority 2: DexScreener CDN (always try this) - supports many chains
    const dexChainMap: { [key: number]: string } = {
      1: "ethereum", 56: "bsc", 137: "polygon", 42161: "arbitrum",
      10: "optimism", 8453: "base", 43114: "avalanche", 250: "fantom",
      100: "gnosis", 324: "zksync", 59144: "linea", 534352: "scroll",
      1101: "polygon-zkevm", 5000: "mantle", 81457: "blast", 34443: "mode",
      204: "opbnb", 1285: "moonriver", 1284: "moonbeam", 25: "cronos",
      42220: "celo", 1313161554: "aurora", 1088: "metis", 122: "fuse",
      8217: "klaytn", 2020: "ronin",
    };
    const dexChain = dexChainMap[chainId];
    if (dexChain && addressLower && addressLower.length === 42) {
      urls.push(`https://dd.dexscreener.com/ds-data/tokens/${dexChain}/${addressLower}.png`);
    }

    // Priority 3: TrustWallet Assets (always try this) - supports many chains
    const twChainMap: { [key: number]: string } = {
      1: "ethereum", 56: "smartchain", 137: "polygon", 42161: "arbitrum",
      10: "optimism", 8453: "base", 43114: "avalanchec", 250: "fantom",
      100: "xdai", 324: "zksync", 59144: "linea", 534352: "scroll",
      1101: "polygonzkevm", 5000: "mantle", 81457: "blast", 34443: "mode",
      204: "opbnb", 1285: "moonriver", 1284: "moonbeam", 25: "cronos",
      42220: "celo", 1313161554: "aurora", 1088: "metis", 122: "fuse",
      8217: "klaytn", 2020: "ronin",
    };
    const twChain = twChainMap[chainId];
    if (twChain && addressLower && addressLower.length === 42) {
      urls.push(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${twChain}/assets/${addressLower}/logo.png`);
    }

    // Priority 4: DeFi Llama icons (universal fallback for any chain)
    if (addressLower && addressLower.length === 42 && chainId) {
      urls.push(`https://icons.llamao.fi/icons/tokens/${chainId}/${addressLower}`);
    }

    return urls.filter(url => url && url.startsWith('http'));
  };

  // Helper to get CoinGecko image ID (simplified - using direct URLs)
  const getCoinGeckoImageId = (id: string): string => {
    const imageIds: { [key: string]: string } = {
      "ethereum": "279",
      "binancecoin": "825",
      "matic-network": "4713",
      "avalanche-2": "12559",
      "fantom": "3513",
      "optimism": "25244",
      "arbitrum": "16547",
      "base": "27509",
    };
    return imageIds[id] || "279";
  };

  // Reset when props change
  useEffect(() => {
    isMountedRef.current = true;
    triedUrlsRef.current.clear();
    setCurrentUrlIndex(0);
    setImageLoaded(false);
    setCurrentImageUrl(null);
    
    const allUrls = getAllLogoURLs();
    
    if (allUrls.length > 0) {
      setCurrentImageUrl(allUrls[0]);
      triedUrlsRef.current.add(allUrls[0]);
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [symbol, address, chainId, logoURI]);

  // Load image when URL changes
  useEffect(() => {
    if (!currentImageUrl) {
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let loaded = false;
    const img = new Image();
    
    // Set source immediately
    img.src = currentImageUrl;

    // Timeout after 1.5 seconds - try next URL (faster retry)
    timeoutId = setTimeout(() => {
      if (isMountedRef.current && !loaded) {
        const allUrls = getAllLogoURLs();
        const nextIndex = currentUrlIndex + 1;
        
        if (nextIndex < allUrls.length) {
          setCurrentUrlIndex(nextIndex);
          setCurrentImageUrl(allUrls[nextIndex]);
          triedUrlsRef.current.add(allUrls[nextIndex]);
        }
      }
    }, 1500);

    img.onload = () => {
      if (isMountedRef.current) {
        loaded = true;
        clearTimeout(timeoutId);
        setImageLoaded(true);
      }
    };

    img.onerror = () => {
      if (isMountedRef.current) {
        clearTimeout(timeoutId);
        const allUrls = getAllLogoURLs();
        const nextIndex = currentUrlIndex + 1;
        
        if (nextIndex < allUrls.length) {
          setCurrentUrlIndex(nextIndex);
          setCurrentImageUrl(allUrls[nextIndex]);
          triedUrlsRef.current.add(allUrls[nextIndex]);
        }
      }
    };

    return () => {
      loaded = true; // Prevent timeout from firing
      clearTimeout(timeoutId);
    };
  }, [currentImageUrl, symbol, currentUrlIndex]);

  // Fallback badge component - ALWAYS renders if image fails
  const FallbackBadge = () => (
    <div 
      className={`${className} bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-400/40 flex items-center justify-center transition-all duration-300`}
      style={{ fontSize: Math.max(size / 2.5, 10), minWidth: size, minHeight: size }}
      title={symbol || 'Token'}
    >
      <span className="text-yellow-400 font-bold select-none">
        {(symbol && symbol.length > 0) ? (symbol.startsWith('$') ? symbol.charAt(1) : symbol.charAt(0)).toUpperCase() : '?'}
      </span>
    </div>
  );

  // ALWAYS render something - never return null
  if (imageLoaded && currentImageUrl) {
    return (
      <img
        src={currentImageUrl}
        alt={symbol || 'Token'}
        className={`${className} transition-all duration-300`}
        style={{ opacity: 1, width: size, height: size }}
        onError={() => {
          // If image fails after loading, try next URL
          const allUrls = getAllLogoURLs();
          const nextIndex = currentUrlIndex + 1;
          if (nextIndex < allUrls.length) {
            setCurrentUrlIndex(nextIndex);
            setCurrentImageUrl(allUrls[nextIndex]);
          } else {
            setImageLoaded(false);
          }
        }}
      />
    );
  }

  // Show fallback badge if failed or still loading
  return <FallbackBadge />;
}

