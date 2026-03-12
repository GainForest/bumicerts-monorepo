"use client";

import { usePathname } from "next/navigation";
import { NavbarContextProvider } from "./_components/Navbar/context";
import { HeaderProvider } from "./_components/Header/context";
import { ModalProvider } from "@/components/ui/modal/context";
import { TopNavbar } from "./_components/Navbar/TopNavbar";
import { DesktopSidebar } from "./_components/Navbar/DesktopSidebar";
import { MobileBottomNav } from "./_components/Navbar/MobileBottomNav";
import { Header } from "./_components/Header/Header";
import { usePlatformTransitionToast } from "@/hooks/usePlatformTransitionToast";

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  usePlatformTransitionToast();

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
        <ModalProvider>
          {/* Desktop: sidebar + content */}
          <div className="hidden md:flex h-screen overflow-hidden">
            <DesktopSidebar />
            <main className="flex-1 relative overflow-y-auto">
              {/* Header overlays content for translucency effect */}
              <Header />
              {children}
            </main>
          </div>

          {/* Mobile: full width with bottom nav */}
          <div className="md:hidden flex flex-col h-screen overflow-hidden">
            <div className="flex-1 relative overflow-y-auto pb-16">
              {/* Header overlays content for translucency effect, same as desktop */}
              <Header />
              {children}
            </div>
            <MobileBottomNav />
          </div>
        </ModalProvider>
      </HeaderProvider>
    </NavbarContextProvider>
  );
}
