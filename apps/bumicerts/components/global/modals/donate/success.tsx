"use client";

import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";

interface SuccessModalProps {
  amount:           number;
  organizationName: string;
  transactionHash:  string;
  isAuthenticated:  boolean;
  anonymous:        boolean;
}

export function SuccessModal({
  amount,
  organizationName,
  transactionHash,
  isAuthenticated,
  anonymous,
}: SuccessModalProps) {
  const { hide, popModal, stack } = useModal();

  const shortHash = transactionHash
    ? `${transactionHash.slice(0, 6)}...${transactionHash.slice(-4)}`
    : "";

  const baseScanUrl = `https://basescan.org/tx/${transactionHash}`;

  const handleDone = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      popModal();
    }
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader>
        <ModalTitle>Donation Complete! 🎉</ModalTitle>
        <ModalDescription className="sr-only">
          Your donation was successful.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-pulse">
            <span className="text-3xl">✓</span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-semibold text-lg">Thank you for your support!</p>
          <p className="text-sm text-muted-foreground">
            ${amount.toFixed(2)} USDC donated to {organizationName}
          </p>
        </div>

        {transactionHash && (
          <div className="border border-border rounded-lg px-4 py-3 w-full text-center">
            <p className="text-xs text-muted-foreground mb-1">Transaction</p>
            <p className="font-mono text-sm">{shortHash}</p>
            <a
              href={baseScanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-1 block"
            >
              View on BaseScan ↗
            </a>
          </div>
        )}

        {isAuthenticated && !anonymous && (
          <p className="text-xs text-muted-foreground">
            This donation is linked to your Bumicerts identity.
          </p>
        )}
      </div>

      <ModalFooter>
        <Button className="w-full" onClick={handleDone}>
          Done
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
