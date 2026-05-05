"use client";

/**
 * ManageNavGrid
 *
 * A dashboard grid shown in view mode below the org about section.
 * Each card navigates to a section of the MANAGE platform.
 *
 * Cards:
 *   Edit Profile  → /manage?mode=edit
 *   Sites         → /manage/sites
 *   Audio         → /manage/audio
 *   Trees         → /manage/trees
 *   Bumicerts     → /bumicert/create
 */

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  MapPinIcon,
  MicIcon,
  PencilIcon,
  TreesIcon,
} from "lucide-react";
import BumicertIcon from "@/icons/BumicertIcon";
import { links } from "@/lib/links";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { AccountKind } from "@/lib/account";

interface NavCard {
  id: string;
  label: string;
  description: string;
  href: string;
  Icon: LucideIcon | ComponentType<{ className?: string }>;
}

const NAV_CARDS: NavCard[] = [
  {
    id: "edit",
    label: "Edit Profile",
    description:
      "Update your organization name, description, logo, and cover image.",
    href: links.manage.edit,
    Icon: PencilIcon,
  },
  {
    id: "sites",
    label: "Sites",
    description:
      "Manage your conservation sites, boundaries, and location data.",
    href: links.manage.sites,
    Icon: MapPinIcon,
  },
  {
    id: "audio",
    label: "Audio",
    description: "Manage biodiversity audio recordings tied to your sites.",
    href: links.manage.audio,
    Icon: MicIcon,
  },
  {
    id: "trees",
    label: "Trees",
    description: "Manage tree records, and linked photos.",
    href: links.manage.trees,
    Icon: TreesIcon,
  },
  {
    id: "bumicerts",
    label: "Bumicerts",
    description:
      "Create and manage verified impact certificates for your work.",
    href: links.manage.bumicerts,
    Icon: BumicertIcon,
  },
];

export function ManageNavGrid({
  accountKind = "organization",
}: {
  accountKind?: AccountKind;
}) {
  const cards =
    accountKind === "organization"
      ? NAV_CARDS
      : [
          {
            id: "edit",
            label: "Edit Profile",
            description:
              "Update your account name, description, website, and avatar.",
            href: links.manage.edit,
            Icon: PencilIcon,
          },
        ];

  return (
    <div className="pt-4 pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {cards.map((card, i) => {
          const Icon = card.Icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: i * 0.06,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              <Link
                href={card.href}
                className="group flex flex-col gap-3 h-full p-4 rounded-2xl border border-border bg-background hover:border-primary/20 hover:shadow-md transition-all duration-300"
              >
                {/* Icon */}
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-xl bg-muted/60 flex items-center justify-center group-hover:bg-primary/8 transition-colors duration-300">
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary/60 group-hover:translate-x-0.5 transition-all duration-300" />
                </div>

                {/* Text */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {card.label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
