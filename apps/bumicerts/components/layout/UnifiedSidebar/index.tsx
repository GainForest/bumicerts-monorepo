"use client";

import { LayoutGroup } from "framer-motion";
import { useAtprotoStore } from "@/components/stores/atproto";
import { SidebarHeader } from "./SidebarHeader";
import { NavSection } from "./NavSection";
import { SocialFooter } from "./SocialFooter";
import { NAV_ITEMS } from "./data";
import BumicertCreationCard from "./BumicertCreationCard";

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
  const auth = useAtprotoStore((s) => s.auth);
  const isAuthenticated = auth.status === "AUTHENTICATED";

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
                  isAuthenticated={isAuthenticated}
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
        {/* MANAGE section */}
        <LayoutGroup id="unified-sidebar-nav-manage">
          {NAV_ITEMS.map((item) => {
            if (item.kind === "section" && item.id === "manage") {
              return (
                <NavSection
                  key={item.id}
                  section={item}
                  isAuthenticated={isAuthenticated}
                  startIndex={0}
                />
              );
            }
            return null;
          })}
        </LayoutGroup>

        <div className="h-px bg-border" />
        <SocialFooter />
      </div>
    </nav>
  );
}
