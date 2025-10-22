/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Gelato Relay Integration for Gasless Meta-Transactions
 * Allows users to execute swaps without paying gas directly
 * Gelato relayer pays gas and charges the dApp via API key
 */

import { GelatoRelay, SponsoredCallRequest } from "@gelatonetwork/relay-sdk";

// Gelato-supported chains
export const GELATO_SUPPORTED_CHAINS = {
  1: "Ethereum",
  5: "Goerli",
  10: "Optimism",
  56: "BSC",
  100: "Gnosis",
  137: "Polygon",
  250: "Fantom",
  42161: "Arbitrum One",
  43114: "Avalanche",
  8453: "Base",
  84532: "Base Sepolia",
} as const;

export type GelatoChainId = keyof typeof GELATO_SUPPORTED_CHAINS;

/**
 * Check if chain is supported by Gelato
 */
export function isGelatoSupported(chainId: number): boolean {
  return chainId in GELATO_SUPPORTED_CHAINS;
}

/**
 * Get Gelato Relay instance
 */
export function getGelatoRelay(): GelatoRelay {
  return new GelatoRelay();
}

/**
 * Execute a gasless swap via Gelato Relay
 * @param targetContract - The DEX router or contract address
 * @param callData - Encoded function call data
 * @param chainId - Chain ID
 * @param userAddress - User's wallet address
 * @returns Task ID for tracking
 */
export async function executeGaslessSwap(
  targetContract: string,
  callData: string,
  chainId: number,
  userAddress: string
): Promise<{ taskId: string; success: boolean; error?: string }> {
  try {
    console.log("[Gelato] 🚀 Initiating gasless swap...");
    console.log("[Gelato] Chain:", GELATO_SUPPORTED_CHAINS[chainId as GelatoChainId] || chainId);
    console.log("[Gelato] Target:", targetContract);
    console.log("[Gelato] User:", userAddress);

    // Check if chain is supported
    if (!isGelatoSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported by Gelato Relay. Supported: ${Object.keys(GELATO_SUPPORTED_CHAINS).join(", ")}`);
    }

    // Get API key
    const apiKey = process.env.NEXT_PUBLIC_GELATO_API_KEY;
    if (!apiKey) {
      throw new Error("Gelato API key not configured. Set NEXT_PUBLIC_GELATO_API_KEY in environment.");
    }

    const relay = getGelatoRelay();

    // Prepare sponsored call request
    const request: SponsoredCallRequest = {
      chainId: chainId as GelatoChainId,
      target: targetContract,
      data: callData,
      user: userAddress,
    };

    console.log("[Gelato] 📤 Sending sponsored call request...");
    console.log("[Gelato] 💡 Gelato will pay gas, charge via API key");

    // Send sponsored call
    const response = await relay.sponsoredCall(request, apiKey);

    console.log("[Gelato] ✅ Relay task created!");
    console.log("[Gelato] Task ID:", response.taskId);
    console.log("[Gelato] 🔗 Track status at: https://relay.gelato.digital/tasks/status/" + response.taskId);

    return {
      taskId: response.taskId,
      success: true,
    };
  } catch (error) {
    console.error("[Gelato] ❌ Error:", error);
    return {
      taskId: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check task status from Gelato
 */
export async function getTaskStatus(taskId: string): Promise<{
  taskState: string;
  transactionHash?: string;
  executionDate?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`https://relay.gelato.digital/tasks/status/${taskId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch task status: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Gelato] Task status:", data.task?.taskState);

    return {
      taskState: data.task?.taskState || "Unknown",
      transactionHash: data.task?.transactionHash,
      executionDate: data.task?.executionDate,
    };
  } catch (error) {
    console.error("[Gelato] Error fetching task status:", error);
    return {
      taskState: "Error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Poll task until completion
 */
export async function waitForTaskCompletion(
  taskId: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  console.log("[Gelato] ⏳ Waiting for task completion...");
  console.log("[Gelato] Task ID:", taskId);

  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTaskStatus(taskId);

    if (status.taskState === "ExecSuccess") {
      console.log("[Gelato] ✅ Task completed successfully!");
      console.log("[Gelato] TX Hash:", status.transactionHash);
      return {
        success: true,
        transactionHash: status.transactionHash,
      };
    }

    if (status.taskState === "ExecReverted" || status.taskState === "Cancelled") {
      console.error("[Gelato] ❌ Task failed:", status.taskState);
      return {
        success: false,
        error: `Task ${status.taskState}`,
      };
    }

    if (status.taskState === "CheckPending" || status.taskState === "ExecPending" || status.taskState === "WaitingForConfirmation") {
      console.log(`[Gelato] ⏳ Status: ${status.taskState} (attempt ${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      continue;
    }

    // Unknown state, keep waiting
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return {
    success: false,
    error: "Timeout waiting for task completion",
  };
}

/**
 * Get estimated relay fee for a transaction
 */
export async function getRelayFee(
  targetContract: string,
  callData: string,
  chainId: number
): Promise<{ feeToken: string; fee: string; error?: string }> {
  try {
    // Gelato provides fee estimation
    // For now, return estimated fee (can be made dynamic)
    const estimatedFees: Record<number, string> = {
      1: "0.001", // Ethereum: ~$3-5
      56: "0.01",  // BSC: ~$0.05-0.10
      137: "0.5",  // Polygon: ~$0.01-0.02
      8453: "0.0005", // Base: ~$1-2
      42161: "0.0005", // Arbitrum: ~$0.10-0.20
    };

    const nativeTokens: Record<number, string> = {
      1: "ETH",
      56: "BNB",
      137: "MATIC",
      8453: "ETH",
      42161: "ETH",
    };

    return {
      feeToken: nativeTokens[chainId] || "ETH",
      fee: estimatedFees[chainId] || "0.001",
    };
  } catch (error) {
    return {
      feeToken: "ETH",
      fee: "0",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

