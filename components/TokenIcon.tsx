/* eslint-disable @next/next/no-img-element */
import React from "react";

interface TokenIconProps {
  token: {
    symbol: string;
    address?: string;
    chainId?: number | string; // e.g. 1, 137, 56, 42161
  };
}

export function TokenIcon({ token }: TokenIconProps) {
  // Normalize chainId (string or number)
  const cid = String(token.chainId ?? "").toLowerCase();

  // Map known chain IDs to logos
  const chainLogos: Record<string, string> = {
    "1": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png", // Ethereum
    "56": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/bnb.png", // BSC
    "137": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/matic.png", // Polygon
    "42161": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/arb.png", // Arbitrum
    "10": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/op.png", // Optimism
    "43114": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/avax.png", // Avalanche
    "8453": "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/base.png", // Base
  };

  // Main token icons
  const mainIcon =
    token.symbol === "ETH"
      ? chainLogos["1"]
      : token.symbol === "BNB"
      ? chainLogos["56"]
      : token.symbol === "MATIC"
      ? chainLogos["137"]
      : token.symbol === "USDT"
      ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdt.png"
      : token.symbol === "USDC"
      ? "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/usdc.png"
      : `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${token.address}/logo.png`;

  const chainBadge = chainLogos[cid];

  return (
    <span className="relative flex items-center justify-center">
      {/* Main token icon */}
      <img
        src={mainIcon}
        alt={token.symbol}
        className="w-5 h-5 rounded-full"
        onError={(e) => {
          e.currentTarget.outerHTML = `<span class='text-white text-xs font-bold'>${token.symbol.charAt(
            0
          )}</span>`;
        }}
      />

      {/* Chain badge (small overlay in bottom-right corner) */}
      {chainBadge && (
        <img
          src={chainBadge}
          alt="chain"
          className="absolute bottom-[-2px] right-[-2px] w-2.5 h-2.5 rounded-full border border-black"
        />
      )}
    </span>
  );
}
