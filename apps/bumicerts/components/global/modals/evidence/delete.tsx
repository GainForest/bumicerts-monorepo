"use client";

/**
 * EvidenceDeleteModal — confirms deletion of a context.attachment record,
 * effectively unlinking a piece of evidence from a bumicert.
 */

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
} from "@/components/ui/modal/modal";
import { trpc } from "@/lib/trpc/client";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { formatError } from "@/lib/utils/trpc-errors";

export interface EvidenceDeleteModalProps {
  /** The rkey of the attachment record to delete */
  rkey: string;
  /** Display title — shown in the confirmation message */
  title: string;
  /** Called after the attachment has been deleted */
  onDeleted: () => void;
}

export function EvidenceDeleteModal({
  rkey,
  title,
  onDeleted,
}: EvidenceDeleteModalProps) {
  const { hide, clear } = useModal();
  const indexerUtils = indexerTrpc.useUtils();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAttachment = trpc.context.attachment.delete.useMutation();

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteAttachment.mutateAsync({ rkey });
      await indexerUtils.context.attachments.invalidate();
      onDeleted();
      hide().then(() => clear());
    } catch (e) {
      setError(formatError(e));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (!isDeleting) {
      hide().then(() => clear());
    }
  };

  return (
    <ModalContent dismissible={!isDeleting}>
      <ModalHeader>
        <ModalTitle>Remove Evidence</ModalTitle>
        <ModalDescription>
          Remove <span className="font-medium text-foreground">{title}</span>{" "}
          from this bumicert&apos;s timeline? This cannot be undone.
        </ModalDescription>
      </ModalHeader>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <ModalFooter>
        <Button
          variant="destructive"
          className="w-full"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Removing…" : "Remove Evidence"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleCancel}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
