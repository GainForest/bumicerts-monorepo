"use client";

import { useEffect } from "react";
import { ModalProvider } from "@/components/ui/modal/context";
import { HeaderProvider } from "@/app/(marketplace)/_components/Header/context";
import { ManageHeader } from "./Header/UploadHeader";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { MobileNavDrawer } from "@/components/ui/MobileNavDrawer";
import { addReposViaLocalRoute } from "@/graphql/indexer/mutations/add-repos";

interface ManageLayoutClientProps {
  did: string;
  children: React.ReactNode;
}

/**
 * Client shell for the (manage) route group.
 *
 * Wraps children in:
 * - ModalProvider          — stack-based modal system
 * - HeaderProvider         — header slots (left, right, sub-header)
 * - Platform toast hook    — announces platform transitions
 * - Desktop layout:        fixed sidebar (Manage-branded) + scrollable main
 * - Mobile layout:         full-width + fixed bottom nav
 *
 * Uses ManageHeader (no cart) instead of the marketplace Header.
 */
function ManageLayoutInner({
  children,
  did,
}: {
  children: React.ReactNode;
  did: string;
}) {
  useEffect(() => {
    if (!did) return;

    // Fire-and-forget: track the user's repo in the indexer when they enter MANAGE
    addReposViaLocalRoute([did]).catch(() => {
      // No-op: don't track if it failed or passed
    });
  }, [did]);

  return (
    <>
      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <UnifiedSidebar />
        <main className="flex-1 relative overflow-y-auto">
          <ManageHeader />
          {children}
        </main>
      </div>

      {/* Mobile: full width + floating sidebar drawer */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden">
        <MobileNavDrawer>
          <UnifiedSidebar />
        </MobileNavDrawer>
        <div className="flex-1 relative overflow-y-auto">
          <ManageHeader />
          {children}
        </div>
      </div>
    </>
  );
}

export function ManageLayoutClient({ children, did }: ManageLayoutClientProps) {
  return (
    <ModalProvider>
      <HeaderProvider>
        <ManageLayoutInner did={did}>{children}</ManageLayoutInner>
      </HeaderProvider>
    </ModalProvider>
  );
}
