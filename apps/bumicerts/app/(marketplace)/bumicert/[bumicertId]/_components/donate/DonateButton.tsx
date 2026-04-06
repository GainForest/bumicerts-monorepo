"use client";

import { useAtprotoStore } from "@/components/stores/atproto";
import { useModal } from "@/components/ui/modal/context";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "lucide-react";
import type { BumicertData, FundingConfigData } from "@/lib/types";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { AmountModal } from "@/components/global/modals/donate/amount";
import { AuthModal } from "@/components/global/modals/auth/index";

interface DonateButtonProps {
  bumicert: BumicertData;
  fundingConfig: FundingConfigData | null;
}

/**
 * The primary "Donate" button shown on every bumicert page.
 *
 * - Always visible and always enabled — the button never checks recipient
 *   eligibility upfront. Any "org hasn't set up donations" error is surfaced
 *   inside the modal flow (WalletModal).
 * - If the user is authenticated, the button says "Donate".
 * - If the user is not authenticated, the button says "Donate Anonymously" and
 *   a "Sign in to donate under your name" link is shown above.
 */
export function DonateButton({ bumicert, fundingConfig }: DonateButtonProps) {
  const auth = useAtprotoStore((state) => state.auth);
  const { show, pushModal } = useModal();

  const isAuthenticated = auth.status === "AUTHENTICATED";

  const handleDonate = () => {
    pushModal(
      {
        id:      MODAL_IDS.DONATE_AMOUNT,
        content: <AmountModal bumicert={bumicert} fundingConfig={fundingConfig} />,
      },
      true // replaceAll — start fresh
    );
    show();
  };

  const handleSignIn = () => {
    pushModal({ id: MODAL_IDS.AUTH, content: <AuthModal /> }, true);
    show();
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      {!isAuthenticated && (
        <button
          onClick={handleSignIn}
          className="text-sm text-primary hover:underline text-center"
        >
          Sign in to donate under your name
        </button>
      )}
      <Button onClick={handleDonate} className="w-full">
        <HeartIcon className="mr-1.5 h-4 w-4" />
        {isAuthenticated ? "Donate" : "Donate Anonymously"}
      </Button>
    </div>
  );
}
