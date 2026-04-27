"use client";

import { useCallback } from "react";
import { useSignTypedData } from "wagmi";
import { clientEnv } from "@/lib/env/client";
import { toUsdcUnits, EIP3009_TYPES, CHAIN_ID, USDC_CONTRACT } from "@/lib/facilitator/usdc";
import type { CheckoutItem, CheckoutResult } from "./useCheckoutFlow";

interface UseBatchPaymentParams {
  address: `0x${string}` | undefined;
  donorDid: string | undefined;
  shouldStoreDonationAsAnonymous: boolean;
  onSigning: () => void;
  onProcessing: () => void;
  onSuccess: (result: CheckoutResult) => void;
  onError: (error: string) => void;
}

type HexAddress = `0x${string}`;

function isHexAddress(value: string): value is HexAddress {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function createNonce(): HexAddress {
  const nonce = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;

  if (!isHexAddress(nonce)) {
    throw new Error("Failed to create a valid nonce");
  }

  return nonce;
}

function parseCheckoutResult(value: unknown): CheckoutResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const donorToFacilitatorHash = Reflect.get(value, "donorToFacilitatorHash");
  const totalAmount = Reflect.get(value, "totalAmount");
  const donorRecordedAs = Reflect.get(value, "donorRecordedAs");
  const itemCount = Reflect.get(value, "itemCount");
  const successCount = Reflect.get(value, "successCount");
  const results = Reflect.get(value, "results");

  if (typeof donorToFacilitatorHash !== "string") return null;
  if (typeof totalAmount !== "string") return null;
  if (donorRecordedAs !== "did" && donorRecordedAs !== "wallet") return null;
  if (typeof itemCount !== "number") return null;
  if (typeof successCount !== "number") return null;
  if (!Array.isArray(results)) return null;

  return {
    donorToFacilitatorHash,
    totalAmount,
    donorRecordedAs,
    itemCount,
    successCount,
    results: results.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return {
          activityUri: "",
          orgDid: "",
          amount: "0",
          recipientWallet: "",
          transactionHash: "",
          receiptUri: null,
          success: false,
          error: "Invalid result entry",
        };
      }

      const entryActivityUri = Reflect.get(entry, "activityUri");
      const entryOrgDid = Reflect.get(entry, "orgDid");
      const entryAmount = Reflect.get(entry, "amount");
      const entryRecipientWallet = Reflect.get(entry, "recipientWallet");
      const entryTransactionHash = Reflect.get(entry, "transactionHash");
      const entryReceiptUri = Reflect.get(entry, "receiptUri");
      const entrySuccess = Reflect.get(entry, "success");
      const entryError = Reflect.get(entry, "error");

      return {
        activityUri: typeof entryActivityUri === "string" ? entryActivityUri : "",
        orgDid: typeof entryOrgDid === "string" ? entryOrgDid : "",
        amount: typeof entryAmount === "string" ? entryAmount : "0",
        recipientWallet:
          typeof entryRecipientWallet === "string" ? entryRecipientWallet : "",
        transactionHash:
          typeof entryTransactionHash === "string" ? entryTransactionHash : "",
        receiptUri:
          entryReceiptUri === null || typeof entryReceiptUri === "string"
            ? entryReceiptUri
            : null,
        success: entrySuccess === true,
        error: typeof entryError === "string" ? entryError : undefined,
      };
    }),
  };
}

export function useBatchPayment({
  address,
  donorDid,
  shouldStoreDonationAsAnonymous,
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
      if (!facilitatorWallet || !isHexAddress(facilitatorWallet)) {
        onError("Facilitator wallet not configured");
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const nonce = createNonce();

      const usdcAmount = toUsdcUnits(totalAmount);

      const domain = {
        name: "USD Coin",
        version: "2",
        chainId: CHAIN_ID,
        verifyingContract: USDC_CONTRACT,
      };

      const message = {
        from: address,
        to: facilitatorWallet,
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
        donorDid: shouldStoreDonationAsAnonymous ? undefined : donorDid,
        anonymous: shouldStoreDonationAsAnonymous,
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

        const rawData = await res.json();
        const data = parseCheckoutResult(rawData);
        if (!data) {
          throw new Error("Payment completed, but response was invalid.");
        }
        onSuccess(data);
      } catch (err) {
        console.error("[useBatchPayment] Payment failed:", err);
        onError(err instanceof Error ? err.message : "Payment failed");
      }
    },
    [address, donorDid, shouldStoreDonationAsAnonymous, onSigning, onProcessing, onSuccess, onError, signTypedDataAsync]
  );

  return { executeBatchPayment };
}
