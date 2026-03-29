"use client";

import { useState } from "react";
import { useModal } from "@/components/ui/modal/context";
import {
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { links } from "@/lib/links";
import { CircleCheckIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export const DeleteBumicertModalId = "bumicert/delete-bumicert";

type DeleteBumicertModalProps = {
  rkey: string;
  title: string;
};

const DeleteBumicertModal = ({ rkey, title }: DeleteBumicertModalProps) => {
  const { stack, popModal, hide } = useModal();
  const router = useRouter();
  const [confirmationText, setConfirmationText] = useState("");

  const bumicertTitle = title.trim() === "" ? "Untitled Bumicert" : title;
  const confirmationMatches =
    confirmationText.trim().toLowerCase() === bumicertTitle.trim().toLowerCase();

  const {
    mutate: deleteBumicert,
    isPending,
    isSuccess: success,
    error,
  } = trpc.claim.activity.delete.useMutation({
    onSuccess: async () => {
      // Wait a moment then navigate to homepage
    },
  });

  const handleDelete = () => {
    if (!confirmationMatches) return;
    deleteBumicert({ rkey });
  };

  const handleClose = () => {
    if (success) {
      hide().then(() => {
        popModal();
        router.push(links.home);
      });
      return;
    }

    if (stack.length === 1) {
      hide().then(() => {
        popModal();
      });
    } else {
      popModal();
    }
  };

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
        <ModalTitle>Delete Bumicert</ModalTitle>
        <ModalDescription>
          {success
            ? "Bumicert has been deleted successfully."
            : "This action is permanent and cannot be undone."}
        </ModalDescription>
      </ModalHeader>
      <AnimatePresence>
        {!success ? (
          <motion.div
            className="flex flex-col gap-3 mt-4"
            exit={{ opacity: 0, filter: "blur(10px)", scale: 0.5 }}
          >
            <p>
              To confirm, type{" "}
              <strong className="font-medium text-foreground">
                {bumicertTitle}
              </strong>{" "}
              below.
            </p>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={bumicertTitle}
              disabled={isPending}
              autoFocus
            />
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
                disabled={isPending || !confirmationMatches}
                onClick={handleDelete}
                className="w-full"
              >
                {isPending ? (
                  <>
                    <Loader2Icon className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2Icon />
                    Delete Bumicert
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
              <CircleCheckIcon className="size-20 text-primary" />
            </div>
            <p className="text-center text-muted-foreground font-medium text-pretty">
              The bumicert has been deleted successfully.
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

export default DeleteBumicertModal;
