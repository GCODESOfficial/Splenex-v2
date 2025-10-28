import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

// Contract ABI (simplified for the key functions)
const SWAP_CONTRACT_ABI = [
  "function swapWithDEX(address tokenIn, address tokenOut, uint256 amountIn, uint256 minAmountOut, string calldata dexName, bytes calldata swapData) external payable",
  "function swapETHWithDEX(address tokenOut, uint256 minAmountOut, string calldata dexName, bytes calldata swapData) external payable",
  "function swapToETHWithDEX(address tokenIn, uint256 amountIn, uint256 minAmountOut, string calldata dexName, bytes calldata swapData) external payable",
  "function multiHopSwap(address[] calldata path, uint256 amountIn, uint256 minAmountOut, string calldata dexName, bytes calldata swapData) external payable",
  "function calculateGasFeeTax(uint256 gasUsed) external view returns (uint256 gasFeeTax)",
  "function isDEXSupported(string calldata dexName) external view returns (bool)",
  "function getDEXRouter(string calldata dexName) external view returns (address)",
  "function getSupportedDEXes() external view returns (string[] memory)",
  "event SwapExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 gasFeeTax, uint256 amountOut, string dexUsed)"
];

// Contract address (will be set after deployment)
const SWAP_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SWAP_CONTRACT_ADDRESS || "";

interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  dexName: string;
  swapData: string;
  userAddress: string;
}

interface ETHSwapParams {
  tokenOut: string;
  minAmountOut: string;
  dexName: string;
  swapData: string;
  userAddress: string;
  value: string;
}

interface TokenToETHSwapParams {
  tokenIn: string;
  amountIn: string;
  minAmountOut: string;
  dexName: string;
  swapData: string;
  userAddress: string;
}

interface MultiHopSwapParams {
  path: string[];
  amountIn: string;
  minAmountOut: string;
  dexName: string;
  swapData: string;
  userAddress: string;
}

interface GasFeeTaxCalculation {
  gasFeeTax: string;
  gasUsed: number;
}

