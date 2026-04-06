"use client";

import { motion } from "framer-motion";
import { HeartIcon } from "lucide-react";
import type { BumicertData } from "@/lib/types";
import { DonationsSection } from "../DonationsSection";

// ── Main ──────────────────────────────────────────────────────────────────────

export function DonationsTab({ bumicert }: { bumicert: BumicertData }) {
  return (
    <motion.div
      key="donations"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div className="flex items-center gap-2 mb-3">
        <HeartIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Donations
        </span>
      </div>
      <DonationsSection bumicert={bumicert} />
    </motion.div>
  );
}
