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

export const UPLOAD_NAV_ITEMS: NavItem[] = [
  {
    id: "organization",
    text: "Organization",
    Icon: Building2Icon,
    href: links.upload.home,
    pathCheck: { equals: links.upload.home },
  },
  {
    id: "sites",
    text: "Sites",
    Icon: MapPinIcon,
    href: links.upload.sites,
    pathCheck: { startsWith: links.upload.sites },
  },
  {
    id: "audio",
    text: "Audio",
    Icon: MicIcon,
    href: links.upload.audio,
    pathCheck: { startsWith: links.upload.audio },
  },
  {
    id: "bumicerts",
    text: "Bumicerts",
    Icon: BumicertIcon,
    href: links.upload.bumicerts,
    pathCheck: { startsWith: links.upload.bumicerts },
  },
  {
    id: "trees",
    text: "Trees",
    Icon: TreePineIcon,
    href: links.upload.trees,
    pathCheck: { startsWith: links.upload.trees },
  },
];