export function useSplenexSwapContract() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get contract instance
   */
  const getContract = useCallback(() => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found');
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    
    return new ethers.Contract(SWAP_CONTRACT_ADDRESS, SWAP_CONTRACT_ABI, signer);
  }, []);

  /**
   * Calculate gas fee tax for a given gas usage
   */
  const calculateGasFeeTax = useCallback(async (gasUsed: number): Promise<GasFeeTaxCalculation> => {
    try {
      const contract = getContract();
      const gasFeeTax = await contract.calculateGasFeeTax(gasUsed);
      
      return {
        gasFeeTax: ethers.utils.formatEther(gasFeeTax),
        gasUsed: gasUsed
      };
    } catch (err) {
      console.error('[SplenexSwap] Gas fee tax calculation failed:', err);
      throw err;
    }
  }, [getContract]);

  /**
   * Check if DEX is supported
   */
  const isDEXSupported = useCallback(async (dexName: string): Promise<boolean> => {
    try {
      const contract = getContract();
      return await contract.isDEXSupported(dexName);
    } catch (err) {
      console.error('[SplenexSwap] DEX support check failed:', err);
      return false;
    }
  }, [getContract]);

  /**
   * Get supported DEXes
   */
  const getSupportedDEXes = useCallback(async (): Promise<string[]> => {
    try {
      const contract = getContract();
      return await contract.getSupportedDEXes();
    } catch (err) {
      console.error('[SplenexSwap] Failed to get supported DEXes:', err);
      return [];
    }
  }, [getContract]);

  /**
   * Execute token-to-token swap with gas fee tax collection
   */
  const executeTokenSwap = useCallback(async (params: SwapParams): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SplenexSwap] 🔄 Executing token swap with gas fee tax collection:', params);

      const contract = getContract();

      // Execute swap transaction
      const tx = await contract.swapWithDEX(
        params.tokenIn,
        params.tokenOut,
        params.amountIn,
        params.minAmountOut,
        params.dexName,
        params.swapData
      );

      console.log('[SplenexSwap] ✅ Swap transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[SplenexSwap] ✅ Swap confirmed:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';
      console.error('[SplenexSwap] ❌ Swap failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Execute ETH-to-token swap with gas fee tax collection
   */
  const executeETHSwap = useCallback(async (params: ETHSwapParams): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SplenexSwap] 🔄 Executing ETH swap with gas fee tax collection:', params);

      const contract = getContract();

      // Execute swap transaction
      const tx = await contract.swapETHWithDEX(
        params.tokenOut,
        params.minAmountOut,
        params.dexName,
        params.swapData,
        { value: params.value }
      );

      console.log('[SplenexSwap] ✅ ETH swap transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[SplenexSwap] ✅ ETH swap confirmed:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'ETH swap failed';
      console.error('[SplenexSwap] ❌ ETH swap failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Execute token-to-ETH swap with gas fee tax collection
   */
  const executeTokenToETHSwap = useCallback(async (params: TokenToETHSwapParams): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SplenexSwap] 🔄 Executing token-to-ETH swap with gas fee tax collection:', params);

      const contract = getContract();

      // Execute swap transaction
      const tx = await contract.swapToETHWithDEX(
        params.tokenIn,
        params.amountIn,
        params.minAmountOut,
        params.dexName,
        params.swapData
      );

      console.log('[SplenexSwap] ✅ Token-to-ETH swap transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[SplenexSwap] ✅ Token-to-ETH swap confirmed:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token-to-ETH swap failed';
      console.error('[SplenexSwap] ❌ Token-to-ETH swap failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Execute multi-hop swap with gas fee tax collection
   */
  const executeMultiHopSwap = useCallback(async (params: MultiHopSwapParams): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[SplenexSwap] 🔄 Executing multi-hop swap with gas fee tax collection:', params);

      const contract = getContract();

      // Execute swap transaction
      const tx = await contract.multiHopSwap(
        params.path,
        params.amountIn,
        params.minAmountOut,
        params.dexName,
        params.swapData
      );

      console.log('[SplenexSwap] ✅ Multi-hop swap transaction sent:', tx.hash);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('[SplenexSwap] ✅ Multi-hop swap confirmed:', receipt.transactionHash);
      
      return receipt.transactionHash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Multi-hop swap failed';
      console.error('[SplenexSwap] ❌ Multi-hop swap failed:', errorMessage);
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getContract]);

  /**
   * Listen to swap events
   */
  const listenToSwapEvents = useCallback((callback: (event: any) => void) => {
    try {
      const contract = getContract();
      
      contract.on('SwapExecuted', (user, tokenIn, tokenOut, amountIn, gasFeeTax, amountOut, dexUsed, event) => {
        console.log('[SplenexSwap] 📊 Swap event received:', {
          user,
          tokenIn,
          tokenOut,
          amountIn: ethers.utils.formatEther(amountIn),
          gasFeeTax: ethers.utils.formatEther(gasFeeTax),
          amountOut: ethers.utils.formatEther(amountOut),
          dexUsed,
          txHash: event.transactionHash
        });
        
        callback({
          user,
          tokenIn,
          tokenOut,
          amountIn: ethers.utils.formatEther(amountIn),
          gasFeeTax: ethers.utils.formatEther(gasFeeTax),
          amountOut: ethers.utils.formatEther(amountOut),
          dexUsed,
          txHash: event.transactionHash
        });
      });
      
      return () => {
        contract.removeAllListeners('SwapExecuted');
      };
    } catch (err) {
      console.error('[SplenexSwap] Failed to set up event listener:', err);
      return () => {};
    }
  }, [getContract]);

  return {
    // State
    isLoading,
    error,
    
    // Functions
    calculateGasFeeTax,
    isDEXSupported,
    getSupportedDEXes,
    executeTokenSwap,
    executeETHSwap,
    executeTokenToETHSwap,
    executeMultiHopSwap,
    listenToSwapEvents,
    
    // Contract info
    contractAddress: SWAP_CONTRACT_ADDRESS,
  };
}
