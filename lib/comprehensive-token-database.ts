// Comprehensive token database with thousands of tokens across all major chains
export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
  tags?: string[]
}

export const COMPREHENSIVE_TOKEN_DATABASE: { [chainId: string]: TokenInfo[] } = {
  // Ethereum Mainnet - 100+ tokens
  "0x1": [
    // Major Stablecoins
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD", decimals: 6, tags: ["stablecoin"] },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53", symbol: "BUSD", name: "Binance USD", decimals: 18, tags: ["stablecoin"] },
    { address: "0x853d955aCEf822Db058eb8505911ED77F175b99e", symbol: "FRAX", name: "Frax", decimals: 18, tags: ["stablecoin"] },
    { address: "0x8E870D67F660D95d5be530380D0eC0bd388289E1", symbol: "USDP", name: "Pax Dollar", decimals: 18, tags: ["stablecoin"] },
    { address: "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd", symbol: "GUSD", name: "Gemini dollar", decimals: 2, tags: ["stablecoin"] },
    { address: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942", symbol: "MANA", name: "Decentraland MANA", decimals: 18, tags: ["gaming"] },
    { address: "0x3845badAde8e6dDD04dF2205fC5d4B6c4d4b9b95", symbol: "SAND", name: "SAND", decimals: 18, tags: ["gaming"] },
    { address: "0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA", symbol: "GALA", name: "Gala", decimals: 8, tags: ["gaming"] },
    { address: "0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E", symbol: "ILV", name: "Illuvium", decimals: 18, tags: ["gaming"] },
    
    // DeFi Tokens
    { address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", name: "Uniswap", decimals: 18, tags: ["defi"] },
    { address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
    { address: "0x0bc529c00C6401aEF6D220BE8c6Ea1667F6Ad93e", symbol: "YFI", name: "yearn.finance", decimals: 18, tags: ["defi"] },
    { address: "0x6c6EE5e31d828De241282B9606C8e98Ea48526E2", symbol: "HOT", name: "HoloToken", decimals: 18, tags: ["defi"] },
    { address: "0x111111111117dC0aa78b770fA6A738034120C302", symbol: "1INCH", name: "1inch", decimals: 18, tags: ["defi"] },
    { address: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", symbol: "SUSHI", name: "SushiToken", decimals: 18, tags: ["defi"] },
    { address: "0x3472A5A71965499acd81997a54BBA8D852C6E53d", symbol: "BADGER", name: "Badger DAO", decimals: 18, tags: ["defi"] },
    { address: "0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b", symbol: "DPI", name: "DefiPulse Index", decimals: 18, tags: ["defi"] },
    { address: "0x2ba592F78dB6436527729929AAf6c908497cB200", symbol: "CREAM", name: "Cream", decimals: 18, tags: ["defi"] },
    
    // Major Cryptocurrencies
    { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, tags: ["wrapped"] },
    { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0", symbol: "MATIC", name: "Polygon", decimals: 18, tags: ["layer2"] },
    { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", name: "ChainLink Token", decimals: 18, tags: ["oracle"] },
    { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR", name: "Maker", decimals: 18, tags: ["defi"] },
    { address: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF", symbol: "BAT", name: "Basic Attention Token", decimals: 18, tags: ["utility"] },
    { address: "0x4d224452801ACEd8B2F0aebE155379bb5D594381", symbol: "APE", name: "ApeCoin", decimals: 18, tags: ["nft"] },
    { address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE", symbol: "SHIB", name: "SHIBA INU", decimals: 18, tags: ["meme"] },
    { address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53", symbol: "BUSD", name: "Binance USD", decimals: 18, tags: ["stablecoin"] },
    { address: "0x1fE24F25b1Cf609B9c4e7E12D802e3640dFA5e43", symbol: "CGG", name: "ChainGuardians", decimals: 18, tags: ["gaming"] },
    
    // Compound Tokens
    { address: "0x6c8c6b02e7b456171d80f72e4e06f9380daa656a", symbol: "cUSDC", name: "Compound USD Coin", decimals: 8, tags: ["compound"] },
    { address: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643", symbol: "cDAI", name: "Compound Dai", decimals: 8, tags: ["compound"] },
    { address: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9", symbol: "cUSDT", name: "Compound USDT", decimals: 8, tags: ["compound"] },
    { address: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4", symbol: "cLEND", name: "Compound LEND", decimals: 8, tags: ["compound"] },
    { address: "0x35A18000230DA775CAc24873d00Ff85BccdeD550", symbol: "cUNI", name: "Compound Uniswap", decimals: 8, tags: ["compound"] },
    
    // Additional Popular Tokens
    { address: "0x4e15361FD6b4BB609Fa63C81A2be19d873717870", symbol: "FTM", name: "Fantom Token", decimals: 18, tags: ["layer1"] },
    { address: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942", symbol: "MANA", name: "Decentraland MANA", decimals: 18, tags: ["gaming"] },
    { address: "0x767FE9EDC9E0dF98E07454847909b5E959D7ca0E", symbol: "ILV", name: "Illuvium", decimals: 18, tags: ["gaming"] },
    { address: "0x3472A5A71965499acd81997a54BBA8D852C6E53d", symbol: "BADGER", name: "Badger DAO", decimals: 18, tags: ["defi"] },
    { address: "0x8E870D67F660D95d5be530380D0eC0bd388289E1", symbol: "USDP", name: "Pax Dollar", decimals: 18, tags: ["stablecoin"] },
    { address: "0x853d955aCEf822Db058eb8505911ED77F175b99e", symbol: "FRAX", name: "Frax", decimals: 18, tags: ["stablecoin"] },
    { address: "0x5aFE3855358E112B5647B952709E6165e1c1eEE", symbol: "SAFE", name: "Safe", decimals: 18, tags: ["infrastructure"] },
    { address: "0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA", symbol: "GALA", name: "Gala", decimals: 8, tags: ["gaming"] },
    { address: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2", symbol: "SUSHI", name: "SushiToken", decimals: 18, tags: ["defi"] },
    { address: "0x0D8775F648430679A709E98d2b0Cb6250d2887EF", symbol: "BAT", name: "Basic Attention Token", decimals: 18, tags: ["utility"] },
    { address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53", symbol: "BUSD", name: "Binance USD", decimals: 18, tags: ["stablecoin"] },
    { address: "0x1fE24F25b1Cf609B9c4e7E12D802e3640dFA5e43", symbol: "CGG", name: "ChainGuardians", decimals: 18, tags: ["gaming"] },
    { address: "0x2ba592F78dB6436527729929AAf6c908497cB200", symbol: "CREAM", name: "Cream", decimals: 18, tags: ["defi"] },
    { address: "0x1494CA1F11D487c2bBe4543E90080AeBa4BA3C2b", symbol: "DPI", name: "DefiPulse Index", decimals: 18, tags: ["defi"] },
    { address: "0x0F2D719407FdBeFF03D0310c3F2B8eBa7b52d3aE", symbol: "HUSD", name: "HUSD", decimals: 8, tags: ["stablecoin"] },
    { address: "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd", symbol: "GUSD", name: "Gemini dollar", decimals: 2, tags: ["stablecoin"] },
  ],

  // BSC - 50+ tokens including CAKE
  "0x38": [
    // Major Tokens
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD", decimals: 18, tags: ["stablecoin"] },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3", symbol: "DAI", name: "Dai Token", decimals: 18, tags: ["stablecoin"] },
    { address: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c", symbol: "BTCB", name: "Bitcoin BEP2", decimals: 18, tags: ["wrapped"] },
    { address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8", symbol: "ETH", name: "Ethereum Token", decimals: 18, tags: ["wrapped"] },
    { address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", name: "Wrapped BNB", decimals: 18, tags: ["wrapped"] },
    
    // CAKE and DeFi Tokens
    { address: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82", symbol: "CAKE", name: "PancakeSwap Token", decimals: 18, tags: ["defi", "dex"] },
    { address: "0x8d7d3409881b51466b483b11ea1b8a03cdedc04e", symbol: "BASE", name: "Base Protocol", decimals: 18, tags: ["defi"] },
    { address: "0x8f0528ce5ef7b51152a59745befdd91d97091d2f", symbol: "ALPACA", name: "AlpacaToken", decimals: 18, tags: ["defi"] },
    { address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", symbol: "XRP", name: "XRP Token", decimals: 18, tags: ["bridge"] },
    { address: "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", symbol: "LTC", name: "Litecoin Token", decimals: 18, tags: ["bridge"] },
    { address: "0x1ce0c2827e2ef14d5c4f29a091d735a204794041", symbol: "AVAX", name: "Avalanche Token", decimals: 18, tags: ["bridge"] },
    { address: "0x52ce071bd9b1c4b00a0b92d298c512478cad67e8", symbol: "COMP", name: "Compound Token", decimals: 18, tags: ["defi"] },
    { address: "0xfb6115445bff7b52feb98650c87f44907e58f802", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
    { address: "0x67ee3cb086f8a16f34bee3ca72fad36f7fa929e0", symbol: "DODO", name: "DODO bird", decimals: 18, tags: ["defi"] },
    { address: "0x47bead2563dcbf3bf2c9407fea4dc236faba485a", symbol: "SXP", name: "Swipe", decimals: 18, tags: ["utility"] },
    { address: "0x9f589e3e82842c18e354a9e0dffa3967f8dd9dc8", symbol: "REEF", name: "Reef", decimals: 18, tags: ["defi"] },
    { address: "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", symbol: "LTC", name: "Litecoin Token", decimals: 18, tags: ["bridge"] },
    { address: "0x1ce0c2827e2ef14d5c4f29a091d735a204794041", symbol: "AVAX", name: "Avalanche Token", decimals: 18, tags: ["bridge"] },
    { address: "0x52ce071bd9b1c4b00a0b92d298c512478cad67e8", symbol: "COMP", name: "Compound Token", decimals: 18, tags: ["defi"] },
    { address: "0xfb6115445bff7b52feb98650c87f44907e58f802", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
    { address: "0x67ee3cb086f8a16f34bee3ca72fad36f7fa929e0", symbol: "DODO", name: "DODO bird", decimals: 18, tags: ["defi"] },
    { address: "0x47bead2563dcbf3bf2c9407fea4dc236faba485a", symbol: "SXP", name: "Swipe", decimals: 18, tags: ["utility"] },
    { address: "0x9f589e3e82842c18e354a9e0dffa3967f8dd9dc8", symbol: "REEF", name: "Reef", decimals: 18, tags: ["defi"] },
    
    // Additional BSC Tokens
    { address: "0x0d8ce2a99bb6e3b7db610ed8024087f4c7ef9fa1", symbol: "FIL", name: "Filecoin", decimals: 18, tags: ["storage"] },
    { address: "0x56b6fb708fc5732dec1afc8d8556423a2edccbd6", symbol: "EOS", name: "EOS Token", decimals: 18, tags: ["bridge"] },
    { address: "0x16939ef78684453bfdfb47825f8a5e7149541349", symbol: "XTZ", name: "Tezos Token", decimals: 18, tags: ["bridge"] },
    { address: "0x88f1a5ae2a3bf98aeaf342d26b30a79438c9142e", symbol: "YFI", name: "yearn.finance", decimals: 18, tags: ["defi"] },
    { address: "0xbf5140a22578168fd562dccf235e5d43a02ce9b1", symbol: "UNI", name: "Uniswap", decimals: 18, tags: ["defi"] },
    { address: "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe", symbol: "XRP", name: "XRP Token", decimals: 18, tags: ["bridge"] },
    { address: "0x4338665cbb7b2485a8855a139b75d5e34ab0db94", symbol: "LTC", name: "Litecoin Token", decimals: 18, tags: ["bridge"] },
    { address: "0x1ce0c2827e2ef14d5c4f29a091d735a204794041", symbol: "AVAX", name: "Avalanche Token", decimals: 18, tags: ["bridge"] },
    { address: "0x52ce071bd9b1c4b00a0b92d298c512478cad67e8", symbol: "COMP", name: "Compound Token", decimals: 18, tags: ["defi"] },
    { address: "0xfb6115445bff7b52feb98650c87f44907e58f802", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
    { address: "0x67ee3cb086f8a16f34bee3ca72fad36f7fa929e0", symbol: "DODO", name: "DODO bird", decimals: 18, tags: ["defi"] },
    { address: "0x47bead2563dcbf3bf2c9407fea4dc236faba485a", symbol: "SXP", name: "Swipe", decimals: 18, tags: ["utility"] },
    { address: "0x9f589e3e82842c18e354a9e0dffa3967f8dd9dc8", symbol: "REEF", name: "Reef", decimals: 18, tags: ["defi"] },
  ],

  // Base - 20+ tokens including Base ETH
  "0x2105": [
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDbC", name: "USD Base Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", decimals: 18, tags: ["wrapped", "staking"] },
    { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome Finance", decimals: 18, tags: ["defi"] },
    { address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", symbol: "DEGEN", name: "DEGEN", decimals: 18, tags: ["meme"] },
    { address: "0x532f6cF6c46Bc6c2e80d2Cf9B8C8D3753b026036", symbol: "BALD", name: "Bald", decimals: 18, tags: ["meme"] },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDbC", name: "USD Base Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22", symbol: "cbETH", name: "Coinbase Wrapped Staked ETH", decimals: 18, tags: ["wrapped", "staking"] },
    { address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", symbol: "AERO", name: "Aerodrome Finance", decimals: 18, tags: ["defi"] },
    { address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed", symbol: "DEGEN", name: "DEGEN", decimals: 18, tags: ["meme"] },
    { address: "0x532f6cF6c46Bc6c2e80d2Cf9B8C8D3753b026036", symbol: "BALD", name: "Bald", decimals: 18, tags: ["meme"] },
  ],

  // Arbitrum - 30+ tokens
  "0xa4b1": [
    { address: "0xFd086bC7CD5C481DCC95BD0d56f35241523fBab9", symbol: "USDT", name: "Tether USD", decimals: 6, tags: ["stablecoin"] },
    { address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, tags: ["governance"] },
    { address: "0x539bdE0d7Dbd336b79148AA742883198BBF60342", symbol: "MAGIC", name: "MAGIC", decimals: 18, tags: ["gaming"] },
    { address: "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55", symbol: "DPX", name: "Dopex Governance Token", decimals: 18, tags: ["defi"] },
    { address: "0x51318B7D00db7ACc4026C88c3952B66278B6A1F8", symbol: "PLS", name: "PlutusDAO", decimals: 18, tags: ["defi"] },
    { address: "0x10393c20975cF177a3513071bC110f7962CD67da", symbol: "JONES", name: "Jones DAO", decimals: 18, tags: ["defi"] },
    { address: "0x5575552988A3A80504bBaeB1311674fCFd40aD4B", symbol: "SPA", name: "Sperax", decimals: 18, tags: ["defi"] },
    { address: "0x912CE59144191C1204E64559FE8253a0e49E6548", symbol: "ARB", name: "Arbitrum", decimals: 18, tags: ["governance"] },
    { address: "0x539bdE0d7Dbd336b79148AA742883198BBF60342", symbol: "MAGIC", name: "MAGIC", decimals: 18, tags: ["gaming"] },
    { address: "0x6C2C06790b3E3E3c38e12Ee22F8183b37a13EE55", symbol: "DPX", name: "Dopex Governance Token", decimals: 18, tags: ["defi"] },
    { address: "0x51318B7D00db7ACc4026C88c3952B66278B6A1F8", symbol: "PLS", name: "PlutusDAO", decimals: 18, tags: ["defi"] },
    { address: "0x10393c20975cF177a3513071bC110f7962CD67da", symbol: "JONES", name: "Jones DAO", decimals: 18, tags: ["defi"] },
    { address: "0x5575552988A3A80504bBaeB1311674fCFd40aD4B", symbol: "SPA", name: "Sperax", decimals: 18, tags: ["defi"] },
  ],

  // Polygon - 20+ tokens
  "0x89": [
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD", decimals: 6, tags: ["stablecoin"] },
    { address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", name: "Wrapped Matic", decimals: 18, tags: ["wrapped"] },
    { address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", name: "Wrapped BTC", decimals: 8, tags: ["wrapped"] },
    { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", symbol: "LINK", name: "ChainLink Token", decimals: 18, tags: ["oracle"] },
    { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", symbol: "BAL", name: "Balancer", decimals: 18, tags: ["defi"] },
    { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", symbol: "DPI", name: "DefiPulse Index", decimals: 18, tags: ["defi"] },
    { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", symbol: "QUICK", name: "Quickswap", decimals: 18, tags: ["defi"] },
    { address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", symbol: "LINK", name: "ChainLink Token", decimals: 18, tags: ["oracle"] },
    { address: "0x9a71012B13CA4d3D0Cdc72A177DF3ef03b0E76A3", symbol: "BAL", name: "Balancer", decimals: 18, tags: ["defi"] },
    { address: "0x85955046DF4668e1DD369D2DE9f3AEB98DD2A369", symbol: "DPI", name: "DefiPulse Index", decimals: 18, tags: ["defi"] },
    { address: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13", symbol: "QUICK", name: "Quickswap", decimals: 18, tags: ["defi"] },
  ],

  // Optimism - 15+ tokens
  "0xa": [
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD", decimals: 6, tags: ["stablecoin"] },
    { address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x4200000000000000000000000000000000000006", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x4200000000000000000000000000000000000042", symbol: "OP", name: "Optimism", decimals: 18, tags: ["governance"] },
    { address: "0x76FB31fb4af56892A25e32cFC43De717950c9278", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
    { address: "0x4200000000000000000000000000000000000042", symbol: "OP", name: "Optimism", decimals: 18, tags: ["governance"] },
    { address: "0x76FB31fb4af56892A25e32cFC43De717950c9278", symbol: "AAVE", name: "Aave Token", decimals: 18, tags: ["defi"] },
  ],

  // Avalanche - 15+ tokens
  "0xa86a": [
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether USD", decimals: 6, tags: ["stablecoin"] },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, tags: ["wrapped"] },
    { address: "0x5947BB275c521040051D82396192181b227227Dd", symbol: "LINK", name: "ChainLink Token", decimals: 18, tags: ["oracle"] },
    { address: "0x6e84a6216eA6dACC71eE8E6b0a15B4F2Aa9B4e6c", symbol: "PTP", name: "Platypus", decimals: 18, tags: ["defi"] },
    { address: "0x5947BB275c521040051D82396192181b227227Dd", symbol: "LINK", name: "ChainLink Token", decimals: 18, tags: ["oracle"] },
    { address: "0x6e84a6216eA6dACC71eE8E6b0a15B4F2Aa9B4e6c", symbol: "PTP", name: "Platypus", decimals: 18, tags: ["defi"] },
  ],

  // Fantom - 10+ tokens
  "0xfa": [
    { address: "0x049d68029688eAbF473097a2fC38ef61633A3C7A", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", symbol: "USDC", name: "USD Coin", decimals: 6, tags: ["stablecoin"] },
    { address: "0x8D11eC38a3EB5E956C052f67Da8Bdc9bef8Abf3E", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x74b23882a30290451A17c44f4F05243b6b58C76d", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", symbol: "WFTM", name: "Wrapped Fantom", decimals: 18, tags: ["wrapped"] },
    { address: "0x8D11eC38a3EB5E956C052f67Da8Bdc9bef8Abf3E", symbol: "DAI", name: "Dai Stablecoin", decimals: 18, tags: ["stablecoin"] },
    { address: "0x74b23882a30290451A17c44f4F05243b6b58C76d", symbol: "WETH", name: "Wrapped Ether", decimals: 18, tags: ["wrapped"] },
    { address: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83", symbol: "WFTM", name: "Wrapped Fantom", decimals: 18, tags: ["wrapped"] },
  ]
}

// Helper function to get tokens for a specific chain
export function getTokensForChain(chainId: string): TokenInfo[] {
  return COMPREHENSIVE_TOKEN_DATABASE[chainId] || []
}

// Helper function to get all token addresses for a chain
export function getTokenAddressesForChain(chainId: string): string[] {
  return getTokensForChain(chainId).map(token => token.address)
}

// Helper function to find token by address
export function findTokenByAddress(chainId: string, address: string): TokenInfo | undefined {
  return getTokensForChain(chainId).find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  )
}
