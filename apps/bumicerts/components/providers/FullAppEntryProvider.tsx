"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { links } from "@/lib/links";
import { useAccount } from "./AccountProvider";

function EnsureProfileRecordsEntryEffect() {
  const { account, isResolved } = useAccount();
  const attemptedDidSetRef = useRef(new Set<string>());

  useEffect(() => {
    if (!isResolved || typeof account?.did !== "string") {
      return;
    }

    if (attemptedDidSetRef.current.has(account.did)) {
      return;
    }

    attemptedDidSetRef.current.add(account.did);

    void fetch(links.api.atproto.ensureProfileRecords, {
      method: "POST",
    }).catch(() => {
      // Fire-and-forget on full app entry. Best effort only.
    });
  }, [account, isResolved]);

  return null;
}

/**
 * Runs client-side effects that should happen when a user enters any route in
 * the app.
 */
export function FullAppEntryProvider({ children }: { children: ReactNode }) {
  return (
    <>
      <EnsureProfileRecordsEntryEffect />
      {children}
    </>
  );
}
