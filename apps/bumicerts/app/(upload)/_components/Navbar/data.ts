/**
 * @deprecated Navigation data moved to `components/layout/UnifiedSidebar/data.ts`.
 * Kept for reference only.
 * See: Unified sidebar implementation (April 2026)
 */

import { Building2Icon, MapPinIcon, MicIcon, TreePineIcon } from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { links } from "@/lib/links";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  id: string;
  text: string;
  Icon: LucideIcon | ComponentType<{ className?: string }>;
  href: string;
  /** Exact match → `{ equals: href }`. Prefix match → `{ startsWith: prefix }`. */
  pathCheck: { equals?: string; startsWith?: string };
};

export const MANAGE_NAV_ITEMS: NavItem[] = [
  {
    id: "organization",
    text: "Organization",
    Icon: Building2Icon,
    href: links.manage.home,
    pathCheck: { equals: links.manage.home },
  },
  {
    id: "sites",
    text: "Sites",
    Icon: MapPinIcon,
    href: links.manage.sites,
    pathCheck: { startsWith: links.manage.sites },
  },
  {
    id: "audio",
    text: "Audio",
    Icon: MicIcon,
    href: links.manage.audio,
    pathCheck: { startsWith: links.manage.audio },
  },
  {
    id: "bumicerts",
    text: "Bumicerts",
    Icon: BumicertIcon,
    href: links.manage.bumicerts,
    pathCheck: { startsWith: links.manage.bumicerts },
  },
  {
    id: "trees",
    text: "Trees",
    Icon: TreePineIcon,
    href: links.manage.trees,
    pathCheck: { startsWith: links.manage.trees },
  },
];
