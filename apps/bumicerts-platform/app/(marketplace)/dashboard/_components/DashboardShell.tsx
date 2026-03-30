"use client";

import { motion } from "framer-motion";
import { BarChart3Icon } from "lucide-react";

interface DashboardShellProps {
  animate?: boolean;
  children?: React.ReactNode;
  /** Optional period filter rendered in the header row next to the title. */
  periodFilter?: React.ReactNode;
}

export function DashboardShell({
  animate = true,
  children,
  periodFilter,
}: DashboardShellProps) {
  return (
    <section className="pt-6 pb-20 md:pb-28 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8 flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3Icon className="h-4 w-4 text-primary" />
              <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                Platform Analytics
              </p>
            </div>
            <h1
              className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
              style={{ fontFamily: "var(--font-garamond-var)" }}
            >
              Donations Dashboard
            </h1>
          </div>

          {periodFilter !== undefined && (
            <div className="shrink-0">{periodFilter}</div>
          )}
        </motion.div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-8" />

        {children}
      </div>
    </section>
  );
}
