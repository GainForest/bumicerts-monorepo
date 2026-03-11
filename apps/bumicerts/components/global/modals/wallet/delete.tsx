"use client";

/**
 * DeleteWalletModal — asks the user to confirm before removing a linked wallet.
 * Pushed on top of ManageWalletsModal.
 */

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/modal/modal";
import { deleteLinkEvm } from "@/lib/actions/linkEvm";

interface DeleteWalletModalProps {
  rkey: string;
  address: string;
  name: string | null | undefined;
  onBack: () => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}

function formatAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function DeleteWalletModal({
  rkey,
  address,
  name,
  onBack,
  onDeleted,
}: DeleteWalletModalProps) {
  const { stack, hide, popModal } = useModal();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = name ? `${name} (${formatAddress(address)})` : formatAddress(address);

  const handleBack = () => {
    if (stack.length === 1) {
      hide().then(() => popModal());
    } else {
      onBack();
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      const result = await deleteLinkEvm(rkey);
      if (!result.success) {
        setError(result.message ?? "Failed to remove wallet.");
        return;
      }
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove wallet.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalContent dismissible={false}>
      <ModalHeader backAction={handleBack}>
        <ModalTitle>Remove Wallet</ModalTitle>
        <ModalDescription>
          Remove <span className="font-medium text-foreground">{label}</span> from
          your linked wallets? This can&apos;t be undone.
        </ModalDescription>
      </ModalHeader>

      <div className="flex flex-col gap-2 pt-2">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Removing…" : "Remove Wallet"}
        </Button>
        <Button variant="ghost" className="w-full" onClick={handleBack}>
          Cancel
        </Button>
      </div>
    </ModalContent>
  );
}
