"use client";
import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import html2canvas from "html2canvas";

interface LeaderboardEntry {
  rank: string | number;
  wallet: string;
  tradingVolume: string;
  transactionCount: number;
  activeDays: number;
}

// ✅ RankCard Modal
function RankCardModal({
  wallet,
  walletFull,
  rank,
  total,
  entry,
  onClose,
}: {
  wallet: string;
  walletFull: string;
  rank: number;
  total: number;
  entry: LeaderboardEntry;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Allow ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const captureCard = async () => {
    if (!cardRef.current) {
      console.error("cardRef.current is null");
      return null;
    }

    try {
      // Wait a bit for the SVG image to load
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (clonedDoc) => {
          // Ensure images are loaded in the clone
          const imgs = clonedDoc.querySelectorAll('img');
          imgs.forEach(img => {
            if (!img.complete) {
              img.src = img.src;
            }
          });
        },
      });

      const dataUrl = canvas.toDataURL("image/png");
      console.log("Card captured successfully");
      return dataUrl;
    } catch (error) {
      console.error("Error capturing card:", error);
      return null;
    }
  };

  const handleExport = async () => {
    console.log("Export clicked");
    const dataUrl = await captureCard();
    if (!dataUrl) {
      console.error("No data URL returned from captureCard");
      alert("Failed to export card. Please try again.");
      return;
    }

    console.log("Downloading card...");
    // Download immediately
    const link = document.createElement("a");
    link.download = `splenex-leaderboard-${walletFull.slice(0, 8)}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShareOnX = async () => {
    const dataUrl = await captureCard();
    if (!dataUrl) return;

    const text = `🚀 Proud to be among Splenex's Top Traders! Ranked ${rank}/${total}. Join me on @Splenex - the revolutionizing trading marketplace!`;

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const file = new File([blob], "splenex-leaderboard.png", { type: "image/png" });

    // Check if Web Share API is supported
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        // Use Web Share API to share with image
        await navigator.share({
          title: "My Splenex Leaderboard Achievement",
          text: text,
          files: [file],
        });
      } catch (error) {
        console.error("Error sharing:", error);
        // Fallback: download and open Twitter
        const link = document.createElement("a");
        link.download = `splenex-leaderboard-${walletFull.slice(0, 8)}.png`;
        link.href = dataUrl;
        link.click();
        
        setTimeout(() => {
          const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=Splenex,Trading,Leaderboard`;
          window.open(twitterUrl, "_blank");
        }, 100);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      // Download the image and open Twitter
      const link = document.createElement("a");
      link.download = `splenex-leaderboard-${walletFull.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
      
      setTimeout(() => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=Splenex,Trading,Leaderboard`;
        window.open(twitterUrl, "_blank");
      }, 100);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-6 right-2 bg-red-500 z-50 text-gray-400 hover:text-white"
        >
          <X size={22} />
        </button>

        {/* Yellow top Section */}
        <div className="bg-[#FCD404] h-4 w-xs shadow-lg"></div>

        {/* Dark Main Section */}
        <div className="bg-[#121214] border border-[#FFD600] text-center px-10 py-20 max-w-3xl shadow-xl z-10">
          <h2 className="text-4xl font-bold text-white mb-3">Congratulations</h2>
          <p className="text-[#C7C7C7] text-base leading-relaxed">
            Your Wallet{" "}
            <span className="text-white text-2xl font-semibold">{wallet}</span>{" "}
            ranks
            <br />
            <span className="text-[#FFD600] font-bold">
              {rank}/{total}
            </span>{" "}
            on the Splenex Trading
            <br />
            Leaderboard.
          </p>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 mt-8 translate-y-10 w-full md:w-auto">
            <button
              onClick={handleShareOnX}
              className="border border-[#FFD600] text-white font-medium px-8 py-4 text-sm hover:bg-[#FFD600] hover:text-black transition-all w-full md:w-auto"
            >
              Share on X
            </button>
            <button
              onClick={handleExport}
              className="bg-[#1F1F1F] border border-[#1F1F1F] text-white font-medium px-8 py-4 text-sm hover:bg-[#2A2A2A] transition-all w-full md:w-auto"
            >
              Export Card
            </button>
          </div>
        </div>

        {/* Yellow Bottom Section */}
        <div className="bg-[#FCD404] h-4 w-xs shadow-lg"></div>
      </div>

      {/* Hidden shareable card - for screenshot */}
      <div 
        ref={cardRef}
        style={{ 
          position: 'fixed',
          left: '-10000px',
          top: 0,
          width: '650px',
          height: '400px',
          overflow: 'hidden'
        }}
      >
          {/* Social Card SVG as background */}
          <img 
            src="/images/Social Card.svg" 
            alt="Social Card"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />

          {/* Overlay dynamic data - absolutely positioned on the card */}
          {/* Data Container - Center Bottom */}
          <div style={{ 
            position: 'absolute', 
            bottom: '80px',
            left: '25%',
            transform: 'translateX(-20%)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '30px 60px'
          }}>
            {/* Row 1 - Whitelist Status */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
              <span style={{ color: '#C7C7C7', fontSize: '14px' }}>Whitelist Status:</span>
              <span style={{ color: '#4ade80', fontWeight: '600', fontSize: '14px' }}>Pending</span>
            </div>

            {/* Row 1 - Transaction Count */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
              <span style={{ color: '#C7C7C7', fontSize: '14px' }}>Tran. Count:</span>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{entry.transactionCount}</span>
            </div>

            {/* Row 2 - Active Days */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
              <span style={{ color: '#C7C7C7', fontSize: '14px' }}>Active Days:</span>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{entry.activeDays}</span>
            </div>

            {/* Row 2 - Rank */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
              <span style={{ color: '#C7C7C7', fontSize: '14px' }}>Rank:</span>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: '14px' }}>{rank}/{total}</span>
            </div>
          </div>
      </div>
    </div>
  );
}

// ✅ Sorry Modal
function SorryModal({
  wallet,
  onClose,
}: {
  wallet: string;
  onClose: () => void;
}) {
  // Allow ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-6 right-2 bg-red-500 z-50 text-gray-400 hover:text-white"
        >
          <X size={22} />
        </button>

        {/* Red top Section */}
        <div className="bg-[#FF4D4F] h-4 w-xs shadow-lg"></div>

        {/* Dark Main Section */}
        <div className="bg-[#121214] border border-[#FF4D4F] text-center px-10 py-20 max-w-3xl shadow-xl z-10">
          <h2 className="text-4xl font-bold text-white mb-3">Sorry</h2>
          <p className="text-[#C7C7C7] text-base leading-relaxed">
            {wallet ? (
              <>
                Your Wallet{" "}
                <span className="text-white text-2xl font-semibold">{wallet}</span>{" "}
                is not found
                <br />
                in the Splenex Trading
                <br />
                Leaderboard.
              </>
            ) : (
              <>
                Please enter a valid
                <br />
                wallet address to check
                <br />
                your leaderboard status.
              </>
            )}
          </p>

          {/* Buttons */}
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 mt-8 translate-y-10 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="border border-[#FF4D4F] text-white font-medium px-8 py-4 text-sm hover:bg-[#FF4D4F] hover:text-black transition-all w-full md:w-auto"
            >
              Try Again
            </button>
            <button 
              onClick={onClose}
              className="bg-[#1F1F1F] border border-[#1F1F1F] text-white font-medium px-8 py-4 text-sm hover:bg-[#2A2A2A] transition-all w-full md:w-auto"
            >
              Close
            </button>
          </div>
        </div>

        {/* Red Bottom Section */}
        <div className="bg-[#FF4D4F] h-4 w-xs shadow-lg"></div>
      </div>
    </div>
  );
}

export default function TradingLeaderboard() {
  const [wallet, setWallet] = useState("");
  const [tableData, setTableData] = useState<LeaderboardEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [showSorryModal, setShowSorryModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState("");
  const [selectedWalletFull, setSelectedWalletFull] = useState("");
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const itemsPerPage = 10;

  // ✅ Load data from database via API
  useEffect(() => {
    fetch("/api/leaderboard")
      .then((res) => res.json())
      .then((data) => setTableData(data))
      .catch((err) =>
        console.error("Error loading leaderboard data:", err)
      );
  }, []);

  // ✅ Hide wallet middle section
  const hideWallet = (wallet: string) => {
    if (!wallet || wallet.length <= 8) return wallet;
    const first = wallet.slice(0, 4);
    const last = wallet.slice(-4);
    return `${first}...${last}`;
  };

  // ✅ Eligibility check logic
  const handleCheckEligibility = () => {
    if (!wallet.trim()) {
      setSelectedWallet("");
      setShowSorryModal(true);
      return;
    }

    const foundIndex = tableData.findIndex(
      (entry) => entry.wallet.toLowerCase() === wallet.toLowerCase()
    );

    if (foundIndex !== -1) {
      const found = tableData[foundIndex];
      setSelectedWallet(hideWallet(found.wallet));
      setSelectedWalletFull(found.wallet); // Store full wallet for card
      // Get the actual numeric rank from the index (1-based)
      setSelectedRank(foundIndex + 1);
      setSelectedEntry(found); // Store full entry data
      setShowModal(true);
    } else {
      setSelectedWallet(hideWallet(wallet));
      setShowSorryModal(true);
    }
  };

  // ✅ Pagination
  const totalPages = Math.ceil(tableData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = tableData.slice(startIndex, startIndex + itemsPerPage);

  const getVisiblePages = () => {
    const pages = [];
    if (totalPages <= 4) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, "...", totalPages);
      } else if (currentPage >= totalPages - 1) {
        pages.push(1, "...", totalPages - 1, totalPages);
      } else {
        pages.push(1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const visiblePages = getVisiblePages();

  // ✅ Top 3 Cards
  const topThree = tableData.slice(0, 3).map((item, index) => {
    const styles = [
      {
        background: "bg-[#1D1900]",
        borderGradient: "from-[#FCD404] to-[#2A2A2C]",
      },
      {
        background: "bg-[#001A0B]",
        borderGradient: "from-[#20E070] to-[#2A2A2C]",
      },
      {
        background: "bg-[#1C0000]",
        borderGradient: "from-[#FF4D4F] to-[#2A2A2C]",
      },
    ];
    return { ...item, ...styles[index] };
  });

  return (
    <section className="bg-[#0B0B0C] min-h-full text-white px-2 md:px-6 relative">
      {/* ✅ Congratulations Modal */}
      {showModal && selectedRank !== null && selectedEntry && (
        <RankCardModal
          wallet={selectedWallet}
          walletFull={selectedWalletFull}
          rank={selectedRank}
          total={tableData.length}
          entry={selectedEntry}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* ✅ Sorry Modal */}
      {showSorryModal && (
        <SorryModal
          wallet={selectedWallet || wallet}
          onClose={() => setShowSorryModal(false)}
        />
      )}

      {/* Hero Section */}
      <header
        className="w-full bg-[#0B0B0C] text-[#FFFFFF] md:px-8 overflow-hidden"
        style={{
          backgroundImage: "url('/images/matbg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center py-12 md:py-0 gap-10 mx-auto">
          {/* Left Section */}
          <div className="w-full md:max-w-[60%] py-0 flex flex-col justify-center">
            <h1 className="text-2xl md:text-4xl text-center md:text-left font-extrabold mb-2">
              Trading Leaderboard
            </h1>
            <p className="text-[#C7C7C7] text-sm font-medium text-center md:text-start mb-8 md:text-base leading-relaxed">
              Track the best traders on Splenex — ranked by profit, volume, and
              consistency.
            </p>

            <label
              htmlFor="wallet"
              className="block font-medium text-base text-center md:text-left mb-2 text-[#FFFFFF]"
            >
              Verify your whitelist status
            </label>

            {/* ✅ Desktop input section */}
            <div className="hidden md:flex items-center bg-[#1F1F1F] w-full overflow-hidden mb-2">
              <input
                type="text"
                name="wallet"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Enter your active wallet address to confirm whitelist eligibility."
                className="flex-1 bg-transparent px-4 py-3 text-base text-[#8F8F8F] placeholder-[#8F8F8F] focus:outline-none"
              />
              <button
                onClick={handleCheckEligibility}
                className="bg-[#FFD600] text-sm text-black font-semibold m-2 px-6 py-3 hover:bg-yellow-400 transition-all"
              >
                Check Eligibility
              </button>
            </div>

            {/* ✅ Mobile input section */}
            <div className="md:hidden w-full">
              <input
                type="text"
                name="wallet"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Enter your active wallet address to confirm whitelist eligibility."
                className="w-full bg-[#1F1F1F] px-4 py-3 text-base text-[#8F8F8F] placeholder-[#8F8F8F] focus:outline-none mb-3"
              />
              <button
                onClick={handleCheckEligibility}
                className="bg-[#FFD600] w-full text-sm text-black font-semibold px-6 py-3 hover:bg-yellow-400 transition-all"
              >
                Check Eligibility
              </button>
            </div>

            <p className="text-sm text-center md:text-left md:text-base text-[#C7C7C7] mt-4 leading-relaxed">
              To remain in the top 100 for whitelist eligibility, continue
              trading actively to maintain your position.
            </p>
          </div>

          {/* ✅ Globe Section */}
          <div className="hidden md:flex flex-col justify-end w-[380px] lg:w-[420px]">
            <div className="flex justify-center">
              <Image
                src="/images/splenex_globe.svg"
                alt="splenex globe"
                width={400}
                height={400}
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </header>

      {/* ✅ Leaderboard + Pagination */}
      <div className="py-1 bg-[#121214]">
        {/* Top 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 mt-6 max-w-[95%] mx-auto">
          {topThree.map((item, index) => (
            <div
              key={index}
              className={`p-[1.5px] bg-linear-to-b ${item.borderGradient}`}
            >
              <div
                className={`p-4 flex flex-col justify-between h-full ${item.background}`}
              >
                <div className="flex justify-between border-b border-[#2A2A2C] pb-4 items-center mb-4">
                  <div>
                    <h2 className="font-semibold text-lg">
                      {hideWallet(item.wallet)}
                    </h2>
                  </div>
                  <Image
                    src={String(item.rank)}
                    alt={`Rank ${index + 1} Icon`}
                    width={36}
                    height={36}
                    className="object-contain"
                  />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 mt-4">
                  <div className="flex items-center gap-3">
                    <p className="text-[#B1B1B1] text-sm">Trading Vol.</p>
                    <p className="text-sm font-semibold">
                      {item.tradingVolume}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[#B1B1B1] text-sm">Trans. Count:</p>
                    <span className="text-white">{item.transactionCount}</span>
                  </div>
                </div>

                <div className="flex justify-start mt-2 text-sm text-gray-300">
                  <p>
                    Active Days:{" "}
                    <span className="text-white">{item.activeDays}</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ✅ Table */}
        <div className="bg-[#121214] overflow-hidden max-w-[95%] mx-auto">
          <table className="w-full overflow-x-auto text-left text-sm">
            <thead className="text-[#C7C7C7] font-medium text-sm">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Wallet Address</th>
                <th className="px-4 py-3">
                  Trading Volume
                </th>
                <th className="px-4 py-3">
                  Transaction Count
                </th>
                <th className="px-4 py-3">Active Days</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, index) => (
                <tr key={index} className="border-t border-[#1E1E1E]">
                  <td className="px-4 py-3 font-semibold">
                    {typeof row.rank === "string" &&
                    row.rank.startsWith("/images") ? (
                      <Image
                        src={row.rank}
                        alt={`Rank ${index + 1}`}
                        width={28}
                        height={28}
                        className="object-contain"
                      />
                    ) : (
                      row.rank
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {hideWallet(row.wallet)}
                  </td>
                  <td className="px-4 py-3">
                    {row.tradingVolume}
                  </td>
                  <td className="px-4 py-3">
                    {row.transactionCount}
                  </td>
                  <td className="px-4 py-3">
                    {row.activeDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ Pagination */}
        <div className="flex items-center justify-end gap-1 p-4 text-sm">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            className={`px-2 py-1 rounded ${
              currentPage === 1
                ? "text-gray-500 cursor-not-allowed"
                : "text-white hover:bg-[#1F1F1F]"
            }`}
          >
            <ChevronLeft />
          </button>

          {visiblePages.map((page, idx) =>
            page === "..." ? (
              <span key={idx} className="px-1 text-gray-500">
                ...
              </span>
            ) : (
              <button
                key={idx}
                onClick={() =>
                  typeof page === "number" && setCurrentPage(page)
                }
                className={`px-2 py-1 rounded-full ${
                  currentPage === page
                    ? "bg-[#FFD600] text-black font-semibold"
                    : "hover:bg-[#1F1F1F]"
                }`}
              >
                {page}
              </button>
            )
          )}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            className={`px-2 py-1 rounded ${
              currentPage === totalPages
                ? "text-gray-500 cursor-not-allowed"
                : "text-white hover:bg-[#1F1F1F]"
            }`}
          >
            <ChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}