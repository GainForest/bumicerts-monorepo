"use client";

import { motion } from "framer-motion";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import { AuthModal } from "@/components/global/modals/auth";

export function SignInPrompt() {
  const { pushModal, show } = useModal();

  const handleSignIn = () => {
    pushModal({
      id: "auth-modal",
      content: <AuthModal />,
    });
    show();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-1 p-3 rounded-lg bg-muted/40 border border-border/50"
    >
      <p className="text-xs text-muted-foreground text-center mb-2">
        Sign in to manage your account and content.
      </p>
      <Button
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={handleSignIn}
      >
        Sign In
        <ChevronRightIcon />
      </Button>
    </motion.div>
  );
}
