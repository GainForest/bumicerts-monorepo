"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRightIcon } from "lucide-react";
import { useState } from "react";
import type { BumicertData } from "@/lib/types";

// Item variants for stagger - using design system's smooth ease
export const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

export function BumicertCard({ bumicert }: { bumicert: BumicertData }) {
  const [hovered, setHovered] = useState(false);

  // Format time ago - clean, no "about" or "almost"
  const timeAgo = formatDistanceToNow(new Date(bumicert.createdAt), { addSuffix: false })
    .replace("about ", "")
    .replace("almost ", "")
    .replace("over ", "")
    .replace("less than ", "<");

  return (
    <motion.div variants={cardVariants} className="h-full">
      <Link href={`/bumicert/${encodeURIComponent(bumicert.id)}`} className="h-full block">
        <motion.div
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => setHovered(false)}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="group h-full flex flex-col rounded-2xl border border-border bg-card overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-2xl hover:border-primary/20"
        >
          {/* Cover image with overlaid dotted header */}
          <div
            className="relative aspect-[4/3] overflow-hidden"
            style={{
              viewTransitionName: `bumicert-img-${bumicert.id.replace(/[^a-z0-9]/gi, "-")}`,
            }}
          >
            {bumicert.coverImageUrl ? (
              <Image
                src={bumicert.coverImageUrl}
                alt={bumicert.title}
                fill
                className="object-cover scale-105 group-hover:scale-100 transition-transform duration-700"
              />
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}

            {/* header overlay - gradient bg, more opaque */}
            <div className="absolute inset-0 bottom-[75%] bg-linear-to-b from-background via-background/70 to-transparent" />
            <div
              className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-3"
            >
              {/* Org logo + name */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-6 w-6 rounded-full bg-white border border-black/10 shadow-sm overflow-hidden shrink-0">
                  {bumicert.logoUrl ? (
                    <Image
                      src={bumicert.logoUrl}
                      alt={bumicert.organizationName}
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                      {bumicert.organizationName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs font-medium text-foreground truncate drop-shadow-md">
                  {bumicert.organizationName}
                </span>
              </div>

              {/* Time ago */}
              <span className="text-[10px] uppercase drop-shadow-md tracking-widest text-muted-foreground shrink-0">
                {timeAgo} ago
              </span>
            </div>

            {/* Bottom gradient for readability */}


            {/* Tags - with translucent blurred background */}
            <div className="absolute bottom-3 left-3 right-12 flex items-center gap-2 flex-wrap">
              {bumicert.objectives.slice(0, 2).map((obj) => (
                <span
                  key={obj}
                  className="text-[10px] uppercase tracking-[0.08em] text-foreground bg-background/40 backdrop-blur-md rounded-full px-2.5 py-1 font-medium"
                >
                  {obj}
                </span>
              ))}
            </div>

            {/* Hover CTA - arrow icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={hovered ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30"
            >
              <ArrowUpRightIcon className="h-4 w-4" />
            </motion.div>
          </div>

          {/* Footer - title + description */}
          <div className="px-4 py-4 border-t border-border flex-1">
            {/* Title */}
            <h3
              className="text-base font-medium text-foreground leading-snug line-clamp-1"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              {bumicert.title}
            </h3>

            {/* Description - 2 lines */}
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {bumicert.description}
            </p>
          </div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function BumicertCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="relative aspect-[4/3]">
        {/* Image skeleton */}
        <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer" />

        {/* Dotted header skeleton */}
        <div
          className="absolute top-0 left-0 right-0 h-11 flex items-center justify-between px-3"
          style={{
            background: "linear-gradient(to bottom, oklch(var(--background) / 0.85) 0%, oklch(var(--background) / 0.7) 100%)",
            backgroundImage: `radial-gradient(circle, oklch(var(--foreground) / 0.06) 1px, transparent 1px)`,
            backgroundSize: "6px 6px",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-2.5 w-14 rounded bg-muted animate-pulse" />
        </div>

        {/* Tags skeleton */}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/60 animate-pulse" />
          <div className="h-5 w-20 rounded-full bg-muted/60 animate-pulse" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
