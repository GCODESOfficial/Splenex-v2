// lib/chains.ts
export type EvmChain =
  | "eth" | "bsc" | "polygon" | "arbitrum" | "optimism" | "base" | "avalanche"
  | "fantom" | "gnosis" | "celo" | "cronos" | "linea" | "scroll" | "mantle"
  | "zksync" | "blast" | "opbnb" | "zora" | "moonbeam" | "moonriver";

export const EVM_CHAINS: { id: EvmChain; moralisChain: string }[] = [
  { id: "eth", moralisChain: "eth" },
  { id: "bsc", moralisChain: "bsc" },
  { id: "polygon", moralisChain: "polygon" },
  { id: "arbitrum", moralisChain: "arbitrum" },
  { id: "optimism", moralisChain: "optimism" },
  { id: "base", moralisChain: "base" },
  { id: "avalanche", moralisChain: "avalanche" },
  { id: "fantom", moralisChain: "fantom" },
  { id: "gnosis", moralisChain: "gnosis" },
  { id: "celo", moralisChain: "celo" },
  { id: "cronos", moralisChain: "cronos" },
  { id: "linea", moralisChain: "linea" },
  { id: "scroll", moralisChain: "scroll" },
  { id: "mantle", moralisChain: "mantle" },
  { id: "zksync", moralisChain: "zksync" },
  { id: "blast", moralisChain: "blast" },
  { id: "opbnb", moralisChain: "opbnb" },
  { id: "zora", moralisChain: "zora" },
  { id: "moonbeam", moralisChain: "moonbeam" },
  { id: "moonriver", moralisChain: "moonriver" },
];
