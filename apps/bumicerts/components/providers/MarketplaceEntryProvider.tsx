"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AccountSetupChoiceModal } from "@/components/global/modals/account-setup-choice";
import { MODAL_IDS } from "@/components/global/modals/ids";
import { useModal } from "@/components/ui/modal/context";
import {
  hasSeenAccountSetupChoiceInSession,
  markAccountSetupChoiceSeenInSession,
} from "@/lib/account-setup-session";
import { useAccount } from "./AccountProvider";

function UnknownAccountSetupEntryEffect() {
  const { account, isResolved } = useAccount();
  const { isOpen, mode, popModal, pushModal, show, stack } = useModal();
  const didAutoCloseModalRef = useRef(false);

  const isAccountSetupChoiceModalActive =
    stack[stack.length - 1] === MODAL_IDS.ACCOUNT_SETUP_CHOICE;

  useEffect(() => {
    if (isAccountSetupChoiceModalActive && isOpen) {
      didAutoCloseModalRef.current = true;
      return;
    }

    if (!isAccountSetupChoiceModalActive) {
      didAutoCloseModalRef.current = false;
      return;
    }

    if (!didAutoCloseModalRef.current) {
      return;
    }

    popModal();
    didAutoCloseModalRef.current = false;
  }, [isAccountSetupChoiceModalActive, isOpen, popModal]);

  useEffect(() => {
    if (!isResolved || mode === null) {
      return;
    }

    if (account?.kind !== "unknown") {
      return;
    }

    if (hasSeenAccountSetupChoiceInSession(account.did)) {
      return;
    }

    if (isAccountSetupChoiceModalActive) {
      return;
    }

    markAccountSetupChoiceSeenInSession(account.did);
    pushModal(
      {
        id: MODAL_IDS.ACCOUNT_SETUP_CHOICE,
        content: <AccountSetupChoiceModal />,
      },
      true,
    );
    void show();
  }, [account, isAccountSetupChoiceModalActive, isResolved, mode, pushModal, show]);

  return null;
}

/**
 * Runs client-side effects that should happen when a user enters marketplace
 * surfaces.
 */
export function MarketplaceEntryProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <UnknownAccountSetupEntryEffect />
      {children}
    </>
  );
}
