/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronDown, Search } from "lucide-react"
import { useWallet } from "@/hooks/use-wallet"
import { useSecondaryWallet } from "@/hooks/use-secondary-wallet"
import { useLiFi } from "@/hooks/use-lifi"
import { TokenIconWithFallback } from "./token-icon-with-fallback"
import { POPULAR_TOKENS_WITH_LOGOS } from "@/lib/popular-tokens"

interface Token {
  id?: string
  symbol: string
  name: string
  address: string
  chainId: number
  chainName: string
  balance?: string
  usdValue?: string
  icon?: string
  logoURI?: string
  decimals?: number
  source?: string
}


interface Chain {
  id: number
  name: string
  icon: string
}

const CHAINS: Chain[] = [
  // Top chains (most popular)
  {
    id: 1,
    name: "Ethereum",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png",
  },
  {
    id: 8453,
    name: "Base",
    icon: "https://icons.llamao.fi/icons/chains/rsz_base.jpg",
  },
  {
    id: 42161,
    name: "Arbitrum",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  },
  {
    id: 56,
    name: "BSC",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },
  {
    id: 137,
    name: "Polygon",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png",
  },
  {
    id: 10,
    name: "Optimism",
    icon: "https://raw.githubusercontent.com/ethereum-optimism/brand-kit/main/assets/svg/OPTIMISM-R.svg",
  },
  {
    id: 43114,
    name: "Avalanche",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png",
  },
  {
    id: 250,
    name: "Fantom",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/fantom/info/logo.png",
  },
  // Layer 2s and sidechains
  {
    id: 42170,
    name: "Arbitrum Nova",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png",
  },
  {
    id: 324,
    name: "zkSync Era",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png",
  },
  {
    id: 1101,
    name: "Polygon zkEVM",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygonzkevm/info/logo.png",
  },
  {
    id: 534352,
    name: "Scroll",
    icon: "https://icons.llamao.fi/icons/chains/rsz_scroll.jpg",
  },
  {
    id: 59144,
    name: "Linea",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png",
  },
  {
    id: 5000,
    name: "Mantle",
    icon: "https://icons.llamao.fi/icons/chains/rsz_mantle.jpg",
  },
  {
    id: 169,
    name: "Manta Pacific",
    icon: "https://icons.llamao.fi/icons/chains/rsz_manta.jpg",
  },
  {
    id: 81457,
    name: "Blast",
    icon: "https://icons.llamao.fi/icons/chains/rsz_blast.jpg",
  },
  {
    id: 34443,
    name: "Mode",
    icon: "https://icons.llamao.fi/icons/chains/rsz_mode.jpg",
  },
  {
    id: 204,
    name: "opBNB",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png",
  },
  {
    id: 7777777,
    name: "Zora",
    icon: "https://icons.llamao.fi/icons/chains/rsz_zora.jpg",
  },
  // Other EVM chains
  {
    id: 100,
    name: "Gnosis",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/xdai/info/logo.png",
  },
  {
    id: 1285,
    name: "Moonriver",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/moonriver/info/logo.png",
  },
  {
    id: 1284,
    name: "Moonbeam",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/moonbeam/info/logo.png",
  },
  {
    id: 25,
    name: "Cronos",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cronos/info/logo.png",
  },
  {
    id: 42220,
    name: "Celo",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/celo/info/logo.png",
  },
  {
    id: 1313161554,
    name: "Aurora",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/aurora/info/logo.png",
  },
  {
    id: 1088,
    name: "Metis",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/metis/info/logo.png",
  },
  {
    id: 321,
    name: "KCC",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/kcc/info/logo.png",
  },
  {
    id: 66,
    name: "OKExChain",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/okexchain/info/logo.png",
  },
  {
    id: 128,
    name: "HECO",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/heco/info/logo.png",
  },
  {
    id: 122,
    name: "Fuse",
    icon: "https://icons.llamao.fi/icons/chains/rsz_fuse.jpg",
  },
  {
    id: 199,
    name: "BitTorrent",
    icon: "https://icons.llamao.fi/icons/chains/rsz_bittorrent.jpg",
  },
  {
    id: 1666600000,
    name: "Harmony",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/harmony/info/logo.png",
  },
  {
    id: 106,
    name: "Velas",
    icon: "https://icons.llamao.fi/icons/chains/rsz_velas.jpg",
  },
  {
    id: 57,
    name: "Syscoin",
    icon: "https://icons.llamao.fi/icons/chains/rsz_syscoin.jpg",
  },
  {
    id: 361,
    name: "Theta",
    icon: "https://icons.llamao.fi/icons/chains/rsz_theta.jpg",
  },
  {
    id: 40,
    name: "Telos",
    icon: "https://icons.llamao.fi/icons/chains/rsz_telos.jpg",
  },
  {
    id: 88,
    name: "TomoChain",
    icon: "https://icons.llamao.fi/icons/chains/rsz_tomochain.jpg",
  },
  {
    id: 888,
    name: "Wanchain",
    icon: "https://icons.llamao.fi/icons/chains/rsz_wanchain.jpg",
  },
  {
    id: 20,
    name: "Elastos",
    icon: "https://icons.llamao.fi/icons/chains/rsz_elastos.jpg",
  },
  {
    id: 4689,
    name: "IoTeX",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/iotex/info/logo.png",
  },
  {
    id: 9001,
    name: "Evmos",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/evmos/info/logo.png",
  },
  {
    id: 2222,
    name: "Kava",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/kava/info/logo.png",
  },
  {
    id: 8217,
    name: "Klaytn",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/klaytn/info/logo.png",
  },
  {
    id: 82,
    name: "Meter",
    icon: "https://icons.llamao.fi/icons/chains/rsz_meter.jpg",
  },
  {
    id: 42262,
    name: "Oasis Emerald",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/oasis/info/logo.png",
  },
  {
    id: 2020,
    name: "Ronin",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ronin/info/logo.png",
  },
  {
    id: 10000,
    name: "SmartBCH",
    icon: "https://icons.llamao.fi/icons/chains/rsz_smartbch.jpg",
  },
  {
    id: 19,
    name: "Songbird",
    icon: "https://icons.llamao.fi/icons/chains/rsz_songbird.jpg",
  },
  {
    id: 108,
    name: "ThunderCore",
    icon: "https://icons.llamao.fi/icons/chains/rsz_thundercore.jpg",
  },
  // Non-EVM chains
  {
    id: 99998,
    name: "Solana",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png",
  },
  {
    id: 99999,
    name: "Cosmos",
    icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/cosmos/info/logo.png",
  },
]

