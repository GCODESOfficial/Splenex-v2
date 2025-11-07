/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * EIP-712 Typed Data for Limit Orders
 * This is the CORRECT way to create limit orders in DeFi
 */

export interface LimitOrderData {
  maker: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  minReturnAmount: string;
  targetRate: string;
  expiryTimestamp: number;
  salt: string;
  chainId: number;
}

export interface LimitOrderSignature {
  order: LimitOrderData;
  signature: string;
  v: number;
  r: string;
  s: string;
}

/**
 * Get EIP-712 typed data signature for limit order
 * This signature authorizes the executor to perform the swap on user's behalf
 */
export async function signLimitOrder(
  orderData: LimitOrderData,
  walletAddress: string,
  provider: any
): Promise<LimitOrderSignature | null> {
  try {
    console.log("[LimitOrder] 🎯 Creating EIP-712 typed signature for order...");

    // EIP-712 domain
    // Use a clear, identifiable domain name to help MetaMask recognize legitimate limit orders
    const domain = {
      name: "Splenex Limit Orders",
      version: "1",
      chainId: orderData.chainId,
      // Use zero address as this is an off-chain signature, not a contract interaction
      verifyingContract: "0x0000000000000000000000000000000000000000",
    };

    // EIP-712 types
    const types = {
      LimitOrder: [
        { name: "maker", type: "address" },
        { name: "fromToken", type: "address" },
        { name: "toToken", type: "address" },
        { name: "fromAmount", type: "uint256" },
        { name: "minReturnAmount", type: "uint256" },
        { name: "targetRate", type: "uint256" },
        { name: "expiryTimestamp", type: "uint256" },
        { name: "salt", type: "uint256" },
      ],
    };

    // Order message
    const message = {
      maker: orderData.maker,
      fromToken: orderData.fromToken,
      toToken: orderData.toToken,
      fromAmount: orderData.fromAmount,
      minReturnAmount: orderData.minReturnAmount,
      targetRate: orderData.targetRate,
      expiryTimestamp: orderData.expiryTimestamp.toString(),
      salt: orderData.salt,
    };

    console.log("[LimitOrder] 📝 Requesting EIP-712 signature for limit order...");
    console.log("[LimitOrder] 🔒 This is a secure limit order signature");
    console.log("[LimitOrder] 💰 Amount:", orderData.fromAmount);
    console.log("[LimitOrder] 🎯 Target Rate:", orderData.targetRate);
    console.log("[LimitOrder] ⏰ Expires:", new Date(orderData.expiryTimestamp * 1000).toISOString());

    // Sign using EIP-712
    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [
        walletAddress,
        JSON.stringify({
          types,
          domain,
          primaryType: "LimitOrder",
          message,
        }),
      ],
    });

    console.log("[LimitOrder] ✅ Order signature obtained!");

    // Split signature
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);

    return {
      order: orderData,
      signature,
      v,
      r,
      s,
    };
  } catch (error) {
    console.error("[LimitOrder] Error signing order:", error);
    return null;
  }
}

/**
 * Generate unique salt for order
 */
export function generateOrderSalt(): string {
  return Date.now().toString() + Math.random().toString().slice(2, 10);
}

