"use client";

import { motion } from "framer-motion";
import { HeartIcon, WalletIcon, UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { LeaderboardEntry } from "@/lib/utils/leaderboard";

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  // Medal for top 3
  if (rank <= 3) {
    const medals = ["", "🥇", "🥈", "🥉"];
    return (
      <span className="text-2xl" role="img" aria-label={`Rank ${rank}`}>
        {medals[rank]}
      </span>
    );
  }

  // Decorative number for others
  return (
    <span
      className="text-lg font-light text-muted-foreground/60 tabular-nums"
      style={{ fontFamily: "var(--font-garamond-var)" }}
    >
      {rank}
    </span>
  );
}

// ── Truncate helper ───────────────────────────────────────────────────────────

function truncateDonorId(donorId: string, type: "did" | "wallet"): string {
  if (type === "wallet") {
    // Wallet addresses: Anonymous (0xAbcd...1234)
    const truncated = donorId.length > 12
      ? `${donorId.slice(0, 6)}…${donorId.slice(-4)}`
      : donorId;
    return `Anonymous (${truncated})`;
  }

  // DIDs: did:plc:abc123...xyz789
  const parts = donorId.split(":");
  if (parts.length >= 3) {
    const id = parts.slice(2).join(":");
    if (id.length > 14) {
      return `${parts[0]}:${parts[1]}:${id.slice(0, 6)}…${id.slice(-4)}`;
    }
  }
  return donorId;
}

// ── Main component ────────────────────────────────────────────────────────────

interface DonorCardProps {
  entry: LeaderboardEntry;
  index: number;
}

export function DonorCard({ entry, index }: DonorCardProps) {
  const truncatedId = truncateDonorId(entry.donorId, entry.donorType);

  const relativeTime = entry.lastDonatedAt
    ? (() => {
        try {
          return formatDistanceToNow(new Date(entry.lastDonatedAt), { addSuffix: true });
        } catch {
          return null;
        }
      })()
    : null;

  const Icon = entry.donorType === "wallet" ? WalletIcon : UserIcon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-primary/20 hover:shadow-lg transition-all duration-300"
    >
      {/* Rank */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>

      {/* Avatar/icon */}
      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        {entry.donorType === "wallet" ? (
          <WalletIcon className="h-4 w-4 text-primary/70" />
        ) : (
          <HeartIcon className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Donor info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-muted-foreground/60 shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {truncatedId}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {entry.donationCount} donation{entry.donationCount !== 1 ? "s" : ""}
          {relativeTime && <span className="text-muted-foreground/60"> · last {relativeTime}</span>}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="text-base font-bold text-foreground">
          ${entry.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="text-xs text-muted-foreground">USD</div>
      </div>
    </motion.div>
  );
}
