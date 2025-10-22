// Revenue configuration
export const REVENUE_CONFIG = {
  // Revenue wallet address that receives the 50% gas fee charge (from .env)
  WALLET_ADDRESS: process.env.NEXT_PUBLIC_REVENUE_WALLET_ADDRESS || "",
  
  // Additional charge percentage (50% of gas fee)
  ADDITIONAL_CHARGE_PERCENTAGE: 0.5,
} as const;

/**
 * Calculate revenue from gas fee
 * @param gasFee - Original gas fee in USD
 * @returns Object containing total gas fee and revenue amount
 */
export function calculateGasRevenue(gasFee: number) {
  const additionalCharge = gasFee * REVENUE_CONFIG.ADDITIONAL_CHARGE_PERCENTAGE;
  const totalGasFee = gasFee + additionalCharge;
  const revenue = additionalCharge;
  
  return {
    originalGasFee: gasFee,
    additionalCharge,
    totalGasFee,
    revenue,
    revenueWallet: REVENUE_CONFIG.WALLET_ADDRESS,
  };
}
