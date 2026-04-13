"use client";

import { LayoutGroup } from "framer-motion";
import { useAtprotoStore } from "@/components/stores/atproto";
import { SidebarHeader } from "./SidebarHeader";
import { NavSection } from "./NavSection";
import { SocialFooter } from "./SocialFooter";
import { NAV_ITEMS, type NavSection as NavSectionType } from "./data";

/**
 * UnifiedSidebar
 *
 * Single sidebar component shared between (marketplace) and (upload) route groups.
 * Replaces the old separate DesktopSidebar components.
 *
 * Structure:
 * - Header: Logo + "Bumicerts" + Create button
 * - EXPLORE section (always visible)
 * - MANAGE section (requires auth, shows sign-in prompt if not authenticated)
 * - Social footer
 */
export function UnifiedSidebar() {
  const auth = useAtprotoStore((s) => s.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";

  // Split sections into EXPLORE (top) and MANAGE (bottom)
  const exploreSection = NAV_ITEMS.find(
    (item) => item.kind === "section" && item.id === "explore"
  ) as NavSectionType | undefined;
  const manageSection = NAV_ITEMS.find(
    (item) => item.kind === "section" && item.id === "manage"
  ) as NavSectionType | undefined;

  return (
    <nav className="w-[240px] h-full flex flex-col p-4 border-r border-border bg-foreground/3 relative">
      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Header */}
        <SidebarHeader />

        {/* EXPLORE section */}
        <LayoutGroup id="unified-sidebar-nav">
          {exploreSection && (
            <NavSection
              section={exploreSection}
              isAuthenticated={isAuthenticated}
              startIndex={0}
            />
          )}
        </LayoutGroup>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom section */}
      <div className="flex flex-col gap-2">
        {/* MANAGE section */}
        <LayoutGroup id="unified-sidebar-nav-manage">
          {manageSection && (
            <NavSection
              section={manageSection}
              isAuthenticated={isAuthenticated}
              startIndex={0}
            />
          )}
        </LayoutGroup>

        <div className="h-px bg-border" />
        <SocialFooter />
      </div>
    </nav>
  );
}
