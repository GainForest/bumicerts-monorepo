"use client";

import { useModal } from "@/components/ui/modal/context";
import { ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal/modal";
import { LoginModal } from "@/components/auth/LoginModal";

export function AuthModal() {
  const { hide, popModal, stack } = useModal();

  const handleClose = async () => {
    if (stack.length === 1) {
      await hide();
      popModal();
    } else {
      popModal();
    }
  };

  return (
    <ModalContent className="py-2">
      <ModalTitle className="sr-only">Sign in to Bumicerts</ModalTitle>
      <ModalDescription className="sr-only">
        Sign in with your username to access Bumicerts.
      </ModalDescription>
      <LoginModal onClose={handleClose} />
    </ModalContent>
  );
}
