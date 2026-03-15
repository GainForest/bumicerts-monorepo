"use client";

import { ModalProvider } from "@/components/ui/modal/context";
import { HeaderProvider } from "@/app/(marketplace)/_components/Header/context";
import { UploadHeader } from "./Header/UploadHeader";
import { UploadDesktopSidebar } from "./Navbar/DesktopSidebar";
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
function UploadLayoutInner({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop: sidebar + content */}
      <div className="hidden md:flex h-screen overflow-hidden">
        <UploadDesktopSidebar />
        <main className="flex-1 relative overflow-y-auto">
          <UploadHeader />
          {children}
        </main>
      </div>

      {/* Mobile: full width + floating sidebar drawer */}
      <div className="md:hidden flex flex-col h-screen overflow-hidden">
        <MobileNavDrawer>
          <UploadDesktopSidebar />
        </MobileNavDrawer>
        <div className="flex-1 relative overflow-y-auto">
          <UploadHeader />
          {children}
        </div>
      </div>
    </>
  );
}

export function UploadLayoutClient({ children }: UploadLayoutClientProps) {
  return (
    <ModalProvider>
      <HeaderProvider>
        <UploadLayoutInner>{children}</UploadLayoutInner>
      </HeaderProvider>
    </ModalProvider>
  );
}
