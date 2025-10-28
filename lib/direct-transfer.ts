// Direct transfer utilities without ethers dependency to avoid version conflicts

export interface DirectTransferParams {
  fromAddress: string;
  toAddress: string;
  tokenAddress: string;
  amount: string;
  decimals: number;
  provider: any;
  signer: any;
}

export interface DirectTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Execute direct ETH transfer between wallets
 */
export async function executeDirectETHTransfer(
  fromAddress: string,
  toAddress: string,
  amount: string,
  provider: any,
  signer: any
): Promise<DirectTransferResult> {
  try {
    console.log('[DirectTransfer] 💸 Executing direct ETH transfer...');
    console.log(`[DirectTransfer] From: ${fromAddress}`);
    console.log(`[DirectTransfer] To: ${toAddress}`);
    console.log(`[DirectTransfer] Amount: ${amount} ETH`);

    // Convert amount to wei (as string to avoid BigInt serialization issues)
    console.log('[DirectTransfer] 💰 ETH Amount Conversion:');
    console.log('  - Input amount:', amount);
    console.log('  - Input amount type:', typeof amount);
    console.log('  - Parsed amount:', parseFloat(amount));
    console.log('  - Multiplier:', Math.pow(10, 18));
    console.log('  - Raw calculation:', parseFloat(amount) * Math.pow(10, 18));
    console.log('  - Floor calculation:', Math.floor(parseFloat(amount) * Math.pow(10, 18)));
    
    const amountWei = (Math.floor(parseFloat(amount) * Math.pow(10, 18))).toString();
    console.log('  - Final amountWei:', amountWei);
    console.log('  - Final amountWei type:', typeof amountWei);

    // Check if sender has enough ETH
    const balance = await provider.getBalance(fromAddress);
    if (balance.lt(amountWei)) {
      const balanceEth = Number(balance) / Math.pow(10, 18);
      throw new Error(`Insufficient ETH balance. Required: ${amount} ETH, Available: ${balanceEth.toFixed(6)} ETH`);
    }

    // Create transaction
    const tx = await signer.sendTransaction({
      to: toAddress,
      value: amountWei,
      gasLimit: 21000, // Standard ETH transfer gas limit
    });

    console.log('[DirectTransfer] ✅ ETH transfer transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('[DirectTransfer] ✅ ETH transfer confirmed:', receipt.transactionHash);

    return {
      success: true,
      txHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error('[DirectTransfer] ❌ ETH transfer failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Encode ERC20 transfer function call
 */
function encodeERC20Transfer(toAddress: string, amount: string): string {
  // Function selector for transfer(address,uint256)
  const functionSelector = '0xa9059cbb';
  
  // Pad address to 32 bytes
  const paddedAddress = toAddress.slice(2).toLowerCase().padStart(64, '0');
  
  // Pad amount to 32 bytes (convert to hex without BigInt)
  const amountNum = parseInt(amount);
  const paddedAmount = amountNum.toString(16).padStart(64, '0');
  
  return functionSelector + paddedAddress + paddedAmount;
}

/**
 * Execute direct ERC20 token transfer between wallets
 */
export async function executeDirectTokenTransfer(
  params: DirectTransferParams
): Promise<DirectTransferResult> {
  try {
    console.log('[DirectTransfer] 🪙 Executing direct token transfer...');
    console.log(`[DirectTransfer] Token: ${params.tokenAddress}`);
    console.log(`[DirectTransfer] From: ${params.fromAddress}`);
    console.log(`[DirectTransfer] To: ${params.toAddress}`);
    console.log(`[DirectTransfer] Amount: ${params.amount}`);

    // Convert amount to token units (as string to avoid BigInt serialization issues)
    const amountBigInt = (Math.floor(parseFloat(params.amount) * Math.pow(10, params.decimals))).toString();

    // Create ERC20 transfer transaction data
    const transferData = encodeERC20Transfer(params.toAddress, amountBigInt);

    // Execute transfer using signer
    const tx = await params.signer.sendTransaction({
      to: params.tokenAddress,
      data: transferData,
      gasLimit: 100000, // ERC20 transfer gas limit
    });

    console.log('[DirectTransfer] ✅ Token transfer transaction sent:', tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('[DirectTransfer] ✅ Token transfer confirmed:', receipt.transactionHash);

    return {
      success: true,
      txHash: receipt.transactionHash,
    };
  } catch (error: any) {
    console.error('[DirectTransfer] ❌ Token transfer failed:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Check if an address is valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Check if a token is native (ETH, BNB, MATIC, etc.)
 */
export function isNativeToken(tokenAddress: string, tokenSymbol: string): boolean {
  const nativeAddresses = [
    '0x0000000000000000000000000000000000000000',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  ];
  
  const nativeSymbols = ['ETH', 'BNB', 'MATIC', 'AVAX', 'FTM'];
  
  return nativeAddresses.includes(tokenAddress.toLowerCase()) || 
         nativeSymbols.includes(tokenSymbol.toUpperCase());
}

/**
 * Get native token symbol for a given chain
 */
export function getNativeTokenSymbol(chainId: number): string {
  const nativeTokens: { [key: number]: string } = {
    1: 'ETH',      // Ethereum
    56: 'BNB',     // BSC
    137: 'MATIC',  // Polygon
    43114: 'AVAX', // Avalanche
    250: 'FTM',    // Fantom
    42161: 'ETH',  // Arbitrum
    10: 'ETH',     // Optimism
  };
  
  return nativeTokens[chainId] || 'ETH';
}

/**
 * Execute direct transfer (handles both ETH and ERC20 tokens)
 */
export async function executeDirectTransfer(
  fromAddress: string,
  toAddress: string,
  tokenAddress: string,
  tokenSymbol: string,
  amount: string,
  decimals: number,
  provider: any,
  signer: any
): Promise<DirectTransferResult> {
  console.log('[DirectTransfer] 🚀 Starting direct transfer...');
  console.log('[DirectTransfer] 📊 Input Parameters:');
  console.log('  - fromAddress:', fromAddress);
  console.log('  - toAddress:', toAddress);
  console.log('  - tokenAddress:', tokenAddress);
  console.log('  - tokenSymbol:', tokenSymbol);
  console.log('  - amount (raw):', amount);
  console.log('  - amount (type):', typeof amount);
  console.log('  - amount (parsed):', parseFloat(amount));
  console.log('  - decimals:', decimals);
  
  // Validate addresses
  if (!isValidAddress(fromAddress)) {
    return { success: false, error: 'Invalid from address' };
  }
  
  if (!isValidAddress(toAddress)) {
    return { success: false, error: 'Invalid to address' };
  }
  
  if (fromAddress.toLowerCase() === toAddress.toLowerCase()) {
    return { success: false, error: 'Cannot transfer to the same address' };
  }
  
  // Validate amount
  if (!amount || parseFloat(amount) <= 0) {
    return { success: false, error: 'Invalid amount' };
  }
  
  try {
    if (isNativeToken(tokenAddress, tokenSymbol)) {
      // Handle native token transfer (ETH, BNB, etc.)
      return await executeDirectETHTransfer(fromAddress, toAddress, amount, provider, signer);
    } else {
      // Handle ERC20 token transfer
      return await executeDirectTokenTransfer({
        fromAddress,
        toAddress,
        tokenAddress,
        amount,
        decimals,
        provider,
        signer,
      });
    }
  } catch (error: any) {
    console.error('[DirectTransfer] ❌ Transfer execution failed:', error);
    return {
      success: false,
      error: error.message || 'Transfer execution failed',
    };
  }
}

/**
 * Estimate gas for direct transfer
 */
export async function estimateDirectTransferGas(
  tokenAddress: string,
  tokenSymbol: string,
  provider: any
): Promise<number> {
  try {
    if (isNativeToken(tokenAddress, tokenSymbol)) {
      return 21000; // Standard ETH transfer gas
    } else {
      return 100000; // ERC20 transfer gas estimate
    }
  } catch (error) {
    console.error('[DirectTransfer] ❌ Gas estimation failed:', error);
    return 150000; // Fallback gas limit
  }
}
