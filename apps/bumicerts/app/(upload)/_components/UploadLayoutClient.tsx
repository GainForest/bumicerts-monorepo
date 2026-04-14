"use client";

import { useEffect } from "react";
import { ModalProvider } from "@/components/ui/modal/context";
import { HeaderProvider } from "@/app/(marketplace)/_components/Header/context";
import { UploadHeader } from "./Header/UploadHeader";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { MobileNavDrawer } from "@/components/ui/MobileNavDrawer";

interface UploadLayoutClientProps {
  did: string;
  children: React.ReactNode;
}

/**
 * Client shell for the (upload) route group.
 *
 * Wraps children in:
 * - ModalProvider          — stack-based modal system
 * - HeaderProvider         — header slots (left, right, sub-header)
 * - Platform toast hook    — announces platform transitions
 * - Desktop layout:        fixed sidebar (Upload-branded) + scrollable main
 * - Mobile layout:         full-width + fixed bottom nav
 *
 * Uses UploadHeader (no cart) instead of the marketplace Header.
 */
function UploadLayoutInner({
  children,
  did,
}: {
  children: React.ReactNode;
  did: string;
}) {
  useEffect(() => {
    if (!did) return;

    // Fire-and-forget: track the user's repo in the indexer when they enter upload
    fetch("/api/indexer/trpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "mutation AddRepos($dids: [String!]!) { addRepos(dids: $dids) }",
        variables: { dids: [did] },
      }),
    }).catch(() => {
      // No-op: don't track if it failed or passed
    });
  }, [did]);

  return (
    <>
      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <UnifiedSidebar />
        <main className="flex-1 relative overflow-y-auto">
          <UploadHeader />
          {children}
        </main>
      </div>

      {/* Mobile: full width + floating sidebar drawer */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden">
        <MobileNavDrawer>
          <UnifiedSidebar />
        </MobileNavDrawer>
        <div className="flex-1 relative overflow-y-auto">
          <UploadHeader />
          {children}
        </div>
      </div>
    </>
  );
}

export function UploadLayoutClient({
  children,
  did,
}: UploadLayoutClientProps) {
  return (
    <ModalProvider>
      <HeaderProvider>
        <UploadLayoutInner did={did}>{children}</UploadLayoutInner>
      </HeaderProvider>
    </ModalProvider>
  );
}
