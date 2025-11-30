/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Metadata } from "next";
import { satoshi, generalSans } from "./fonts";
import "./globals.css";
import Sidebar from "@/components/sidebar";
import Footer from "@/components/footer";
import { SimpleNavbar } from "@/components/simple-navbar";
import { WalletProvider } from "@/hooks/use-wallet";
import { SecondaryWalletProvider } from "@/hooks/use-secondary-wallet";
import { CustomToaster } from "@/components/ui/custom-toast";
import { SecurityProvider } from "@/components/security-provider";

export const metadata = {
  title: "Splenex Lite Version – The future of cross-chain liquidity",
  description:
    "Splenex fuses AMM swaps, perpetuals, and cross-chain liquidity. Trade seamlessly across Ethereum, Base, BSC, and Polygon — fast, secure, and community-owned.",
  keywords: [
    "Splenex",
    "DeFi",
    "Omnichain DEX",
    "Crypto Exchange",
    "Cross-chain swaps",
    "Web3 Liquidity",
    "AMM",
    "Blockchain",
    "Crypto Trading",
  ],
  authors: [{ name: "Splenex" }],
  creator: "Splenex",
  publisher: "Splenex",
  metadataBase: new URL("https://lite.splenex.com"), // <-- replace with your live domain
  openGraph: {
    title: "Splenex Lite Version – The future of cross-chain liquidity",
    description:
      "Explore Splenex Lite Version; Join thousands of traders powering the future of cross-chain liquidity",
    url: "https://lite.splenex.com",
    siteName: "Splenex Lite Version",
    type: "website",
    images: [
      {
        url: "/images/metadata.jpg", // <-- place your meta image in /public/images/meta-image.png
        width: 1200,
        height: 630,
        alt: "Splenex Lite Version – The future of cross-chain liquidity",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Splenex Lite Version – The future of cross-chain liquidity",
    description:
      "Explore Splenex Lite Version; Join thousands of traders powering the future of cross-chain liquidity",
    site: "@Splenex",
    creator: "@Splenex",
    images: ["/images/metadata.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${generalSans.variable} ${satoshi.variable} antialiased md:overflow-hidden bg-black`}
        suppressHydrationWarning
      >
        <SecurityProvider>
          <WalletProvider>
            <SecondaryWalletProvider>
              <SimpleNavbar />

              {/* Layout Wrapper (fills viewport minus navbar & footer height) */}
              <div className="flex flex-row pb-14 md:h-[calc(100vh)] md:overflow-hidden">
                {/* Sidebar */}
                <aside className=" overflow-y-scroll  overflow-x-hidden bg-[#000000] z-40 sidebar-scroll hidden md:block">
                  <Sidebar />
                </aside>

                {/* Main Content */}
                <main className="flex-1 overflow-y-auto pt-16 text-white w-full ">
                  {children}
                  <CustomToaster />
                </main>
              </div>

              {/* Fixed Footer */}
              <footer className="md:fixed bottom-0 left-0 w-full z-40 border-t-[#B79B08] border-t">
                <Footer />
              </footer>
            </SecondaryWalletProvider>
          </WalletProvider>
        </SecurityProvider>
      </body>
    </html>
  );
}
