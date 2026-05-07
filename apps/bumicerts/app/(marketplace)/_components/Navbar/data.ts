/**
 * @deprecated Navigation data moved to `components/layout/UnifiedSidebar/data.ts`.
 * Kept for reference only.
 * See: Unified sidebar implementation (April 2026)
 */

import {
  CompassIcon,
  Building2Icon,
  BadgePlusIcon,
  UserCircleIcon,
  TrophyIcon,
} from "lucide-react";
import { links } from "@/lib/links";

// ── Nav item types ─────────────────────────────────────────────────────────────

export interface NavLeaf {
  kind: "leaf";
  id: string;
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
  pathCheck: { equals?: string; startsWith?: string };
  /** If true, item is only rendered when the user is authenticated. */
  requiresAuth?: boolean;
  /** If true, item is rendered but disabled (with tooltip) when unauthenticated. */
  disabledWhenUnauthed?: boolean;
  /** Tooltip shown when disabled. */
  disabledTooltip?: string;
  /** If true, renders a ChevronRight trailing icon. */
  trailingArrow?: boolean;
}

export interface NavGroup {
  kind: "group";
  id: string;
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
  children: NavLeaf[];
}

export interface NavSeparator {
  kind: "separator";
  id: string;
}

export type NavItem = NavLeaf | NavGroup | NavSeparator;

// ── Factory ────────────────────────────────────────────────────────────────────
// "My Organization" href depends on the authenticated user's DID, so items are
// built at call time rather than as a static constant.

export function buildMarketplaceNavItems(did: string | undefined): NavItem[] {
  return [
    {
      kind: "leaf",
      id: "my-org",
      text: "My Organization",
      Icon: UserCircleIcon,
      href: did ? links.account.byDid(did) : "#",
      pathCheck: { startsWith: did ? `/account/${encodeURIComponent(did)}` : "__never__" },
      requiresAuth: true,
    },
    {
      kind: "group",
      id: "explore",
      text: "Explore",
      Icon: CompassIcon,
      children: [
        {
          kind: "leaf",
          id: "bumicerts",
          text: "Bumicerts",
          Icon: CompassIcon,
          href: links.explore,
          pathCheck: { startsWith: links.explore },
        },
        {
          kind: "leaf",
          id: "organizations",
          text: "Organizations",
          Icon: Building2Icon,
          href: links.allOrganizations,
          pathCheck: { startsWith: "/organizations" },
        },
      ],
    },
    {
      kind: "leaf",
      id: "leaderboard",
      text: "Leaderboard",
      Icon: TrophyIcon,
      href: links.leaderboard,
      pathCheck: { equals: links.leaderboard },
    },
    // ── separator ──
    { kind: "separator", id: "sep-1" },
    // ── below separator ──
    {
      kind: "leaf",
      id: "create",
      text: "Create a Bumicert",
      Icon: BadgePlusIcon,
      href: links.bumicert.create,
      pathCheck: { startsWith: links.bumicert.create },
    },
  ];
}
