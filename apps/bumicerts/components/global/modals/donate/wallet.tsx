"use client";

import { useEffect, useRef, useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useAccount, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { BumicertData } from "@/lib/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { CHAIN_ID } from "@/lib/facilitator/usdc";
import { useRecipientVerify } from "./hooks/useRecipientVerify";
import { ConfirmModal } from "./confirm";

interface WalletModalProps {
  bumicert: BumicertData;
  amount: number;
  anonymous: boolean;
}

export function WalletModal({ bumicert, amount, anonymous }: WalletModalProps) {
  const { pushModal, popModal, stack, hide } = useModal();
  const { address, chainId, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  const isCorrectNetwork = chainId === CHAIN_ID;

  const { data: recipientStatus, isLoading: isVerifying } = useRecipientVerify(
    bumicert.organizationDid
  );

  const [mountedConnected] = useState(() => isConnected);
  const pushedRef = useRef(false);

  const handleBack = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  // Auto-advance to ConfirmModal only when the wallet *just* connected during
  // this modal's lifetime. If already connected on mount (back-navigation), stay here.
  useEffect(() => {
    if (mountedConnected) return;
    if (pushedRef.current) return;
    if (!isConnected || !isCorrectNetwork || isVerifying) return;
    if (!recipientStatus?.hasAttestation) return;

    pushedRef.current = true;
    pushModal({
      id: MODAL_IDS.DONATE_CONFIRM,
      content: (
        <ConfirmModal
          bumicert={bumicert}
          amount={amount}
          anonymous={anonymous}
          recipientWallet={recipientStatus.address}
        />
      ),
    });
  }, [mountedConnected, isConnected, isCorrectNetwork, isVerifying, recipientStatus, bumicert, amount, anonymous, pushModal]);

  // --- Not connected ---
  if (!isConnected) {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Connect Wallet</ModalTitle>
          <ModalDescription>
            Connect your wallet to donate USDC on Base.
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Button className="w-full" onClick={openConnectModal}>
            Connect Wallet
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            USDC on Base network required
          </p>
        </div>
        <ModalFooter>
          <Button variant="ghost" onClick={handleBack} className="w-full">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  // --- Connected, wrong network ---
  if (!isCorrectNetwork) {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Switch to Base</ModalTitle>
          <ModalDescription>
            You need to be on Base network to donate USDC.
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm text-muted-foreground">
            You&apos;re on the wrong network. Switch to <strong>Base</strong> to
            complete your donation.
          </p>
        </div>
        <ModalFooter className="flex flex-col gap-2">
          <Button
            className="w-full"
            onClick={() => switchChain({ chainId: base.id })}
            disabled={isSwitching}
          >
            {isSwitching ? "Switching…" : "Switch to Base"}
          </Button>
          <Button variant="ghost" onClick={handleBack} className="w-full">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  // --- Verifying ---
  if (isVerifying) {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Verifying Recipient</ModalTitle>
          <ModalDescription>
            Checking if this organization can receive donations.
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Checking recipient setup…</p>
        </div>
      </ModalContent>
    );
  }

  // --- Recipient not set up ---
  if (recipientStatus && !recipientStatus.hasAttestation) {
    return (
      <ModalContent dismissible={false}>
        <ModalHeader backAction={handleBack}>
          <ModalTitle>Donations Not Set Up</ModalTitle>
          <ModalDescription>
            This organization hasn&apos;t set up donations yet.
          </ModalDescription>
        </ModalHeader>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="text-3xl">⚠️</span>
          <p className="text-sm text-muted-foreground max-w-xs">
            <strong>{bumicert.organizationName}</strong> hasn&apos;t linked a wallet
            to receive donations yet.
          </p>
        </div>
        <ModalFooter>
          <Button variant="outline" className="w-full" onClick={handleBack}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  // --- Connected + verified (back-navigation) ---
  const handleContinue = () => {
    if (!recipientStatus) return;
    pushModal({
      id: MODAL_IDS.DONATE_CONFIRM,
      content: (
        <ConfirmModal
          bumicert={bumicert}
          amount={amount}
          anonymous={anonymous}
          recipientWallet={recipientStatus.address}
        />
      ),
    });
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={handleBack}>
        <ModalTitle>Wallet Connected</ModalTitle>
        <ModalDescription>
          Your wallet is connected and ready to donate.
        </ModalDescription>
      </ModalHeader>
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <span className="text-2xl">✓</span>
        </div>
        <p className="text-sm text-muted-foreground font-mono">
          {address?.slice(0, 6)}…{address?.slice(-4)}
        </p>
      </div>
      <ModalFooter className="flex flex-col gap-2">
        <Button className="w-full" onClick={handleContinue}>
          Continue to Confirm
        </Button>
        <Button variant="ghost" onClick={handleBack} className="w-full">
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
