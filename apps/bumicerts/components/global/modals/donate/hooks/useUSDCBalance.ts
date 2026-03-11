"use client";

import { useReadContract } from "wagmi";
import { USDC_CONTRACT, USDC_ABI, DECIMALS, CHAIN_ID } from "@/lib/facilitator/usdc";

/**
 * Reads the USDC balance of the connected wallet on Base mainnet.
 * Returns the balance as a human-readable string (e.g. "150.00").
 */
export function useUSDCBalance(address: `0x${string}` | undefined) {
  const { data: rawBalance, isLoading } = useReadContract({
    address:      USDC_CONTRACT,
    abi:          USDC_ABI,
    functionName: "balanceOf",
    args:         address ? [address] : undefined,
    chainId:      CHAIN_ID,
    query: {
      enabled:   !!address,
      staleTime: 30_000,
    },
  });

  const balance = rawBalance != null
    ? (Number(rawBalance) / 10 ** DECIMALS).toFixed(2)
    : null;

  return { balance, isLoading };
}
