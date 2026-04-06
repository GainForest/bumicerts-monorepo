"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRightIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { links } from "@/lib/links";

/**
 * Compact preview card for the Sites section.
 *
 * Sites data lives in the GraphQL indexer; we don't have a tRPC query for it.
 * This component is a navigation CTA that links to the full sites management page.
 */
export function SitesPreview() {
  return (
    <section className="py-4 space-y-3">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Sites
          </span>
        </div>
        <Link
          href={links.upload.sites}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Manage all
          <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>

      {/* Navigation CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Link
          href={links.upload.sites}
          className="group flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-300"
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10 shrink-0">
            <PlusIcon className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              Manage geographic sites
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Add GeoJSON boundaries, coordinates, and site metadata.
            </p>
          </div>
          <ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </motion.div>
    </section>
  );
}
