"use client";

import { usePathname } from "next/navigation";
import { NavbarContextProvider } from "./_components/Navbar/context";
import { HeaderProvider } from "./_components/Header/context";
import { AppEntryProvider } from "@/components/providers/AppEntryProvider";
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
        <AppEntryProvider>
          <div className="min-h-screen flex flex-col">
            <TopNavbar />
            <main className="flex-1">{children}</main>
          </div>
        </AppEntryProvider>
      </NavbarContextProvider>
    );
  }

  return (
    <NavbarContextProvider>
      <HeaderProvider>
        <WagmiProvider>
          <ModalProvider>
            <AppEntryProvider>
              {/* Desktop: sidebar + content */}
              <div className="hidden md:flex h-screen overflow-hidden">
                <UnifiedSidebar />
                <main className="relative flex-1 overflow-y-auto">
                  {/* Header overlays content for translucency effect */}
                  <Header />
                  {children}
                </main>
              </div>

              {/* Mobile: full width + floating sidebar drawer */}
              <div className="flex h-screen flex-col overflow-hidden md:hidden">
                <MobileNavDrawer>
                  <UnifiedSidebar />
                </MobileNavDrawer>
                <div className="relative flex-1 overflow-y-auto">
                  <Header />
                  {children}
                </div>
              </div>
            </AppEntryProvider>
          </ModalProvider>
        </WagmiProvider>
      </HeaderProvider>
    </NavbarContextProvider>
  );
}
