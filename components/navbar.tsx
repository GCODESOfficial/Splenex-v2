"use client";

import { useAccount, useBalance, useDisconnect } from "wagmi";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import CustomWalletModal from "./CustomWalletModal";
import Image from "next/image";

function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}

export default function Navbar() {
  const isClient = useIsClient();
  const { address, connector, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  if (!isClient) return null;

  return (
    <nav className="w-full bg-black h-20 flex items-center justify-end px-4 fixed top-0 z-10">
      {!isConnected ? (
        <>
          
          <button 
          onClick={() => setWalletModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 border border-yellow-500 text-white bg-black hover:bg-[#111] transition">
  <Image
    src="/images/connect-icon.svg" // <-- replace with your actual icon path
    alt="Connect Icon"
    width={18}
    height={18}
  />
  <span>Connect</span>
</button>

          <CustomWalletModal open={walletModalOpen} setOpen={setWalletModalOpen} />
        </>
      ) : (
        <div className="flex items-center space-x-2 relative">
          <div className="flex items-center bg-[#1a1a1a] px-2 py-1 rounded text-sm">
            <span className="mr-1">💰</span>
            <span>
              {balance?.formatted} {balance?.symbol}
            </span>
          </div>

          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center bg-[#1a1a1a] px-2 py-1 rounded text-sm cursor-pointer"
          >
            <span>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
            <ChevronDown size={14} className="ml-1" />
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 top-12 bg-[#1a1a1a] rounded shadow-lg p-2 w-48 text-sm">
              <div className="px-2 py-1">🔌 {connector?.name ?? "Wallet"}</div>
              <button
                onClick={() => {
                  disconnect();
                  setDropdownOpen(false);
                }}
                className="w-full text-left px-2 py-1 hover:bg-red-500 hover:text-white rounded"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
