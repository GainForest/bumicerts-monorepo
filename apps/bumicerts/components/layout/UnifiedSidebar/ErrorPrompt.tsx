"use client";

import { motion } from "framer-motion";
import { AlertCircleIcon } from "lucide-react";

export function ErrorPrompt() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
      className="mx-1 p-3 rounded-lg bg-muted/40 border border-border/50"
    >
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
        <AlertCircleIcon className="size-3.5 shrink-0" />
        Couldn&apos;t load your account right now.
      </div>
    </motion.div>
  );
}
