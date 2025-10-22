// components/footer.tsx
"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="w-full bg-[#000000]">
      <div className="flex items-center justify-between px-8 py-5">
        {/* Left side */}
        <div className="flex items-center gap-2 text-[14px] text-white">
          <Link href="/docs" className="hover:text-[#CFA83C]">
            Docs
          </Link>
          <span className="text-white">|</span>
          <Link href="/support" className="hover:text-[#CFA83C]">
            Support
          </Link>
        </div>

        {/* Right side (icons) */}
        <div className="flex items-center gap-4">
          <button aria-label="Close" className="hover:opacity-70">
            <Image
              src="/images/socials/X.svg"
              alt="close"
              width={18}
              height={18}
            />
          </button>
          <button aria-label="Telegram" className="hover:opacity-70">
            <Image
              src="/images/socials/telegram.svg"
              alt="telegram"
              width={18}
              height={18}
            />
          </button>
        </div>
      </div>
    </footer>
  );
}
