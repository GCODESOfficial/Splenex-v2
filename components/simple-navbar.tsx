/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { WalletModal } from "./wallet-modal";
import { WalletDropdown } from "./wallet-dropdown";
import { BalanceDisplay } from "./balance-display";
import { Menu, X, Wallet } from "lucide-react";
import Image from "next/image";
import Sidebar from "./sidebar"; // ✅ Added import

export function SimpleNavbar() {
  const { isConnected, address } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ✅ Prevent page scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <>
      <nav className=" w-full h-16 bg-black flex items-center justify-between md:justify-end px-2 md:px-14 fixed top-0 z-40 ">
        <div className="md:hidden">
          <Image src="/images/logo.svg" alt="logo" width={100} height={24} />
        </div>

        {/* Wallet Section */}
        <div className="flex items-center gap-2 md:gap-3">
          {!isConnected ? (
            <Button
              onClick={() => setShowWalletModal(true)}
              className="flex items-center md:gap-2 py-2 border border-yellow-500 text-white md:bg-black hover:bg-[#111] transition rounded-none"
            >
              <Image
                src="/images/connect-icon.svg"
                alt="Connect Icon"
                width={18}
                height={18}
              />
              <span>Connect</span>
            </Button>
          ) : (
            <div className="flex items-center md:gap-3 gap-1 md:bg-[#0D0D0D] px-1 py-2">
              <button className="bg-[#121212] md:p-3 p-2 py-1.5 md:py-3 rounded-none">
                <a href="/apemode">
                  <img
                    src="/images/apemode.svg"
                    alt="ApeMode"
                    className="h-5 w-5"
                  />
                </a>
              </button>

              <div className="border md:border-none border-[#FCD404] flex md:gap-3  p-1 md:p-0">
                <BalanceDisplay />
                <WalletDropdown />
              </div>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-[#FCD404]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-8 w-8" />
            ) : (
              <Menu className="h-8 w-8" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-16 bg-black/95 backdrop-blur-sm z-40 md:hidden">
          <div className="flex flex-col p-4 space-y-4">
            {isConnected && (
              <div className="flex flex-col gap-3 pb-4 border-b border-gray-700">
                <BalanceDisplay />
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg">
                  <Wallet className="h-4 w-4 text-gray-400" />
                  <span className="text-white font-mono text-sm">
                    {address ? formatAddress(address) : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="md:hidden">
        {/* ✅ Mobile Sidebar Slide-in */}
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      <WalletModal open={showWalletModal} onOpenChange={setShowWalletModal} />
    </>
  );
}
