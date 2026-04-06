"use client";

import { motion } from "framer-motion";
import { LockIcon } from "lucide-react";
import { useModal } from "@/components/ui/modal/context";
import { MODAL_IDS } from "@/components/global/modals/ids";
import dynamic from "next/dynamic";

const AuthModal = dynamic(
  () => import("@/components/auth/AuthModal").then((m) => ({ default: m.AuthModal })),
  { ssr: false }
);

export function SignInPrompt() {
  const { pushModal, show } = useModal();

  const openAuth = () => {
    pushModal({ id: MODAL_IDS.AUTH, content: <AuthModal /> }, true);
    show();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col items-center gap-8 max-w-sm w-full text-center"
      >
        {/* Gradient line top */}
        <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        <div className="flex flex-col items-center gap-6">
          {/* Icon */}
          <div className="flex items-center justify-center size-14 rounded-full border border-border bg-muted/40">
            <LockIcon className="size-6 text-muted-foreground" />
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-3">
            <h1
              className="text-4xl font-light tracking-[-0.02em] leading-[1.1]"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              Sign in to continue
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed text-balance">
              You need to be signed in to manage your organisation&apos;s content.
            </p>
          </div>

          {/* CTA */}
          <motion.button
            onClick={openAuth}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer"
          >
            Sign in
          </motion.button>
        </div>

        {/* Gradient line bottom */}
        <div className="h-px w-full max-w-xs bg-gradient-to-r from-transparent via-border to-transparent" />
      </motion.div>
    </div>
  );
}
