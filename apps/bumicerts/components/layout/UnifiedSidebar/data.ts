import {
  CompassIcon,
  Building2Icon,
  TrophyIcon,
  MapPinIcon,
  MicIcon,
  TreePineIcon,
} from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { links } from "@/lib/links";

// ── Nav item types ─────────────────────────────────────────────────────────────

export interface NavLeaf {
  kind: "leaf";
  id: string;
  text: string;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
  pathCheck: { equals?: string; startsWith?: string };
}

export interface NavSection {
  kind: "section";
  id: string;
  label: string;
  items: NavLeaf[];
  /** If true, section is only shown when authenticated. Shows sign-in prompt otherwise. */
  requiresAuth?: boolean;
}

export interface NavSeparator {
  kind: "separator";
  id: string;
}

export type NavItem = NavSection | NavSeparator;

// ── Navigation structure ────────────────────────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "section",
    id: "explore",
    label: "EXPLORE",
    items: [
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
        pathCheck: { startsWith: "/organization/all" },
      },
      {
        kind: "leaf",
        id: "leaderboard",
        text: "Leaderboard",
        Icon: TrophyIcon,
        href: links.leaderboard,
        pathCheck: { equals: links.leaderboard },
      },
    ],
  },
  {
    kind: "section",
    id: "manage",
    label: "MANAGE",
    requiresAuth: true,
    items: [
      {
        kind: "leaf",
        id: "organization",
        text: "Organization",
        Icon: Building2Icon,
        href: links.upload.home,
        pathCheck: { equals: links.upload.home },
      },
      {
        kind: "leaf",
        id: "sites",
        text: "Sites",
        Icon: MapPinIcon,
        href: links.upload.sites,
        pathCheck: { startsWith: links.upload.sites },
      },
      {
        kind: "leaf",
        id: "audio",
        text: "Audio",
        Icon: MicIcon,
        href: links.upload.audio,
        pathCheck: { startsWith: links.upload.audio },
      },
      {
        kind: "leaf",
        id: "bumicerts-manage",
        text: "Bumicerts",
        Icon: BumicertIcon,
        href: links.upload.bumicerts,
        pathCheck: { startsWith: links.upload.bumicerts },
      },
      {
        kind: "leaf",
        id: "trees",
        text: "Trees",
        Icon: TreePineIcon,
        href: links.upload.trees,
        pathCheck: { startsWith: links.upload.trees },
      },
    ],
  },
];
