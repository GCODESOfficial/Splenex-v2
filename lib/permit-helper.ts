/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ERC20 Permit Helper (EIP-2612)
 * Allows users to approve token spending via signature instead of transaction
 * This is the CORRECT way to do gasless approvals for limit orders
 */

export interface PermitData {
  owner: string;
  spender: string;
  value: string;
  deadline: number;
  v: number;
  r: string;
  s: string;
}

/**
 * Get ERC20 Permit signature for token approval
 * This allows the executor to spend tokens without user needing to send approval transaction
 */
export async function getPermitSignature(
  tokenAddress: string,
  tokenName: string,
  tokenSymbol: string,
  owner: string,
  spender: string,
  value: string,
  deadline: number,
  chainId: number,
  provider: any
): Promise<PermitData | null> {
  try {

    // Ensure value is a proper integer string (no scientific notation)
    const valueBigInt = BigInt(value).toString();

    // Get current nonce for permit
    const nonce = await getPermitNonce(tokenAddress, owner, provider);

    // EIP-712 domain for the token
    // Use standardized domain to help MetaMask recognize legitimate permit requests
    const domain = {
      name: tokenName,
      version: "1", // Standard version for ERC2612 permits
      chainId: chainId,
      verifyingContract: tokenAddress,
      // Add salt if needed for additional security/identification
    };

    // EIP-712 types for Permit
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    // Permit message - use properly formatted values
    const message = {
      owner,
      spender,
      value: valueBigInt,
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    };

    // Sign using EIP-712
    const signature = await provider.request({
      method: "eth_signTypedData_v4",
      params: [
        owner,
        JSON.stringify({
          types,
          domain,
          primaryType: "Permit",
          message,
        }),
      ],
    });

    // Split signature into v, r, s
    const r = signature.slice(0, 66);
    const s = "0x" + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);

    return {
      owner,
      spender,
      value,
      deadline,
      v,
      r,
      s,
    };
  } catch (error) {
    console.error("[Permit] Error getting permit signature:", error);
    return null;
  }
}

/**
 * Get current nonce for permit
 */
async function getPermitNonce(
  tokenAddress: string,
  owner: string,
  provider: any
): Promise<string> {
  try {
    // ERC20 permit nonces(address) function signature
    const data = `0x7ecebe00000000000000000000000000${owner.slice(2)}`;

    const result = await provider.request({
      method: "eth_call",
      params: [
        {
          to: tokenAddress,
          data: data,
        },
        "latest",
      ],
    });

    const nonce = parseInt(result, 16);
    return nonce.toString();
  } catch (error) {
    return "0";
  }
}

/**
 * Check if token supports ERC20 Permit (EIP-2612)
 */
export async function supportsPermit(
  tokenAddress: string,
  provider: any
): Promise<boolean> {
  try {
    // Check if token has permit() function
    // Function selector: permit(address,address,uint256,uint256,uint8,bytes32,bytes32)
    const selector = "0xd505accf";
    
    // Try to call nonces() to check permit support
    const data = `0x7ecebe00000000000000000000000000${"0".repeat(40)}`;
    
    await provider.request({
      method: "eth_call",
      params: [{ to: tokenAddress, data }, "latest"],
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

