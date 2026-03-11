"use client";

import { motion } from "framer-motion";
import { MapPinIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";

// ── Site boundaries card ───────────────────────────────────────────────────────

function SiteBoundariesCard({ country }: { country: string }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="relative h-40 bg-muted/20 flex items-center justify-center">
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 38% 62%, oklch(0.45 0.08 160 / 0.12) 0%, transparent 55%), radial-gradient(ellipse at 68% 30%, oklch(0.5 0.06 150 / 0.08) 0%, transparent 48%)" }}
        />
        <div className="relative flex flex-col items-center gap-2 text-muted-foreground/50">
          <MapPinIcon className="h-10 w-10" />
          {country && <span className="text-xs font-medium tracking-wide uppercase">{country}</span>}
        </div>
      </div>
      <div className="px-4 py-3 flex items-center justify-between bg-muted/10 border-t border-border">
        <span className="text-xs text-muted-foreground">Site boundaries</span>
        <button className="text-xs text-primary font-medium hover:opacity-75 transition-opacity cursor-pointer">
          View GeoJSON →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SiteBoundariesTab({ bumicert }: { bumicert: BumicertData }) {
  return (
    <motion.div
      key="site-boundaries"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div className="flex items-center gap-2 mb-3">
        <MapPinIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Site Boundaries
        </span>
      </div>
      <SiteBoundariesCard country={bumicert.country} />
    </motion.div>
  );
}
