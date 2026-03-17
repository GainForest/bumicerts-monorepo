"use client";

import { TrophyIcon } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/graphql/queries";
import { DonorCard } from "./DonorCard";

interface LeaderboardGridProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardGrid({ entries }: LeaderboardGridProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <TrophyIcon className="h-10 w-10 opacity-20" />
        <p
          className="text-2xl md:text-3xl font-light text-foreground"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          No donations yet
        </p>
        <p
          className="text-base text-foreground/70 max-w-sm"
          style={{ fontFamily: "var(--font-instrument-serif-var)", fontStyle: "italic" }}
        >
          Be the first to make an impact!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <DonorCard key={entry.donorId} entry={entry} index={index} />
      ))}
    </div>
  );
}
