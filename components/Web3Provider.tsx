"use client";

import { WagmiConfig, createConfig, http } from "wagmi";
import { mainnet, polygon, arbitrum } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  DehydratedState,
} from "@tanstack/react-query";
import { useState, ReactNode } from "react";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

// ✅ define wagmi config
const wagmiConfig = createConfig({
  chains: [mainnet, polygon, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
  connectors: [
    injected({ shimDisconnect: true }), // MetaMask, Brave, Rabby, etc.
    coinbaseWallet({ appName: "Splenex DApp" }),
    walletConnect({ projectId, showQrModal: true }),
  ],
});

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const dehydratedState: DehydratedState | undefined = undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <WagmiConfig config={wagmiConfig}>{children}</WagmiConfig>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
