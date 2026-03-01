"use client";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { links } from "@/lib/links";
import { CircleCheck, Loader2, Trash2 } from "lucide-react";
import { useFormStore } from "../form-store";
import { useAtprotoStore } from "@/components/stores/atproto";

export const DeleteDraftModalId = "bumicert/delete-draft";

type DeleteDraftModalProps = {
  draftId?: number;
  onSuccess?: () => void;
};

const DeleteDraftModal = ({
  draftId: propDraftId,
  onSuccess,
}: DeleteDraftModalProps) => {
  const { stack, popModal, hide } = useModal();
  const pathname = usePathname();
  const router = useRouter();
  const formValues = useFormStore((state) => state.formValues);
  const queryClient = useQueryClient();
  const auth = useAtprotoStore((state) => state.auth);

  const draftTitle =
    formValues[0].projectName.trim() === ""
      ? "Untitled Draft"
      : formValues[0].projectName;

  // Extract draftId from URL if not provided as prop
  const draftIdMatch = pathname.match(/\/create\/(\d+)$/);
  const urlDraftId = draftIdMatch ? parseInt(draftIdMatch[1], 10) : null;
  const draftId = propDraftId ?? urlDraftId;

  const {
    mutate: deleteDraft,
    isPending,
    isSuccess: success,
    error,
  } = useMutation({
    mutationFn: async () => {
      if (!draftId || draftId === 0 || isNaN(draftId)) {
        throw new Error("Invalid draft ID");
      }

      const response = await fetch(links.api.drafts.bumicert.delete, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ draftIds: [draftId] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete draft");
      }

      const result = await response.json();

      // Check if any drafts were actually deleted
      if (result.deletedCount === 0) {
        throw new Error(
          "No draft was deleted. The draft may not exist or you don't have permission to delete it."
        );
      }

      return result;
    },
    onSuccess: async () => {
      // Invalidate drafts query to refresh the list
      if (auth.user?.did) {
        queryClient.invalidateQueries({
          queryKey: ["drafts", auth.user.did],
        });
      }

      // Call custom onSuccess handler if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Default behavior: navigate to create page
        await hide();
        popModal();
        router.push(links.bumicert.create);
      }
    },
  });

  const handleDelete = () => {
    deleteDraft();
  };

  const handleClose = () => {
    if (stack.length === 1) {
      hide().then(() => {
        popModal();
      });
    } else {
      popModal();
    }
  };

  if (!draftId) {
    return (
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Delete Draft</ModalTitle>
          <ModalDescription>
            Unable to determine which draft to delete.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button onClick={handleClose} className="w-full">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    );
  }

  return (
    <ModalContent>
      <ModalHeader
        backAction={
          stack.length === 1 || success
            ? undefined
            : () => {
                popModal();
              }
        }
      >
        <ModalTitle>Delete Draft</ModalTitle>
        <ModalDescription>
          {success
            ? "Draft has been deleted successfully."
            : "Confirm your selection to delete the draft."}
        </ModalDescription>
      </ModalHeader>
      <AnimatePresence>
        {!success ? (
          <motion.div
            className="flex flex-col items-center gap-2 mt-4"
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
          >
            <p>
              Are you sure that you want to{" "}
              <span className="text-destructive">delete</span> the draft,{" "}
              <strong className="font-medium text-foreground my-2">
                {draftTitle}?
              </strong>
              <br />
              This action cannot be undone.
            </p>
            {error && (
              <div className="text-red-500 w-full text-left text-sm">
                {error.message}
              </div>
            )}
            <ModalFooter className="w-full gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPending}
                className="w-full"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={handleDelete}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 />
                    Delete Draft
                  </>
                )}
              </Button>
            </ModalFooter>
          </motion.div>
        ) : (
          <motion.div
            className="flex flex-col items-center gap-4 mt-8"
            initial={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
          >
            <div className="flex items-center justify-center relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 bg-primary blur-2xl rounded-full animate-pulse"></div>
              </div>
              <CircleCheck className="size-20 text-primary" />
            </div>
            <p className="text-center text-muted-foreground font-medium text-pretty">
              The draft has been deleted successfully.
            </p>
            <ModalFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </ModalFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContent>
  );
};

export default DeleteDraftModal;