// Use popular tokens with real CoinGecko logos (imported from lib)

interface TokenSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectToken: (token: Token) => void
  selectedToken?: Token
  walletContext?: "primary" | "secondary" // Which wallet's balances to show
}

export function TokenSelectionModal({ 
  isOpen, 
  onClose, 
  onSelectToken, 
  selectedToken,
  walletContext = "primary" 
}: TokenSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [chainSearchQuery, setChainSearchQuery] = useState("")
  const [selectedChain, setSelectedChain] = useState<number | null>(null)
  const [lifiTokens, setLifiTokens] = useState<Token[]>([])
  const [coinGeckoTokens, setCoinGeckoTokens] = useState<Token[]>([])
  const [allTokens, setAllTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isLoadingCoinGecko, setIsLoadingCoinGecko] = useState(false)
  const [isLoadingAllTokens, setIsLoadingAllTokens] = useState(false)
  const [showChains, setShowChains] = useState(false);
  const [customTokenAddress, setCustomTokenAddress] = useState("")
  const [isLoadingCustomToken, setIsLoadingCustomToken] = useState(false)
  const [customToken, setCustomToken] = useState<Token | null>(null)

  // Get balances from appropriate wallet
  const { tokenBalances: primaryTokenBalances } = useWallet()
  const { secondaryTokenBalances } = useSecondaryWallet()
  const { getSupportedTokens, getSupportedChains } = useLiFi()

  // Use the correct token balances based on wallet context
  const tokenBalances = walletContext === "secondary" ? secondaryTokenBalances : primaryTokenBalances

  console.log(`[TokenSelectionModal] 💼 Using ${walletContext} wallet balances:`, tokenBalances.length, "tokens")

  // Function to fetch token metadata by contract address
  const fetchTokenByAddress = async (address: string, chainId: number = 1) => {
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return null
    }

    setIsLoadingCustomToken(true)
    try {
      // Try to get token metadata from multiple sources
      const responses = await Promise.allSettled([
        // Try Moralis API first
        fetch(`/api/token-metadata?address=${address}&chainId=${chainId}`),
        // Try CoinGecko API as fallback
        fetch(`https://api.coingecko.com/api/v3/coins/ethereum/contract/${address}`)
      ])

      // Process Moralis response
      if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
        const moralisData = await responses[0].value.json()
        if (moralisData.result) {
          const token: Token = {
            symbol: moralisData.result.symbol || 'UNKNOWN',
            name: moralisData.result.name || 'Unknown Token',
            address: address.toLowerCase(),
            chainId: chainId,
            chainName: getChainName(chainId),
            decimals: moralisData.result.decimals || 18,
            logoURI: moralisData.result.logo || undefined,
            source: 'moralis'
          }
          setCustomToken(token)
          setIsLoadingCustomToken(false)
          return token
        }
      }

      // Process CoinGecko response
      if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
        const cgData = await responses[1].value.json()
        if (cgData.id) {
          const token: Token = {
            symbol: cgData.symbol?.toUpperCase() || 'UNKNOWN',
            name: cgData.name || 'Unknown Token',
            address: address.toLowerCase(),
            chainId: chainId,
            chainName: getChainName(chainId),
            decimals: 18, // Default to 18
            logoURI: cgData.image?.large || undefined,
            source: 'coingecko'
          }
          setCustomToken(token)
          setIsLoadingCustomToken(false)
          return token
        }
      }

      // If no metadata found, create a basic token entry
      const token: Token = {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        address: address.toLowerCase(),
        chainId: chainId,
        chainName: getChainName(chainId),
        decimals: 18,
        source: 'manual'
      }
      setCustomToken(token)
      setIsLoadingCustomToken(false)
      return token

    } catch (error) {
      console.error('[TokenSelectionModal] Error fetching token metadata:', error)
      setIsLoadingCustomToken(false)
      return null
    }
  }

  // Helper function to get chain name by ID
  const getChainName = (chainId: number): string => {
    const chainMap: { [key: number]: string } = {
      1: 'Ethereum',
      56: 'BSC',
      137: 'Polygon',
      42161: 'Arbitrum',
      10: 'Optimism',
      8453: 'Base',
      43114: 'Avalanche',
      250: 'Fantom'
    }
    return chainMap[chainId] || `Chain ${chainId}`
  }

  // Load all tokens from comprehensive API when modal opens
  useEffect(() => {
    const loadAllTokens = async () => {
      if (!isOpen) {
        setAllTokens([]);
        return;
      }

      setIsLoadingAllTokens(true);
      try {
        console.log("[Token Modal] 🌍 Loading all available tokens...");
        
        const response = await fetch("/api/all-tokens?limit=2000");
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            console.log(`[Token Modal] ✅ Loaded ${data.data.length} tokens from all chains`);
            
            // Debug: Check for Solana and Cosmos tokens specifically
            const solanaTokens = data.data.filter((token: any) => 
              token.chains?.some((chain: any) => chain.chainId === 99998)
            );
            const cosmosTokens = data.data.filter((token: any) => 
              token.chains?.some((chain: any) => chain.chainId === 99999)
            );
            
            console.log("[Token Modal] 🔍 Solana tokens found:", solanaTokens.length);
            console.log("[Token Modal] 🔍 Cosmos tokens found:", cosmosTokens.length);
            
            // Convert to Token format and filter by wallet balances
            const tokensWithBalances = data.data
              .map((token: any) => {
                // Find if token exists in wallet balances
                const walletToken = tokenBalances.find(walletToken => 
                  walletToken.symbol === token.symbol && 
                  token.chains.some((chain: any) => chain.chainId === walletToken.chainId)
                );

                if (walletToken) {
                  // Token exists in wallet - use wallet data
                  return {
                    id: token.id,
                    symbol: token.symbol,
                    name: token.name,
                    address: walletToken.address,
                    chainId: walletToken.chainId,
                    chainName: walletToken.chainName,
                    balance: walletToken.balance,
                    usdValue: walletToken.usdValue,
                    logoURI: token.logoURI || walletToken.logoURI,
                    decimals: walletToken.decimals || 18,
                    source: "wallet",
                  };
                } else {
                  // Token not in wallet - create separate entries for each chain
                  return token.chains.map((chain: any) => ({
                    id: `${token.id}-${chain.chainId}`,
                    symbol: token.symbol,
                    name: token.name,
                    address: chain.address,
                    chainId: chain.chainId,
                    chainName: chain.chainName,
                    balance: "0",
                    usdValue: "$0.00",
                    logoURI: token.logoURI,
                    decimals: chain.decimals || 18,
                    source: "api",
                    availableChains: token.chains.length,
                    marketCapRank: token.marketCapRank,
                    price: token.price
                  }));
                }
              })
              .flat() // Flatten arrays returned from map
              .filter((token: any) => token !== null)
              .sort((a: any, b: any) => {
                // Enhanced sorting: wallet tokens first, then by market cap rank
                if (a.source === "wallet" && b.source !== "wallet") return -1;
                if (b.source === "wallet" && a.source !== "wallet") return 1;
                
                const rankA = a.marketCapRank || 999999;
                const rankB = b.marketCapRank || 999999;
                return rankA - rankB;
              });

            setAllTokens(tokensWithBalances);
            console.log(`[Token Modal] 📊 Processed ${tokensWithBalances.length} tokens for display`);
            
            // Log token distribution by chain
            const chainDistribution = tokensWithBalances.reduce((acc: any, token: any) => {
              acc[token.chainName] = (acc[token.chainName] || 0) + 1;
              return acc;
            }, {});
            console.log("[Token Modal] 📈 Token distribution by chain:", chainDistribution);
          }
        }
      } catch (error) {
        console.error("[Token Modal] ❌ Failed to load all tokens:", error);
        setAllTokens([]);
      } finally {
        setIsLoadingAllTokens(false);
      }
    };

    loadAllTokens();
  }, [isOpen, tokenBalances]);

  // Real-time CoinGecko token search - finds ANY token instantly!
  useEffect(() => {
    const searchCoinGeckoTokens = async () => {
      // Only search if user is actively typing (2+ characters)
      if (!isOpen || !searchQuery || searchQuery.length < 2) {
        setCoinGeckoTokens([]);
        return;
      }
      
      setIsLoadingCoinGecko(true);
      try {
        console.log(`[Token Search] 🔍 Searching CoinGecko for: "${searchQuery}"`);
        
        // Use server-side API to avoid rate limits
        const searchResponse = await fetch(
          `/api/search-tokens?q=${encodeURIComponent(searchQuery)}`
        );
        
        if (!searchResponse.ok) {
          throw new Error('Token search failed');
        }
        
        const searchData = await searchResponse.json();
        
        // Server API returns formatted tokens directly
        if (searchData.success && searchData.data) {
          console.log(`[Token Search] ✅ Found ${searchData.data.length} tokens for "${searchQuery}"`);
          setCoinGeckoTokens(searchData.data);
        } else {
          console.log(`[Token Search] ⚠️ No results for "${searchQuery}"`);
          setCoinGeckoTokens([]);
        }
        
      } catch (error) {
        console.error("[Token Search] ❌ Search failed:", error);
        setCoinGeckoTokens([]);
      } finally {
        setIsLoadingCoinGecko(false);
      }
    };

    // Debounce search to avoid too many API calls
    const debounceTimer = setTimeout(() => {
      searchCoinGeckoTokens();
    }, 800); // 800ms debounce

    return () => clearTimeout(debounceTimer);
  }, [isOpen, searchQuery]);

  useEffect(() => {
    const loadLiFiTokens = async () => {
      if (selectedChain) {
        setIsLoadingTokens(true)
        try {
          const tokens = await getSupportedTokens(selectedChain)
          console.log(`[v0] LiFi tokens for chain ${selectedChain}:`, tokens)

          // Convert LiFi token format to our Token interface
          const formattedTokens: Token[] = tokens.map((token: any) => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            chainId: token.chainId,
            chainName: CHAINS.find((c) => c.id === token.chainId)?.name || `Chain ${token.chainId}`,
            decimals: token.decimals,
            logoURI: token.logoURI,
          }))

          setLifiTokens(formattedTokens)
        } catch (error) {
          console.error("[v0] Failed to load LiFi tokens:", error)
          setLifiTokens([])
        } finally {
          setIsLoadingTokens(false)
        }
      } else {
        setLifiTokens([])
      }
    }

    loadLiFiTokens()
  }, [selectedChain, getSupportedTokens])

  const filteredChains = CHAINS.filter((chain) => chain.name.toLowerCase().includes(chainSearchQuery.toLowerCase()))

  // Helper function to map chain name to chainId
  const getChainIdFromName = (chainName: string): number => {
    const chainMap: { [key: string]: number } = {
      "Ethereum": 1,
      "Base": 8453,
      "Arbitrum": 42161,
      "BSC": 56,
      "Polygon": 137,
      "Optimism": 10,
      "Avalanche": 43114,
      "Fantom": 250,
    };
    return chainMap[chainName] || 1;
  };

  // Helper to get correct decimals based on token symbol and chain
  const getTokenDecimals = (symbol: string, chainId: number): number => {
    // USDT decimals vary by chain
    if (symbol === "USDT") {
      return [1, 42161, 137].includes(chainId) ? 6 : 18; // Eth, Arbitrum, Polygon use 6, BSC uses 18
    }
    // USDC always uses 6
    if (symbol === "USDC") return 6;
    // WBTC uses 8
    if (symbol === "WBTC") return 8;
    // Most tokens use 18
    return 18;
  };

  // Enhanced token deduplication and validation system with Rabby-style detection
  const allTokensCombined = useMemo(() => {
    const tokenMap = new Map<string, Token>();
    const seenAddresses = new Set<string>();
    
    // Helper function to create unique key for deduplication
    const createTokenKey = (token: Token) => `${token.symbol}-${token.chainId}-${token.address.toLowerCase()}`;
    
    // Helper function to validate token has proper contract address
    const isValidToken = (token: Token) => {
      // Skip tokens without proper contract addresses
      if (!token.address) {
        return false;
      }
      
      // Skip placeholder addresses
      if (token.address === "native" || token.address === "placeholder") {
        return false;
      }
      
      // Allow zero address for native tokens (ETH, BNB, etc.)
      if (token.address === "0x0000000000000000000000000000000000000000") {
        return true;
      }
      
      // Ensure address is valid format for EVM chains
      if (token.chainId !== 0 && token.chainId !== 99998 && token.chainId !== 99999) {
        if (token.address.length !== 42 || !token.address.startsWith('0x')) {
          return false;
        }
      }
      
      // For Solana tokens, allow base58 addresses
      if (token.chainId === 101) {
        if (token.address.length < 32 || token.address.length > 44) {
          return false;
        }
      }
      
      // For Cosmos tokens, allow bech32 addresses
      if (token.chainId === 99999) {
        if (!token.address.includes('1') || token.address.length < 20) {
          return false;
        }
      }
      
      return true;
    };
    
    // Helper function to add token with deduplication
    const addToken = (token: Token, priority: number = 0) => {
      if (!isValidToken(token)) return;
      
      const key = createTokenKey(token);
      const addressKey = `${token.address.toLowerCase()}-${token.chainId}`;
      
      // Skip if we've already seen this exact address-chain combination
      if (seenAddresses.has(addressKey)) {
        return;
      }
      
      // Add to seen addresses
      seenAddresses.add(addressKey);
      
      // Add token with priority (lower number = higher priority)
      tokenMap.set(key, {
        ...token,
        priority,
        source: token.source || "unknown"
      });
    };
    
    // 1. User's actual token balances first (highest priority - 1)
    tokenBalances.forEach((balance) => {
      const chainName = balance.chain || (balance.name.includes("(") ? balance.name.split("(")[1].replace(")", "") : "Ethereum");
      const chainId = getChainIdFromName(chainName);
      const decimals = getTokenDecimals(balance.symbol, chainId);
      
      addToken({
        symbol: balance.symbol,
        name: balance.name,
        address: balance.address === "native" ? "0x0000000000000000000000000000000000000000" : balance.address,
        chainId: chainId,
        chainName: chainName,
        balance: balance.balance,
        usdValue: `$${balance.usdValue.toFixed(2)}`,
        decimals: decimals,
        source: "wallet",
      }, 1);
    });
    
    // 2. Popular tokens with CORRECT addresses (priority 2)
    POPULAR_TOKENS_WITH_LOGOS.forEach((token) => {
      addToken({
        ...token,
        source: "popular",
      }, 2);
    });
    
    // 3. CoinGecko tokens (comprehensive list with verified addresses - priority 3)
    coinGeckoTokens.forEach((token) => {
      addToken({
        ...token,
        source: "coingecko",
      }, 3);
    });
    
    // 4. All tokens from comprehensive API (CoinGecko + all chains - priority 4)
    allTokens.forEach((token) => {
      addToken({
        ...token,
        source: token.source || "comprehensive",
      }, 4);
    });
    
    // 5. LiFi supported tokens for selected chain (priority 5)
    lifiTokens.forEach((token) => {
      addToken({
        ...token,
        source: "lifi",
      }, 5);
    });
    
    // Convert map to array and sort by priority, then by market cap rank
    const tokens = Array.from(tokenMap.values()).sort((a, b) => {
      // First sort by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Then by market cap rank (lower number = higher rank)
      const rankA = (a as any).marketCapRank || 999999;
      const rankB = (b as any).marketCapRank || 999999;
      return rankA - rankB;
    });
    
    console.log(`[TokenSelectionModal] 🔄 Processed ${tokens.length} unique tokens (removed duplicates)`);
    
    // Log token distribution by source
    const sourceDistribution = tokens.reduce((acc: any, token: any) => {
      acc[token.source] = (acc[token.source] || 0) + 1;
      return acc;
    }, {});
    console.log("[TokenSelectionModal] 📊 Token distribution by source:", sourceDistribution);
    
    return tokens;
  }, [tokenBalances, coinGeckoTokens, allTokens, lifiTokens]);

  const filteredTokens = allTokensCombined.filter((token) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
      )
    }

    // Filter by selected chain
    if (selectedChain) {
      return token.chainId === selectedChain
    }

    return true
  })

  const handleTokenSelect = (token: Token) => {
    console.log("[v0] Token selected:", {
      symbol: token.symbol,
      address: token.address,
      chainId: token.chainId,
      chainName: token.chainName,
      decimals: token.decimals,
    });
    onSelectToken(token)
    onClose()
  }

  const getTokenIcon = (token: Token) => {
    if (token.logoURI) {
      return (
        <img
          src={token.logoURI || "/placeholder.svg"}
          alt={token.symbol}
          className="w-8 h-8 rounded-full"
          onError={(e) => {
            // Fallback to text icon if image fails to load
            e.currentTarget.style.display = "none"
            e.currentTarget.nextElementSibling?.classList.remove("hidden")
          }}
        />
      )
    }

    
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-11/12 rounded-none bg-black border-none p-0">
        <div className="hidden md:flex gap-14 w-full h-full overflow-y-auto">
          {/* Left Sidebar - Chains */}
          <div className="w-64 border-2 border-yellow-400 p-4 overflow-y-auto">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search Chains"
                  value={chainSearchQuery}
                  onChange={(e) => setChainSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant={selectedChain === null ? "default" : "ghost"}
                className={`w-full justify-start text-left ${
                  selectedChain === null
                    ? "bg-yellow-400 text-black hover:bg-yellow-500"
                    : "text-white hover:bg-gray-800"
                }`}
                onClick={() => setSelectedChain(null)}
              >
                <div className="w-5 h-5 mr-2 bg-gray-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🌐</span>
                </div>
                All Chains
              </Button>

              <div className="text-sm text-gray-400 font-medium mb-2">Popular Chains</div>

              {filteredChains.slice(0, 15).map((chain) => (
                <Button
                  key={chain.id}
                  variant={selectedChain === chain.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left ${
                    selectedChain === chain.id
                      ? "bg-yellow-400 text-black hover:bg-yellow-500"
                      : "text-white hover:bg-gray-800"
                  }`}
                  onClick={() => setSelectedChain(chain.id)}
                >
                  <img
                    src={chain.icon || "/placeholder.svg"}
                    alt={chain.name}
                    className="w-5 h-5 mr-2 rounded-full"
                    onError={(e) => {
                      // Fallback to colored circle if image fails
                      e.currentTarget.style.display = "none"
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                  <div className="w-5 h-5 mr-2 bg-blue-500 rounded-full items-center justify-center text-white text-xs font-bold hidden">
                    {chain.name.charAt(0)}
                  </div>
                  {chain.name}
                </Button>
              ))}

              <div className="text-sm text-gray-400 font-medium mb-2 mt-4">Chains A-Z</div>

              {filteredChains.slice(15).map((chain) => (
                <Button
                  key={chain.id}
                  variant={selectedChain === chain.id ? "default" : "ghost"}
                  className={`w-full justify-start text-left ${
                    selectedChain === chain.id
                      ? "bg-yellow-400 text-black hover:bg-yellow-500"
                      : "text-white hover:bg-gray-800"
                  }`}
                  onClick={() => setSelectedChain(chain.id)}
                >
                  <img
                    src={chain.icon || "/placeholder.svg"}
                    alt={chain.name}
                    className="w-5 h-5 mr-2 rounded-full"
                    onError={(e) => {
                      // Fallback to colored circle if image fails
                      e.currentTarget.style.display = "none"
                      const fallback = e.currentTarget.nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = "flex"
                    }}
                  />
                  <div className="w-5 h-5 mr-2 bg-blue-500 rounded-full items-center justify-center text-white text-xs font-bold hidden">
                    {chain.name.charAt(0)}
                  </div>
                  {chain.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Right Side - Tokens */}
          <div className="flex-1 w-full p-4 border-2 border-yellow-400 overflow-y-auto">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-white text-lg flex items-center justify-between">
                <span>Select Token</span>
                {walletContext === "secondary" && (
                  <span className="text-xs font-normal bg-purple-600/20 text-purple-400 border border-purple-500/50 px-3 py-1 rounded">
                    📍 Secondary Wallet Balances
                  </span>
                )}
                {walletContext === "primary" && (
                  <span className="text-xs font-normal bg-blue-600/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded">
                    📍 Primary Wallet Balances
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search for a token or paste address"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-900 border-gray-700 text-white"
                />
              </div>
              
              {/* Contract Address Search */}
              <div className="relative">
                <Input
                  placeholder="Enter contract address (0x...)"
                  value={customTokenAddress}
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  className="bg-gray-900 border-gray-700 text-white"
                />
                <Button
                  onClick={() => fetchTokenByAddress(customTokenAddress)}
                  disabled={!customTokenAddress || isLoadingCustomToken || customTokenAddress.length !== 42}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 text-xs"
                >
                  {isLoadingCustomToken ? "Loading..." : "Add Token"}
                </Button>
              </div>
              
              {/* Custom Token Display */}
              {customToken && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <TokenIconWithFallback
                        symbol={customToken.symbol}
                        logoURI={customToken.logoURI}
                        size={24}
                      />
                      <div>
                        <div className="text-white font-medium">{customToken.symbol}</div>
                        <div className="text-gray-400 text-sm">{customToken.name}</div>
                        <div className="text-gray-500 text-xs">{customToken.address}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        onSelectToken(customToken)
                        onClose()
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
                    >
                      Select
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Helpful hint when no search/filter */}
            {!searchQuery && !selectedChain && !isLoadingCoinGecko && (
              <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 mb-3">
                <p className="text-yellow-400 text-xs">
                  💡 <strong>Tip:</strong> Search for ANY token listed on CoinGecko (e.g., &ldquo;WEN&rdquo;, &ldquo;PEPE&rdquo;, &ldquo;SHIB&rdquo;)
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Real-time search covers 10,000+ tokens across 50+ blockchains
                </p>
              </div>
            )}

            {(isLoadingTokens || isLoadingCoinGecko) && (
              <div className="space-y-2 mb-3">
                {/* Loading skeleton */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                      <div className="space-y-1">
                        <div className="w-16 h-4 bg-gray-700 rounded"></div>
                        <div className="w-24 h-3 bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <div className="w-12 h-4 bg-gray-700 rounded"></div>
                  </div>
                ))}
                <p className="text-center text-gray-400 text-sm mt-2">
                  {isLoadingCoinGecko && searchQuery && `🔍 Searching CoinGecko for ${searchQuery}...`}
                  {isLoadingCoinGecko && !searchQuery && "Loading CoinGecko tokens..."}
                  {isLoadingTokens && selectedChain && `Loading ${CHAINS.find((c) => c.id === selectedChain)?.name} tokens...`}
                </p>
              </div>
            )}

            <div className="text-sm text-gray-400 font-medium mb-3 flex items-center justify-between">
              <span>
                {selectedChain ? `${CHAINS.find((c) => c.id === selectedChain)?.name} Tokens` : searchQuery ? "Search Results" : "Your Tokens"}
              </span>
              <span className="text-xs text-yellow-400">
                {filteredTokens.length > 100 ? `Showing 100 of ${filteredTokens.length}` : `${filteredTokens.length} available`}
              </span>
            </div>

            {/* Show loading indicator for comprehensive tokens */}
            {isLoadingAllTokens && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-3 text-center">
                <p className="text-blue-400 font-medium">🌍 Loading all tokens from CoinGecko...</p>
                <p className="text-gray-400 text-xs mt-1">
                  Fetching tokens across all supported chains
                </p>
              </div>
            )}

            {/* Show message if search returned no results */}
            {searchQuery && searchQuery.length >= 2 && filteredTokens.length === 0 && !isLoadingCoinGecko && !isLoadingAllTokens && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-3 text-center">
                <p className="text-red-400 font-medium">No tokens found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-gray-400 text-xs mt-1">
                  Try: Different spelling, token symbol, or check CoinGecko.com
                </p>
              </div>
            )}

            {filteredTokens.length > 100 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 mb-3">
                <p className="text-blue-400 text-xs text-center">
                  ⚡ Showing top 100 results. Use search or chain filter to narrow down.
                </p>
              </div>
            )}

            <div className="space-y-2 max-h-[400px]">
              {filteredTokens.slice(0, 100).map((token, index) => (
  <div
    key={`${token.symbol}-${token.chainId}-${index}`}
    className="flex items-center justify-between p-3 hover:bg-gray-900 rounded-lg cursor-pointer border border-transparent hover:border-gray-700"
    onClick={() => handleTokenSelect(token)}
  >
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center relative">
        <TokenIconWithFallback
          symbol={token.symbol}
          address={token.address}
          chainId={token.chainId}
          chainName={token.chainName}
          tokenId={'id' in token ? token.id : undefined}
          logoURI={'logoURI' in token ? token.logoURI : undefined}
          className="w-full h-full rounded-full"
          size={32}
        />
        
        {/* Chain badge overlay */}
        {token.chainId && token.address !== "0x0000000000000000000000000000000000000000" && (
          <div className="absolute bottom-[-2px] right-[-2px] w-3 h-3 rounded-full border border-black bg-black">
            <img
              src={CHAINS.find((c) => c.id === token.chainId)?.icon}
              alt={token.chainName}
    className="w-full h-full rounded-full"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
          </div>
        )}
      </div>

      <div>
        <div className="text-white font-medium">{token.symbol}</div>
        <div className="text-gray-400 text-sm">
          {token.chainName} • {token.address.slice(0, 6)}...{token.address.slice(-4)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {(token as any).source === 'wallet' && '💰 Your Balance'}
          {(token as any).source === 'coingecko' && '🔍 CoinGecko Verified'}
          {(token as any).source === 'comprehensive' && '🌍 Multi-Chain'}
          {(token as any).source === 'popular' && '⭐ Popular Token'}
          {(token as any).source === 'lifi' && '🌉 LiFi Supported'}
          {(token as any).source === 'verified' && '✅ Verified Address'}
          {(token as any).source === 'unverified' && '⚠️ Unverified'}
          {(token as any).isPlaceholder && '⚠️ Address Required'}
        </div>
      </div>
    </div>
    <div className="text-right">
      <div className="text-white font-medium">{'usdValue' in token ? token.usdValue : "$0.00"}</div>
      <div className="text-gray-400 text-sm">{'balance' in token ? token.balance : "0"}</div>
    </div>
  </div>
))}

            </div>
          </div>
        </div>



   {/* --- Mobile Layout --- */}
<div className="flex flex-col md:hidden h-[90vh] w-full bg-[#0A0A0A]">
  {/* Header */}
  <div className="flex flex-col px-4 py-3 border-b border-gray-800 space-y-2">
    <div className="flex items-center justify-between">
      <DialogTitle className="text-white text-base font-semibold">
        Select Token
      </DialogTitle>
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-white text-lg font-light"
      >
        ✕
      </button>
    </div>
    {/* Wallet context indicator */}
    {walletContext === "secondary" && (
      <div className="text-xs bg-purple-600/20 text-purple-400 border border-purple-500/50 px-2 py-1 rounded w-fit">
        📍 Secondary Wallet Balances
      </div>
    )}
    {walletContext === "primary" && (
      <div className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/50 px-2 py-1 rounded w-fit">
        📍 Primary Wallet Balances
      </div>
    )}
  </div>

  {/* Search + Chain selector */}
  <div className="p-4 border-b border-gray-800">
    <div className="relative mb-3">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <Input
        placeholder="Search for a token or paste address"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10 bg-[#1A1A1A] border-none text-white rounded-md"
      />
    </div>

    {/* Chain dropdown toggle */}
    <button
      onClick={() => setShowChains((prev) => !prev)}
      className="flex items-center justify-between w-full px-3 py-2 bg-[#1A1A1A] rounded-md text-sm text-gray-300"
    >
      <div className="flex items-center gap-2">
        <img
          src={
            selectedChain
              ? CHAINS.find((c) => c.id === selectedChain)?.icon
              : "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/eth.png"
          }
          alt="chain"
          className="w-4 h-4"
        />
        <span>
          {selectedChain
            ? CHAINS.find((c) => c.id === selectedChain)?.name
            : "All Chains"}
        </span>
      </div>
      <ChevronDown
        className={`h-4 w-4 text-gray-400 transition-transform ${
          showChains ? "rotate-180" : "rotate-0"
        }`}
      />
    </button>

    {/* Chain dropdown list */}
    {showChains && (
      <div className="mt-3 max-h-[220px] overflow-y-auto bg-[#111111] rounded-md border border-gray-800">
        <button
          onClick={() => {
            setSelectedChain(null);
            setShowChains(false);
          }}
          className={`flex items-center w-full px-4 py-2 text-sm ${
            selectedChain === null
              ? "bg-yellow-400 text-black"
              : "text-gray-200 hover:bg-[#1E1E1E]"
          }`}
        >
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center text-xs">
              🌐
            </div>
            All Chains
          </span>
        </button>

        {filteredChains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => {
              setSelectedChain(chain.id);
              setShowChains(false);
            }}
            className={`flex items-center w-full px-4 py-2 text-sm ${
              selectedChain === chain.id
                ? "bg-yellow-400 text-black"
                : "text-gray-200 hover:bg-[#1E1E1E]"
            }`}
          >
            <img
              src={chain.icon}
              alt={chain.name}
              className="w-4 h-4 mr-2 rounded-full"
            />
            {chain.name}
          </button>
        ))}
      </div>
    )}
  </div>

  {/* Helpful hint for mobile */}
  {!searchQuery && !selectedChain && !isLoadingCoinGecko && (
    <div className="px-4 mb-2">
      <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-2">
        <p className="text-yellow-400 text-xs">
          💡 <strong>Search ANY token on CoinGecko!</strong>
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          Try: WEN, PEPE, SHIB, or any token name
        </p>
      </div>
    </div>
  )}

  {/* Loading state for mobile */}
  {(isLoadingTokens || isLoadingCoinGecko) && (
    <div className="px-4 space-y-2 mb-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-[#1A1A1A] rounded-lg animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
            <div className="space-y-1">
              <div className="w-16 h-3 bg-gray-700 rounded"></div>
              <div className="w-24 h-2 bg-gray-700 rounded"></div>
            </div>
          </div>
          <div className="w-12 h-3 bg-gray-700 rounded"></div>
        </div>
      ))}
    </div>
  )}

  {/* Tokens list */}
  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
    <div className="text-gray-400 text-sm mb-2 flex justify-between items-center">
      <span>
      {selectedChain
        ? `${CHAINS.find((c) => c.id === selectedChain)?.name} Tokens`
          : searchQuery ? "Search Results" : "Your Tokens"}
      </span>
      <span className="text-xs text-yellow-400">{filteredTokens.length}</span>
    </div>

    {filteredTokens.slice(0, 50).map((token, index) => (
      <div
        key={`${token.symbol}-${index}`}
        className="flex items-center justify-between p-3 hover:bg-[#141414] rounded-lg cursor-pointer"
        onClick={() => handleTokenSelect(token)}
      >
        <div className="flex items-center space-x-3">
          {/* Token icon */}
          <div className="relative w-8 h-8 flex items-center justify-center">
            <TokenIconWithFallback
              symbol={token.symbol}
              address={token.address}
              chainId={token.chainId}
              chainName={token.chainName}
              tokenId={'id' in token ? token.id : undefined}
              logoURI={'logoURI' in token ? token.logoURI : undefined}
              className="w-full h-full rounded-full"
              size={32}
            />
            
            {/* Chain badge overlay */}
            {token.chainId && token.address !== "0x0000000000000000000000000000000000000000" && (
              <div className="absolute bottom-[-2px] right-[-2px] w-3 h-3 rounded-full border border-black bg-black">
              <img
                  src={CHAINS.find((c) => c.id === token.chainId)?.icon}
                alt={token.chainName}
                  className="w-full h-full rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
              />
              </div>
            )}
          </div>

          {/* Token Info */}
          <div>
            <div className="text-white font-medium text-sm">{token.symbol}</div>
            <div className="text-gray-500 text-xs">
              {token.chainName} {token.address && "·"}{" "}
              {token.address
                ? `${token.address.slice(0, 6)}...${token.address.slice(-4)}`
                : ""}
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="text-right">
          <div className="text-white text-sm font-semibold">
            {token.usdValue || "$0.00"}
          </div>
          <div className="text-gray-500 text-xs">
            {token.balance || "0.0000"}
          </div>
        </div>
      </div>
    ))}
  </div>
</div>

      </DialogContent>
    </Dialog>
  )
}
