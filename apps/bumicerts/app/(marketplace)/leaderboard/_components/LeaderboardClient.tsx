"use client";

import { queries } from "@/lib/graphql/queries";
import { useLeaderboardPeriod } from "../_hooks/useLeaderboardPeriod";
import { LeaderboardShell } from "./LeaderboardShell";
import { LeaderboardGrid } from "./LeaderboardGrid";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";

export function LeaderboardClient() {
  const { period, setPeriod } = useLeaderboardPeriod();

  const { data, isLoading } = queries.leaderboard.useQuery({
    period,
    limit: 100,
  });

  return (
    <LeaderboardShell
      animate={false}
      period={period}
      onPeriodChange={setPeriod}
      totalDonors={data?.totalDonorsCount ?? 0}
      totalRaised={data?.totalAmountSum ?? 0}
    >
      {isLoading ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardGrid entries={data?.entries ?? []} />
      )}
    </LeaderboardShell>
  );
}
