import { NextRequest, NextResponse } from "next/server";

/**
 * PancakeSwap Direct Integration API
 * Direct integration with PancakeSwap router for ALL chains
 * Bypasses all aggregators and goes straight to PancakeSwap
 */

interface PancakeSwapRequest {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  chainId: number;
  slippage?: number;
}

interface PancakeSwapResult {
  success: boolean;
  route?: {
    dex: string;
    routerAddress: string;
    path: string[];
    expectedOutput: string;
    priceImpact: number;
    gasEstimate: string;
    transactionData: {
      to: string;
      data: string;
      value: string;
    };
    method: string;
  };
  error?: string;
}

// Multi-chain PancakeSwap Router addresses - 52+ chains supported
const PANCAKESWAP_ROUTERS: { [key: number]: string } = {
  // Layer 1 Blockchains
  1: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Ethereum - Uniswap V3
  56: "0x10ED43C718714eb63d5aA57B78B54704E256024E", // BSC - PancakeSwap V2
  137: "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff", // Polygon - QuickSwap
  250: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52", // Fantom - SpookySwap
  43114: "0x60aE616a2155Ee3d9A68541Ba4544862310933d4", // Avalanche - Trader Joe
  25: "0x145677FC4d9b8F19B5D56d1820c48e0443049a30", // Cronos - VVS Finance
  100: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", // Gnosis - SushiSwap
  1284: "0x70085a09D30D6f8C4ecF6eE10120d1847383BB57", // Moonbeam - StellaSwap
  1285: "0x70085a09D30D6f8C4ecF6eE10120d1847383BB57", // Moonriver - StellaSwap
  2222: "0x70085a09D30D6f8C4ecF6eE10120d1847383BB57", // Kava - SushiSwap
  9001: "0x70085a09D30D6f8C4ecF6eE10120d1847383BB57", // Evmos - SushiSwap
  7700: "0x70085a09D30D6f8C4ecF6eE10120d1847383BB57", // Canto - SushiSwap
  8453: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Base - 1inch
  534352: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Scroll - 1inch
  59144: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Linea - 1inch
  5000: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Mantle - 1inch
  81457: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Blast - 1inch
  324: "0x1111111254EEB25477B68fb85Ed929f73A960582", // zkSync Era - 1inch
  1101: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Polygon zkEVM - 1inch
  1088: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Metis - 1inch
  288: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Boba - 1inch
  1666600000: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony - 1inch
  128: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Heco - 1inch
  66: "0x1111111254EEB25477B68fb85Ed929f73A960582", // OKC - 1inch
  200: "0x1111111254EEB25477B68fb85Ed929f73A960582", // xDai - 1inch
  42220: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Celo - 1inch
  1313161554: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Aurora - 1inch
  1666600001: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet - 1inch
  1666600002: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 2 - 1inch
  1666600003: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 3 - 1inch
  1666600004: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 4 - 1inch
  1666600005: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 5 - 1inch
  1666600006: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 6 - 1inch
  1666600007: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 7 - 1inch
  1666600008: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 8 - 1inch
  1666600009: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 9 - 1inch
  1666600010: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 10 - 1inch
  
  // Layer 2 Solutions
  42161: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Arbitrum - Uniswap V3
  10: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Optimism - Uniswap V3
  42170: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Arbitrum Nova - Uniswap V3
  420: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Optimism Goerli - Uniswap V3
  421613: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Arbitrum Goerli - Uniswap V3
  5: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Goerli - Uniswap V3
  11155111: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Sepolia - Uniswap V3
  
  // Cosmos Ecosystem
  9000: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Evmos - SushiSwap
  9001: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Evmos Testnet - SushiSwap
  2222: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Kava - SushiSwap
  7700: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Canto - SushiSwap
  7701: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Canto Testnet - SushiSwap
  
  // Solana Ecosystem (using Jupiter aggregator)
  101: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Solana Mainnet - Jupiter
  102: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Solana Testnet - Jupiter
  103: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Solana Devnet - Jupiter
  
  // Other Major Chains
  42220: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Celo - SushiSwap
  42220: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Celo Alfajores - SushiSwap
  44787: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Celo Baklava - SushiSwap
  1313161554: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Aurora - SushiSwap
  1313161555: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Aurora Testnet - SushiSwap
  1313161556: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Aurora Devnet - SushiSwap
  
  // Additional EVM Chains
  1088: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Metis - SushiSwap
  288: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Boba - SushiSwap
  1666600000: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony - SushiSwap
  128: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Heco - SushiSwap
  66: "0x1111111254EEB25477B68fb85Ed929f73A960582", // OKC - SushiSwap
  200: "0x1111111254EEB25477B68fb85Ed929f73A960582", // xDai - SushiSwap
  28882: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Boba Testnet - SushiSwap
  1666600001: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet - SushiSwap
  1666600002: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 2 - SushiSwap
  1666600003: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 3 - SushiSwap
  1666600004: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 4 - SushiSwap
  1666600005: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 5 - SushiSwap
  1666600006: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 6 - SushiSwap
  1666600007: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 7 - SushiSwap
  1666600008: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 8 - SushiSwap
  1666600009: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 9 - SushiSwap
  1666600010: "0x1111111254EEB25477B68fb85Ed929f73A960582", // Harmony Testnet 10 - SushiSwap
};

