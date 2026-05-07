"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { BuildingIcon, LeafIcon } from "lucide-react";
import { countries } from "@/lib/countries";
import type { OrganizationData } from "@/lib/types";
import { links } from "@/lib/links";
import { blo } from "blo";

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
  const countryData = countries[org.country];

  return (
    <motion.div variants={orgCardVariants} className="h-full">
      <Link href={links.account.byDid(org.did)} className="h-full">
        <motion.div
          whileHover={{ y: -3 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="group h-full flex flex-col rounded-2xl border border-border/50! overflow-hidden cursor-pointer transition-all duration-300"
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
            <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />

            {/* Country badge */}
            {countryData && (
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-background/60 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                <span>{countryData.emoji}</span>
                <span className="text-foreground/80">{countryData.name}</span>
              </div>
            )}

            {/* Logo + Name on gradient */}
            <div className="absolute bottom-2 left-4 right-4 flex flex-col items-start gap-2">
              {/*Image is intentionally misaligned for visual satisfaction.*/}
              <div className="-ml-1 h-12 w-12 rounded-full bg-background/80 overflow-hidden flex items-center justify-center shrink-0">
                <Image
                  src={org.logoUrl ?? blo(org.did as `0x${string}`)}
                  alt={org.displayName}
                  width={42}
                  height={42}
                  className="object-cover rounded-full h-full w-full"
                />
              </div>
              <h3 className="font-instrument text-2xl italic text-foreground line-clamp-1">
                {org.displayName}
              </h3>
            </div>
          </div>

          {/* Body - flex-1 to fill remaining space */}
          <div className="px-4 flex-1">
            <p className="text-muted-foreground line-clamp-3">
              {org.shortDescription}
            </p>
          </div>

          {/* Footer - fixed height, no wrap */}
          <div className="p-4 flex items-center justify-between shrink-0">
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
              <LeafIcon className="size-3.5" />
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
