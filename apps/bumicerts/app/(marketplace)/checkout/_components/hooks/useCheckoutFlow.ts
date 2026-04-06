"use client";

import { useState, useCallback } from "react";

/**
 * Checkout flow states:
 * - idle: editing amounts, not paying
 * - signing: waiting for EIP-3009 signature
 * - processing: server distributing to orgs
 * - success: payment completed
 * - error: payment failed
 */
export type CheckoutState =
  | "idle"
  | "signing"
  | "processing"
  | "success"
  | "error";

export type CheckoutItem = {
  id: string;
  bumicertId: string;
  activityUri: string;
  orgDid: string;
  title: string;
  organizationName: string;
  amount: number;
};

export type CheckoutResult = {
  donorToFacilitatorHash: string;
  totalAmount: string;
  itemCount: number;
  successCount: number;
  results: Array<{
    activityUri: string;
    orgDid: string;
    amount: string;
    recipientWallet: string;
    transactionHash: string;
    receiptUri: string | null;
    success: boolean;
    error?: string;
  }>;
};

interface UseCheckoutFlowReturn {
  state: CheckoutState;
  error: string | null;
  result: CheckoutResult | null;
  setState: (state: CheckoutState) => void;
  setError: (error: string | null) => void;
  setResult: (result: CheckoutResult | null) => void;
  reset: () => void;
}

export function useCheckoutFlow(): UseCheckoutFlowReturn {
  const [state, setState] = useState<CheckoutState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setResult(null);
  }, []);

  return {
    state,
    error,
    result,
    setState,
    setError,
    setResult,
    reset,
  };
}
