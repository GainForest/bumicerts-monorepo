"use client";

import { ModalProvider } from "@/components/ui/modal/context";
import { HeaderProvider } from "@/app/(marketplace)/_components/Header/context";
import { ManageHeader } from "./Header/UploadHeader";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { MobileNavDrawer } from "@/components/ui/MobileNavDrawer";

interface ManageLayoutClientProps {
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
function ManageLayoutInner({ children }: { children: React.ReactNode }) {
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

export function ManageLayoutClient({ children }: ManageLayoutClientProps) {
  return (
    <ModalProvider>
      <HeaderProvider>
        <ManageLayoutInner>{children}</ManageLayoutInner>
      </HeaderProvider>
    </ModalProvider>
  );
}
