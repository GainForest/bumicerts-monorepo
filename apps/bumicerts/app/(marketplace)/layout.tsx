"use client";

import { usePathname } from "next/navigation";
import { NavbarContextProvider } from "./_components/Navbar/context";
import { HeaderProvider } from "./_components/Header/context";
import { ModalProvider } from "@/components/ui/modal/context";
import { WagmiProvider } from "@/components/providers/WagmiProvider";
import { TopNavbar } from "./_components/Navbar/TopNavbar";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Header } from "./_components/Header/Header";
import { MobileNavDrawer } from "@/components/ui/MobileNavDrawer";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  if (isHomePage) {
    return (
      <NavbarContextProvider>
        <div className="min-h-screen flex flex-col">
          <TopNavbar />
          <main className="flex-1">{children}</main>
        </div>
      </NavbarContextProvider>
    );
  }

  return (
    <NavbarContextProvider>
      <HeaderProvider>
        <WagmiProvider>
          <ModalProvider>
            {/* Desktop: sidebar + content */}
            <div className="hidden md:flex h-screen overflow-hidden">
              <UnifiedSidebar />
              <main className="flex-1 relative overflow-y-auto">
                {/* Header overlays content for translucency effect */}
                <Header />
                {children}
              </main>
            </div>

            {/* Mobile: full width + floating sidebar drawer */}
            <div className="md:hidden flex flex-col h-screen overflow-hidden">
              <MobileNavDrawer>
                <UnifiedSidebar />
              </MobileNavDrawer>
              <div className="flex-1 relative overflow-y-auto">
                <Header />
                {children}
              </div>
            </div>
          </ModalProvider>
        </WagmiProvider>
      </HeaderProvider>
    </NavbarContextProvider>
  );
}
