"use client";

import { motion } from "framer-motion";
import { TrophyIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaderboardPeriod } from "@/lib/graphql/queries";

// ── Period filter chips ───────────────────────────────────────────────────────

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "month", label: "This Month" },
  { value: "week", label: "This Week" },
];

function PeriodChips({
  period,
  onPeriodChange,
}: {
  period: LeaderboardPeriod;
  onPeriodChange: (p: LeaderboardPeriod) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {PERIODS.map((p) => (
        <button
          key={p.value}
          onClick={() => onPeriodChange(p.value)}
          className={cn(
            "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border transition-all whitespace-nowrap",
            period === p.value
              ? "bg-foreground text-background border-foreground"
              : "text-muted-foreground border-border hover:border-foreground/50 hover:text-foreground"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

// ── Stats summary ─────────────────────────────────────────────────────────────

function StatsSummary({
  totalDonors,
  totalRaised,
}: {
  totalDonors: number;
  totalRaised: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 md:gap-6">
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 inline-flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.12em] text-primary/70 font-medium">
          Total Raised
        </span>
        <span className="text-xl font-bold text-primary">
          ${totalRaised.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
          <span className="text-sm font-normal text-primary/70">USDC</span>
        </span>
      </div>
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 inline-flex flex-col">
        <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
          Donors
        </span>
        <span className="text-xl font-bold text-foreground">
          {totalDonors}
        </span>
      </div>
    </div>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

export interface LeaderboardShellProps {
  animate?: boolean;
  period?: LeaderboardPeriod;
  onPeriodChange?: (p: LeaderboardPeriod) => void;
  totalDonors?: number;
  totalRaised?: number;
  children?: React.ReactNode;
}

export function LeaderboardShell({
  animate = true,
  period = "all",
  onPeriodChange,
  totalDonors = 0,
  totalRaised = 0,
  children,
}: LeaderboardShellProps) {
  return (
    <section className="pt-6 pb-20 md:pb-28 px-6">
      <div className="max-w-4xl mx-auto">

        {/* Heading */}
        <motion.div
          initial={animate ? { opacity: 0, y: 16 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrophyIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Leaderboard
            </span>
          </div>
          <h1
            className="text-3xl md:text-4xl lg:text-5xl font-light tracking-[-0.02em] leading-[1.1] text-foreground"
            style={{ fontFamily: "var(--font-garamond-var)" }}
          >
            Impact{" "}
            <span
              className="text-foreground/80"
              style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
            >
              Champions
            </span>
          </h1>
        </motion.div>

        {/* Period filters + stats */}
        <motion.div
          initial={animate ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
        >
          {onPeriodChange ? (
            <PeriodChips period={period} onPeriodChange={onPeriodChange} />
          ) : (
            <div className="flex items-center gap-2">
              {PERIODS.map((p) => (
                <div
                  key={p.value}
                  className={cn(
                    "shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border",
                    p.value === "all"
                      ? "bg-foreground text-background border-foreground"
                      : "text-muted-foreground/50 border-border/50"
                  )}
                >
                  {p.label}
                </div>
              ))}
            </div>
          )}
          <StatsSummary totalDonors={totalDonors} totalRaised={totalRaised} />
        </motion.div>

        {/* Gradient separator */}
        <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-8" />

        {/* Main content slot */}
        {children}

      </div>
    </section>
  );
}
