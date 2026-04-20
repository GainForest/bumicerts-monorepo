"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";

type ManageConfirmModalProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: () => Promise<void> | void;
};

export function ManageConfirmModal({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant = "destructive",
  onConfirm,
}: ManageConfirmModalProps) {
  const { hide, popModal, stack } = useModal();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
      return;
    }

    popModal();
  };

  const handleConfirm = async () => {
    setIsPending(true);
    setError(null);

    try {
      await onConfirm();
      await handleClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
      setIsPending(false);
    }
  };

  return (
    <ModalContent>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <ModalFooter className="mt-5">
        <Button variant="outline" onClick={() => void handleClose()} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} onClick={() => void handleConfirm()} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          {confirmLabel}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
