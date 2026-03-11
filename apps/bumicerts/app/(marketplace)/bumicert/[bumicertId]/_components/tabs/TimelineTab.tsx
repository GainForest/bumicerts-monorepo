"use client";

import { motion } from "framer-motion";
import { ClockIcon } from "lucide-react";

// ── Main ──────────────────────────────────────────────────────────────────────

export function TimelineTab() {
  return (
    <motion.div
      key="timeline"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="py-1"
    >
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <ClockIcon className="h-9 w-9 opacity-30" />
        <p className="text-sm font-medium">Timeline coming soon</p>
      </div>
    </motion.div>
  );
}
