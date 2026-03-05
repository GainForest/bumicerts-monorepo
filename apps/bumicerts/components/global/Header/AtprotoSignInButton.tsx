"use client";
import { Button } from "@/components/ui/button";
import { useModal } from "@/components/ui/modal/context";
import { Loader2Icon, LogInIcon } from "lucide-react";
import React from "react";
import dynamic from "next/dynamic";
import { useAtprotoStore } from "@/components/stores/atproto";

const AuthModal = dynamic(
  () =>
    import("@/components/auth/AuthModal").then((m) => ({
      default: m.AuthModal,
    })),
  { ssr: false }
);

const AtprotoSignInButton = () => {
  const { pushModal, show } = useModal();
  const auth = useAtprotoStore((state) => state.auth);

  if (auth.status === "RESUMING") {
    return <Loader2Icon className="animate-spin text-primary size-5 mx-1" />;
  }

  return (
    <Button
      size={"sm"}
      onClick={() => {
        pushModal(
          {
            id: "auth",
            content: <AuthModal />,
          },
          true
        );
        show();
      }}
    >
      <LogInIcon />
      Sign in
    </Button>
  );
};

export default AtprotoSignInButton;
