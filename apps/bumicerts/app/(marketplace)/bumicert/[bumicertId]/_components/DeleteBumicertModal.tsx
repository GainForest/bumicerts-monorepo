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

  const bumicertTitle = title.trim() === "" ? "Untitled Bumicert" : title;

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
            : "Confirm your selection to delete the bumicert."}
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
              <span className="text-destructive">permanently delete</span> the
              bumicert,{" "}
              <strong className="font-medium text-foreground my-2">
                {bumicertTitle}?
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
