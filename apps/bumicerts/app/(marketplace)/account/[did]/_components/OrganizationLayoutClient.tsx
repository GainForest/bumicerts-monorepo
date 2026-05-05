"use client";

import { useEffect } from "react";
import { addReposViaLocalRoute } from "@/graphql/indexer/mutations/add-repos";

interface OrganizationLayoutClientProps {
  did: string;
  children: React.ReactNode;
}

/**
 * Client shell for the organization layout.
 *
 * Fires a fire-and-forget call to the indexer to track the user's repo
 * when they visit any organization page.
 */
export function OrganizationLayoutClient({
  children,
  did,
}: OrganizationLayoutClientProps) {
  useEffect(() => {
    if (!did) return;

    // Fire-and-forget: track the user's repo in the indexer when they view an org
    addReposViaLocalRoute([did]).catch(() => {
      // No-op: don't track if it failed or passed
    });
  }, [did]);

  return <>{children}</>;
}
