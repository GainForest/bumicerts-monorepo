"use client";

import { LayoutGroup } from "framer-motion";
import { SidebarHeader } from "./SidebarHeader";
import { NavSection } from "./NavSection";
import { SocialFooter } from "./SocialFooter";
import { NAV_ITEMS } from "./data";
import BumicertCreationCard from "./BumicertCreationCard";
import { ManageSection } from "./ManageSection";

/**
 * UnifiedSidebar
 *
 * Single sidebar component shared between (marketplace) and (manage) route groups.
 * Replaces the old separate DesktopSidebar components.
 *
 * Structure:
 * - Header: Logo + "Bumicerts" + Create button
 * - EXPLORE section (always visible)
 * - MANAGE section (requires auth, shows sign-in prompt if not authenticated)
 * - Social footer
 */
export function UnifiedSidebar() {
  return (
    <nav className="w-[240px] h-full flex flex-col p-4 border-r border-border bg-foreground/3 relative">
      {/* Top section */}
      <div className="flex flex-col gap-1">
        {/* Header */}
        <SidebarHeader />

        {/* EXPLORE section */}
        <LayoutGroup id="unified-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            if (item.kind === "section" && item.id === "explore") {
              return (
                <NavSection
                  key={item.id}
                  section={item}
                  isAuthenticated={true}
                  startIndex={0}
                />
              );
            }
            return null;
          })}
        </LayoutGroup>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
      {/* Bottom section */}
      <BumicertCreationCard />
      <div className="flex flex-col gap-2">
        <LayoutGroup id="unified-sidebar-nav-manage">
          <ManageSection />
        </LayoutGroup>

        <div className="h-px bg-border" />
        <SocialFooter />
      </div>
    </nav>
  );
}
