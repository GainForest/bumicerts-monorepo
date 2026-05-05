"use client";

import { useMemo, useState } from "react";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import { aggregateToLeaderboard } from "@/lib/utils/leaderboard";
import { useLeaderboardPeriod } from "../_hooks/useLeaderboardPeriod";
import { LeaderboardShell } from "./LeaderboardShell";
import { LeaderboardGrid } from "./LeaderboardGrid";
import { LeaderboardSkeleton } from "./LeaderboardSkeleton";
import type { FundingReceiptItem } from "@/graphql/indexer/queries/fundingReceipts";

export function LeaderboardClient() {
  const { period, setPeriod } = useLeaderboardPeriod();
  const [includeAnonymous, setIncludeAnonymous] = useState(true);
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";

  const { data: receipts, isLoading } = indexerTrpc.funding.receipts.useQuery(
    { did: facilitatorDid },
    { enabled: !!facilitatorDid }
  );

  const leaderboard = useMemo(() => {
    if (!receipts) return null;
    return aggregateToLeaderboard(receipts as FundingReceiptItem[], period, 100, includeAnonymous);
  }, [receipts, period, includeAnonymous]);

  return (
    <LeaderboardShell
      animate={false}
      period={period}
      onPeriodChange={setPeriod}
      includeAnonymous={includeAnonymous}
      onIncludeAnonymousChange={setIncludeAnonymous}
      totalDonors={leaderboard?.totalDonorsCount ?? 0}
      totalRaised={leaderboard?.totalAmountSum ?? 0}
    >
      {isLoading ? (
        <LeaderboardSkeleton />
      ) : (
        <LeaderboardGrid entries={leaderboard?.entries ?? []} />
      )}
    </LeaderboardShell>
  );
}