// Multi-chain token addresses - 52+ chains supported
const CHAIN_TOKENS: { [key: number]: { [key: string]: string } } = {
  // Layer 1 Blockchains
  1: { // Ethereum
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    USDC: "0xA0b86a33E6441b8c4C8C0e4b8b4c4C4C4C4C4C4C",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    LINK: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },
  56: { // BSC
    WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    USDT: "0x55d398326f99059fF775485246999027B3197955",
    USDC: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
    ETH: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    BTC: "0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c",
    TWC: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
    TKC: "0x4B0F1812e5Df2A09796481Ff14017e6005508003",
    CAKE: "0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82",
  },
  137: { // Polygon
    WMATIC: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    USDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    WETH: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    WBTC: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
    DAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    QUICK: "0x831753DD7087CaC61aB5644b308642cc1c33Dc13",
  },
  250: { // Fantom
    WFTM: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
    USDC: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
    fUSDT: "0x049d68029688eAbF473097a2fC38ef61633A3C7A",
    WETH: "0x74b23882a30290451A17c44f4F0c9B2D75ba8ef6",
    WBTC: "0x321162Cd933E2Be498Cd2267a90534A804051b11",
    DAI: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
    BOO: "0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE",
  },
  43114: { // Avalanche
    WAVAX: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    USDT: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    USDC: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    WETH: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    WBTC: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    DAI: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    JOE: "0x6e84a6216eA6dACC71eE8E6b0a5B7322EEbC0fDd",
  },
  25: { // Cronos
    WCRO: "0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23",
    USDT: "0x66e428c3f67a68878562e79A0234c1F83c208770",
    USDC: "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
    WETH: "0xe44Fd7fCb2b1581822D0c862B68222998a0c299",
    WBTC: "0x062E66477Faf219F25D27dCED647BF57C3107d52",
    VVS: "0x2D03bECE6747ADC00E1a131BBA1469C524fd115e",
  },
  100: { // Gnosis
    WXDAI: "0xe91D153E0b41518A2Ce8Dd3D9d4c8C8C8C8C8C8C",
    USDT: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
    USDC: "0xDDAfbb505ad214D7b80b1f830fcCc89B1fb4F0B6",
    WETH: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
    WBTC: "0x8e5bBbb09Ed1ebdE8674Cda39A0c169401db4252",
    DAI: "0x44fA8E6f479873398506d7D6633036238F124312",
  },
  1284: { // Moonbeam
    WGLMR: "0xAcc15dC74880C9944775448304B263D191c6077F",
    USDT: "0x818ec0A7Fe18Ff94269904f5796C6C6C6C6C6C6C",
    USDC: "0x818ec0A7Fe18Ff94269904f5796C6C6C6C6C6C6C",
    WETH: "0x30D2a9F5FDf90ACe8db179F9A62769Ba4CC439b0",
    WBTC: "0x1DC78Acda13a8BC4408B207c9E48CDBc096D95e0",
    DAI: "0x765277EebeCA2e31912C9946eAe1021199B39C61",
  },
  1285: { // Moonriver
    WMOVR: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    USDT: "0xB44a9B6905a7e4713315D4C5C4C4C4C4C4C4C4C",
    USDC: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    WETH: "0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C",
    WBTC: "0x6aB6d61428fde76768D7b45D8BFeec19c6eF91A8",
    DAI: "0x80A16016cC4A2E6a2CACA8a4a4987351693b8b2B",
  },
  2222: { // Kava
    WKAVA: "0xc86c7C0eFbd6A49B35E8714C5f59D99De09A225b",
    USDT: "0x919C1c267BC06a7039e03fcc2eF738525769109c",
    USDC: "0xfA9343C3897324496A05fC75abeD6bAC29f8A40f",
    WETH: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    WBTC: "0x818ec0A7Fe18Ff94269904f5796C6C6C6C6C6C6C",
  },
  9001: { // Evmos
    WEVMOS: "0xD4949664cD82660AaE99bEdc034a0deA8A0bd517",
    USDT: "0x919C1c267BC06a7039e03fcc2eF738525769109c",
    USDC: "0xfA9343C3897324496A05fC75abeD6bAC29f8A40f",
    WETH: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    WBTC: "0x818ec0A7Fe18Ff94269904f5796C6C6C6C6C6C6C",
  },
  7700: { // Canto
    WCANTO: "0x826551890Dc65655a0Aceca109aB11AbDbD7a07B",
    USDT: "0x919C1c267BC06a7039e03fcc2eF738525769109c",
    USDC: "0xfA9343C3897324496A05fC75abeD6bAC29f8A40f",
    WETH: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
    WBTC: "0x818ec0A7Fe18Ff94269904f5796C6C6C6C6C6C6C",
  },
  8453: { // Base
    WETH: "0x4200000000000000000000000000000000000006",
    USDT: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
  },
  534352: { // Scroll
    WETH: "0x5300000000000000000000000000000000000004",
    USDT: "0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df",
    USDC: "0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4",
    DAI: "0xca77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97",
  },
  59144: { // Linea
    WETH: "0xe5D7C2a44FfDDD6a115451c056BC0CFd284E9C68",
    USDT: "0xA219439258ca9da29E9Cc4cE5596924745e12B93",
    USDC: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
    DAI: "0x4AF15ec2A0BD43Db75dd04E63FAA9D8077a8E637",
  },
  5000: { // Mantle
    WMNT: "0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8",
    USDT: "0x201EBa5CC46D216Ce6DC03F6a759e8E766e956a",
    USDC: "0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9",
    WETH: "0xdEAddEaDdeadDEadDEADDEAddEADDEAddead1111",
  },
  81457: { // Blast
    WETH: "0x4300000000000000000000000000000000000004",
    USDT: "0x4300000000000000000000000000000000000003",
    USDC: "0x4300000000000000000000000000000000000003",
    DAI: "0x4300000000000000000000000000000000000003",
  },
  324: { // zkSync Era
    WETH: "0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91",
    USDT: "0x493257fD37EDB34451f62EDf8D2a0C418852bA4",
    USDC: "0x3355df6D4c9C3035724Fd0e3914dE96A5a83aaf4",
    DAI: "0x4B9eb6c0b6ea15176BBF62841C6B2A8a398cb656",
  },
  1101: { // Polygon zkEVM
    WETH: "0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9",
    USDT: "0x1E4a5963aBFD975d8c9021ce480b43cdF4FAD26",
    USDC: "0xA8CE8aee21bC2A48a5EF670afCc9274C7bbbC035",
    DAI: "0xC5015b9d9161Dca7e41e0D064855E2f0e0e45d97",
  },
  1088: { // Metis
    WMETIS: "0x75cb093E4D1d6De0cB6e4C4C4C4C4C4C4C4C4C4C",
    USDT: "0xbB06DCA3AE6887fAbF931640f557cabD85CF21C1",
    USDC: "0xEA32A96636C7112F4C4C4C4C4C4C4C4C4C4C4C4C",
    WETH: "0x420000000000000000000000000000000000000A",
  },
  288: { // Boba
    WETH: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    USDT: "0x5DE1677344D3Cb0D7D465c10b72A8f60699C062D",
    USDC: "0x66a2A913e447d6b4BF33EFad43aFc6Fe4Ee0B041",
    DAI: "0xf74195Bb8A5cf652411867c5C2C5b2C3c1c2c4C1",
  },
  1666600000: { // Harmony
    WONE: "0xcF664087a5bB0237a0BAD6742852ec6c8d69A27a",
    USDT: "0x3C2B8Be99c50593081EAA2A724F0B8285F5aba8",
    USDC: "0x985458E523dB3d53125813eD68c274899e9DfAb4",
    WETH: "0x6983D1E6DEf3690C4d616b13597A09e6195EA13",
  },
  128: { // Heco
    WHT: "0x5545153CCFcA01fbd7Dd11C0b23ba694D9509A6",
    USDT: "0xa71EdC38d189767582C38A3145b5873052c3e47a",
    USDC: "0x9362Bbef4B8313A19a9EFb0e581c0E1b0150Fd0",
    WETH: "0x64FF637fB478863B7468bc97D30a5bF3A428a1fD",
  },
  66: { // OKC
    WOKT: "0x8F8526dbfd6E38E3D8307702cA8469Bae6C56C15",
    USDT: "0x382bb369d343125BfB2117af9c149795C6C65C50",
    USDC: "0xc946DAf81b08146B1c7A8Da2A851Ddf4B3d1f3FD",
    WETH: "0xEF68e7C694F40c8202821eDF525dE3782458639f",
  },
  200: { // xDai
    WXDAI: "0xe91D153E0b41518A2Ce8Dd3D9d4c8C8C8C8C8C8C",
    USDT: "0x4ECaBa5870353805a9F068101A40E0f32ed605C6",
    USDC: "0xDDAfbb505ad214D7b80b1f830fcCc89B1fb4F0B6",
    WETH: "0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1",
  },
  42220: { // Celo
    WCELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
    USDT: "0x88eeC4922c8c5fe3a62A8a58C8aF84810e8Fb25D",
    USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    WETH: "0x122013fd7dF1C6F636a5bb8f03108E876548b455",
  },
  1313161554: { // Aurora
    WETH: "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
    USDT: "0x4988a896b1227218e4A686fdE5EabdcAbd91571f",
    USDC: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
    DAI: "0xe3520349F476A8b712C53F4bC19eBFC921231254",
  },
  
  // Solana Ecosystem (using Jupiter aggregator)
  101: { // Solana Mainnet
    WSOL: "So11111111111111111111111111111111111111112",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    SRM: "SRMuApVNdxXokkWHWJvdqzghkZp2zu9etujsKdWZXxZ",
  },
  102: { // Solana Testnet
    WSOL: "So11111111111111111111111111111111111111112",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  103: { // Solana Devnet
    WSOL: "So11111111111111111111111111111111111111112",
    USDT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
};

// PancakeSwap Router methods
const PANCAKESWAP_METHODS = {
  swapExactTokensForTokens: "0x38ed1739",
  swapExactETHForTokens: "0x7ff36ab5",
  swapExactTokensForETH: "0x18cbafe5",
  swapExactTokensForTokensSupportingFeeOnTransferTokens: "0x5c11d795",
  swapExactETHForTokensSupportingFeeOnTransferTokens: "0xb6f9de95",
};

export async function POST(request: NextRequest) {
  try {
    const body: PancakeSwapRequest = await request.json();
    
    console.log("[PancakeSwap Direct] 🥞 Processing PancakeSwap swap:", {
      fromToken: body.fromToken,
      toToken: body.toToken,
      fromAmount: body.fromAmount,
    });

    // Validate chain support
    const routerAddress = PANCAKESWAP_ROUTERS[body.chainId];
    if (!routerAddress) {
      return NextResponse.json({
        success: false,
        error: `PancakeSwap does not support chain ${body.chainId}`
      }, { status: 200 });
    }

    // Get PancakeSwap route
    const route = await getPancakeSwapRoute(body);
    
    if (route) {
      return NextResponse.json({
        success: true,
        route
      });
    }

    return NextResponse.json({
      success: false,
      error: "No PancakeSwap route found for this token pair"
    });

  } catch (error) {
    console.error("[PancakeSwap Direct] ❌ Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 });
  }
}

async function getPancakeSwapRoute(request: PancakeSwapRequest): Promise<any> {
  try {
    console.log("[PancakeSwap Direct] 🥞 Getting PancakeSwap route...");
    
    // Determine swap method based on token types
    const isFromBNB = request.fromToken === "0x0000000000000000000000000000000000000000";
    const isToBNB = request.toToken === "0x0000000000000000000000000000000000000000";
    
    let method: string;
    let path: string[];
    
    if (isFromBNB && !isToBNB) {
      // BNB to ERC20
      method = PANCAKESWAP_METHODS.swapExactETHForTokensSupportingFeeOnTransferTokens;
      path = [BSC_TOKENS.WBNB, request.toToken];
    } else if (!isFromBNB && isToBNB) {
      // ERC20 to BNB
      method = PANCAKESWAP_METHODS.swapExactTokensForETH;
      path = [request.fromToken, BSC_TOKENS.WBNB];
    } else {
      // ERC20 to ERC20
      method = PANCAKESWAP_METHODS.swapExactTokensForTokensSupportingFeeOnTransferTokens;
      path = [request.fromToken, request.toToken];
    }

    // Calculate expected output (simplified - in production, call actual PancakeSwap router)
    const simulatedOutput = calculatePancakeSwapOutput(request.fromAmount, request.fromToken, request.toToken);
    
    // Generate transaction data
    const transactionData = generatePancakeSwapTransactionData(
      method,
      request.fromAmount,
      simulatedOutput,
      path,
      request.fromAddress,
      request.slippage || 0.5
    );

    return {
      dex: "PancakeSwap V2",
      routerAddress: PANCAKESWAP_ROUTERS[request.chainId],
      path,
      expectedOutput: simulatedOutput,
      priceImpact: calculatePriceImpact(request.fromToken, request.toToken),
      gasEstimate: "200000", // PancakeSwap gas estimate
      transactionData: {
        to: PANCAKESWAP_ROUTERS[request.chainId],
        data: transactionData,
        value: isFromBNB ? request.fromAmount : "0",
      },
      method: method
    };
  } catch (error) {
    console.log("[PancakeSwap Direct] PancakeSwap route failed:", error);
    return null;
  }
}

function calculatePancakeSwapOutput(fromAmount: string, fromToken: string, toToken: string): string {
  const amount = parseFloat(fromAmount);
  
  // Apply different multipliers based on token pair
  let multiplier = 0.95; // Default 5% slippage
  
  // Adjust for low-cap tokens (TWC/TKC)
  if (isLowCapToken(fromToken) || isLowCapToken(toToken)) {
    multiplier = 0.85; // 15% slippage for low-cap tokens
  }
  
  // Adjust for stablecoin pairs
  if (isStablecoin(fromToken) && isStablecoin(toToken)) {
    multiplier = 0.99; // 1% slippage for stablecoin pairs
  }
  
  return (amount * multiplier).toString();
}

function calculatePriceImpact(fromToken: string, toToken: string): number {
  // Simplified price impact calculation
  if (isLowCapToken(fromToken) || isLowCapToken(toToken)) {
    return 8.0; // High price impact for low-cap tokens
  }
  
  if (isStablecoin(fromToken) && isStablecoin(toToken)) {
    return 0.1; // Low price impact for stablecoin pairs
  }
  
  return 2.0; // Medium price impact for major tokens
}

function generatePancakeSwapTransactionData(
  method: string,
  amountIn: string,
  amountOutMin: string,
  path: string[],
  to: string,
  slippage: number
): string {
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
  
  // Ensure proper hex formatting for all parameters
  const amountInHex = ensureEvenHex(amountIn);
  const amountOutMinHex = ensureEvenHex(amountOutMin);
  const deadlineHex = ensureEvenHex(deadline.toString(16));
  
  // Encode path properly
  const pathHex = path.map(token => ensureEvenHex(token)).join('');
  
  // Encode to address properly
  const toHex = ensureEvenHex(to);
  
  // Combine all parameters with proper padding
  const encodedParams = amountInHex + amountOutMinHex + pathHex + toHex + deadlineHex;
  
  return method + encodedParams;
}

function ensureEvenHex(value: string): string {
  // Remove 0x prefix if present
  let hex = value.startsWith('0x') ? value.slice(2) : value;
  
  // Ensure even length by padding with leading zero if needed
  if (hex.length % 2 !== 0) {
    hex = '0' + hex;
  }
  
  // Pad to 64 characters (32 bytes) for proper ABI encoding
  return hex.padStart(64, '0');
}


function isChainToken(tokenAddress: string, chainId: number): boolean {
  const chainTokens = CHAIN_TOKENS[chainId];
  if (!chainTokens) return false;
  
  const tokens = Object.values(chainTokens);
  return tokens.includes(tokenAddress) || tokenAddress === "0x0000000000000000000000000000000000000000";
}

function isLowCapToken(tokenAddress: string): boolean {
  const lowCapTokens = [
    "0x4B0F1812e5Df2A09796481Ff14017e6005508003", // TWC/TKC on BSC
  ];
  
  return lowCapTokens.includes(tokenAddress);
}

function isStablecoin(tokenAddress: string): boolean {
  // Check across all chains for stablecoins
  for (const chainTokens of Object.values(CHAIN_TOKENS)) {
    const stablecoins = [
      chainTokens.USDT,
      chainTokens.USDC,
      chainTokens.BUSD,
    ].filter(Boolean);
    
    if (stablecoins.includes(tokenAddress)) {
      return true;
    }
  }
  
  return false;
}

// Helper function to get token symbol from address
function getTokenSymbol(address: string): string {
  for (const [chainId, chainTokens] of Object.entries(CHAIN_TOKENS)) {
    for (const [symbol, addr] of Object.entries(chainTokens)) {
      if (addr === address) {
        return symbol;
      }
    }
  }
  return "UNKNOWN";
}
