"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useAccount, useSignTypedData } from "wagmi";
import { useAtprotoStore } from "@/components/stores/atproto";
import type { BumicertData } from "@/lib/types";
import { CHAIN_ID } from "@/lib/facilitator/usdc";

type LinkState = "explain" | "signing" | "success" | "error";

interface LinkWalletModalProps {
  bumicert:        BumicertData;
  amount:          number;
  anonymous:       boolean;
  recipientWallet: string;
}

const EIP712_DOMAIN = {
  name:    "ATProto EVM Attestation",
  version: "1",
} as const;

const EIP712_TYPES = {
  AttestLink: [
    { name: "did",        type: "string" },
    { name: "evmAddress", type: "string" },
    { name: "chainId",    type: "string" },
    { name: "timestamp",  type: "string" },
    { name: "nonce",      type: "string" },
  ],
} as const;

export function LinkWalletModal({
  bumicert,
  amount,
  anonymous,
  recipientWallet,
}: LinkWalletModalProps) {
  const { popModal, stack, hide } = useModal();
  const { address } = useAccount();
  const auth = useAtprotoStore((state) => state.auth);
  const [linkState, setLinkState] = useState<LinkState>("explain");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { signTypedDataAsync } = useSignTypedData();

  const donorDid =
    auth.status === "AUTHENTICATED" ? (auth as { did?: string }).did ?? "" : "";

  const handleBack = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  const handleSign = async () => {
    if (!address || !donorDid) return;

    setLinkState("signing");
    setErrorMsg(null);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const nonce     = String(Date.now());

    const message = {
      did:        donorDid,
      evmAddress: address,
      chainId:    String(CHAIN_ID),
      timestamp,
      nonce,
    };

    let signature: `0x${string}`;
    try {
      signature = await signTypedDataAsync({
        domain:      EIP712_DOMAIN,
        types:       EIP712_TYPES,
        primaryType: "AttestLink",
        message,
      });
    } catch {
      setLinkState("error");
      setErrorMsg("Signing was rejected in your wallet.");
      return;
    }

    try {
      const res = await fetch("/api/identity-link", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ address, chainId: CHAIN_ID, signature, message }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to link wallet");
      }

      setLinkState("success");
    } catch (err) {
      setLinkState("error");
      setErrorMsg(err instanceof Error ? err.message : "Failed to link wallet");
    }
  };

  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";

  const donorHandle =
    auth.status === "AUTHENTICATED"
      ? (auth as { handle?: string }).handle ?? donorDid
      : "";

  // Suppress unused-variable warnings for props passed for context
  void bumicert; void amount; void anonymous; void recipientWallet;

  if (linkState === "explain") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Link Your Wallet</ModalTitle>
          <ModalDescription className="sr-only">
            Link your EVM wallet to your Bumicerts identity.
          </ModalDescription>
        </ModalHeader>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium">Linking your wallet lets you:</p>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li>✓ &nbsp;Donations appear under your name</li>
            <li>✓ &nbsp;Prove donations you&apos;ve made</li>
            <li>✓ &nbsp;Receive donations to your org</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;ll sign a message to prove you own this wallet.
            <br />
            <span className="text-xs">(No gas fee required)</span>
          </p>
        </div>

        <ModalFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={handleSign}>
            Sign Message to Link
          </Button>
          <Button variant="ghost" onClick={handleBack} className="w-full">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  if (linkState === "signing") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader>
          <ModalTitle>Sign to Link</ModalTitle>
          <ModalDescription className="sr-only">Please sign in your wallet</ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="font-medium">Please sign the message in your wallet</p>
          <p className="text-xs text-muted-foreground">This does not cost any gas</p>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={handleBack} className="w-full" disabled>
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  if (linkState === "error") {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Linking Failed</ModalTitle>
          <ModalDescription className="sr-only">Failed to link wallet</ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="text-4xl">✕</span>
          <p className="text-sm text-destructive">{errorMsg}</p>
        </div>
        <ModalFooter className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleBack}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={() => { setLinkState("explain"); setErrorMsg(null); }}>
            Try Again
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  // success
  return (
    <ModalContent dismissible={false}>
      <ModalHeader>
        <ModalTitle>Wallet Linked! ✓</ModalTitle>
        <ModalDescription className="sr-only">
          Your wallet is now linked to your Bumicerts identity.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{shortAddress}</span> is now linked to{" "}
          <span className="font-medium">@{donorHandle}</span>
        </p>
      </div>

      <ModalFooter>
        <Button className="w-full" onClick={handleBack}>
          Continue with Donation
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
