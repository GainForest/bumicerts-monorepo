"use client";

import { useCallback } from "react";
import { useSignTypedData } from "wagmi";
import { clientEnv } from "@/lib/env/client";
import { toUsdcUnits, EIP3009_TYPES } from "@/lib/facilitator/usdc";
import type { CheckoutItem, CheckoutResult } from "./useCheckoutFlow";

interface UseBatchPaymentParams {
  address: `0x${string}` | undefined;
  donorDid: string | undefined;
  anonymous: boolean;
  onSigning: () => void;
  onProcessing: () => void;
  onSuccess: (result: CheckoutResult) => void;
  onError: (error: string) => void;
}

export function useBatchPayment({
  address,
  donorDid,
  anonymous,
  onSigning,
  onProcessing,
  onSuccess,
  onError,
}: UseBatchPaymentParams) {
  const { signTypedDataAsync } = useSignTypedData();

  const executeBatchPayment = useCallback(
    async (items: CheckoutItem[], totalAmount: number) => {
      if (!address) {
        onError("Wallet not connected");
        return;
      }

      const facilitatorWallet = clientEnv.NEXT_PUBLIC_FACILITATOR_WALLET_ADDRESS;
      if (!facilitatorWallet) {
        onError("Facilitator wallet not configured");
        return;
      }

      // Build EIP-3009 typed data for transfer to facilitator
      const now = Math.floor(Date.now() / 1000);
      const nonce = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")}` as `0x${string}`;

      const usdcAmount = toUsdcUnits(totalAmount);

      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: 8453,
        verifyingContract:
          "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`,
      };

      const message = {
        from: address,
        to: facilitatorWallet as `0x${string}`,
        value: usdcAmount,
        validAfter: BigInt(0),
        validBefore: BigInt(now + 300),
        nonce,
      };

      const authorization = {
        from: address,
        to: facilitatorWallet,
        value: usdcAmount.toString(),
        validAfter: "0",
        validBefore: String(now + 300),
        nonce,
      };

      onSigning();

      let signature: `0x${string}`;
      try {
        signature = await signTypedDataAsync({
          domain,
          types: EIP3009_TYPES,
          primaryType: "TransferWithAuthorization",
          message,
        });
      } catch {
        onError("Signature rejected");
        return;
      }

      onProcessing();

      // Build request payload
      const sigPayload = {
        x402Version: 2,
        scheme: "exact",
        networkId: "eip155:8453",
        payload: { signature, authorization },
      };
      const sigHeader = Buffer.from(JSON.stringify(sigPayload)).toString("base64");

      const requestBody = {
        items: items.map((item) => ({
          activityUri: item.activityUri,
          orgDid: item.orgDid,
          amount: String(item.amount),
        })),
        totalAmount: String(totalAmount),
        currency: "USDC",
        donorDid: anonymous ? undefined : donorDid,
        anonymous,
      };

      try {
        const res = await fetch("/api/fund/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "PAYMENT-SIGNATURE": sigHeader,
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error ?? "Payment failed");
        }

        const data = (await res.json()) as CheckoutResult;
        onSuccess(data);
      } catch (err) {
        console.error("[useBatchPayment] Payment failed:", err);
        onError(err instanceof Error ? err.message : "Payment failed");
      }
    },
    [address, donorDid, anonymous, onSigning, onProcessing, onSuccess, onError, signTypedDataAsync]
  );

  return { executeBatchPayment };
}
