/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type MenuItem = {
  name: string;
  href: string;
  icon: any;
};

const menuItems: MenuItem[] = [
  { name: "Overview", href: "/", icon: "/images/icons/overview.svg" },
  { name: "Swap", href: "/swap", icon: "/images/icons/swap.svg" },
  {
    name: "Leaderboard",
    href: "/leaderboard",
    icon: "/images/icons/leaderboard.svg",
  },
  { name: "LP Market", href: "/lp-market", icon: "/images/icons/lpmarket.svg" },
  { name: "sAI", href: "/sAI", icon: "/images/icons/sport.svg" },
  // { name: "sFund DAO", href: "/sfund-dao", icon: "/images/icons/sfund.svg" },
  // { name: "sHold", href: "/shold", icon: "/images/icons/hold.svg" },
  // { name: "On-Off Ramp", href: "/ramp", icon: "/images/icons/ramp.svg" },
  // { name: "sEdu", href: "/sedu", icon: "/images/icons/edu.svg" },
  // { name: "sCircler", href: "/scircler", icon: "/images/icons/circler.svg" },
  // { name: "sNFT", href: "/snft", icon: "/images/icons/nft.svg" },
];

export default function Sidebar({
  mobileOpen = false,
  onClose,
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setCollapsed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
  }, [collapsed]);

  return (
    <>
      <div
        className={`bg-gradient-to-r from-[#0B0B0C] to-[#131313] text-white hidden md:flex flex-col pb-16 z-50 h-full ${
          collapsed ? "w-20 " : "w-52 "
        } transition-all duration-300`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 pt-6 pb-6">
          {collapsed ? (
            <Image
              src="/images/logo-collapsed.svg"
              alt="logo collapsed"
              width={24}
              height={24}
            />
          ) : (
            <Image
              src="/images/logo.svg"
              alt="logo expanded"
              width={130}
              height={28}
            />
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 ml-4  mt-4 pl-4 py-3 border-t-[#B79B08] border-t border-b-[#B79B08] border-b"
        >
          {collapsed ? (
            <span className="text-[#FCD404]">▶</span>
          ) : (
            <>
              <span className="text-[#FCD404]">◀</span>
              <span className="text-[#C7C7C7]">Collapse</span>
            </>
          )}
        </button>

        {/* Menu */}
        <nav className="flex-1 ">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-5 relative transition-colors ml-4  ${
                  isActive
                    ? "text-black bg-yellow-400"
                    : "text-[#C7C7C7] border-b-[#B79B08] border-b"
                }`}
              >
                {/* Active indicator triangle */}
                {isActive && (
                  <span
                    className={`absolute top-1/2 -translate-y-1/2 w-0 h-0
      ${
        collapsed
          ? "border-t-[29.5px] border-b-[29.5px] border-l-[29.5px] -right-[29px]"
          : "border-t-[32.5px] border-b-[32.5px] border-l-[32.5px] -right-8"
      }
      border-t-transparent border-b-transparent border-l-yellow-400`}
                  ></span>
                )}

                <Image
                  src={item.icon}
                  alt={item.name}
                  width={18}
                  height={18}
                  className={`mr-3 ${
                    isActive ? "brightness-0" : "brightness-100"
                  }`}
                />

                {!collapsed && (
                  <span
                    className={`${
                      isActive ? "text-black font-medium" : "text-[#C7C7C7]"
                    }`}
                  >
                    {item.name}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* === Mobile Sidebar Added === */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-gradient-to-r from-[#0B0B0C] to-[#131313] text-white transform transition-transform duration-300 z-50 md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4">
          <Image src="/images/logo.svg" alt="logo" width={100} height={24} />
          <button onClick={onClose} className="text-[#FCD404] text-2xl">
            ✕
          </button>
        </div>

        <nav className="flex flex-col mt-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center px-5 py-4 transition-colors border-b-[#B79B08] border-b ${
                  isActive ? "bg-yellow-400 text-black" : "text-[#C7C7C7]"
                }`}
              >
                <Image
                  src={item.icon}
                  alt={item.name}
                  width={18}
                  height={18}
                  className={`mr-3 ${
                    isActive ? "brightness-0" : "brightness-100"
                  }`}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}
    </>
  );
}
