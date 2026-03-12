"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BuildingIcon, LeafIcon } from "lucide-react";
import type { OrganizationData } from "@/lib/types";
import { links } from "@/lib/links";

const COUNTRY_MAP: Record<string, { emoji: string; name: string }> = {
  ID: { emoji: "🇮🇩", name: "Indonesia" },
  KE: { emoji: "🇰🇪", name: "Kenya" },
  CO: { emoji: "🇨🇴", name: "Colombia" },
  BR: { emoji: "🇧🇷", name: "Brazil" },
  PH: { emoji: "🇵🇭", name: "Philippines" },
};

export const orgCardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

export function OrganizationCard({ org }: { org: OrganizationData }) {
  const countryData = COUNTRY_MAP[org.country];

  return (
    <motion.div variants={orgCardVariants} className="h-full">
      <Link href={links.organization.home(org.did)} className="h-full">
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="group h-full flex flex-col rounded-xl border border-border bg-card overflow-hidden cursor-pointer shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-300"
          style={{
            viewTransitionName: `org-${org.did.replace(/[^a-z0-9]/gi, "-")}`,
          }}
        >
          {/* Cover */}
          <div className="h-32 relative overflow-hidden shrink-0">
            {org.coverImageUrl ? (
              <Image
                src={org.coverImageUrl}
                alt={org.displayName}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}
            {/* Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

            {/* Country badge */}
            {countryData && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                <span>{countryData.emoji}</span>
                <span className="text-foreground/80">{countryData.name}</span>
              </div>
            )}

            {/* Logo + Name row on gradient */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-background/80 border border-border/50 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                {org.logoUrl ? (
                  <Image
                    src={org.logoUrl}
                    alt={org.displayName}
                    width={32}
                    height={32}
                    className="object-cover rounded-full"
                  />
                ) : (
                  <BuildingIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-serif font-bold text-base text-foreground line-clamp-1 leading-tight">
                {org.displayName}
              </h3>
            </div>
          </div>

          {/* Body - flex-1 to fill remaining space */}
          <div className="p-3 flex-1">
            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
              {org.shortDescription}
            </p>
          </div>

          {/* Footer - fixed height, no wrap */}
          <div className="px-3 pb-3 flex items-center justify-between shrink-0">
            <div className="flex gap-1 overflow-hidden">
              {org.objectives.slice(0, 2).map((obj) => (
                <span
                  key={obj}
                  className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium truncate max-w-[100px]"
                >
                  {obj}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs font-semibold text-primary shrink-0">
              <LeafIcon className="h-3.5 w-3.5" />
              <span>{org.bumicertCount}</span>
            </div>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function OrganizationCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-32 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />
        <div className="h-3 w-full rounded bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />
        <div className="h-3 w-2/3 rounded bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />
      </div>
    </div>
  );
}
