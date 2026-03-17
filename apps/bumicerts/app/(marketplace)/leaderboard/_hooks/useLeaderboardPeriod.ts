import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { LeaderboardPeriod } from "@/lib/graphql/queries";

const periods = ["all", "month", "week"] as const;

export function useLeaderboardPeriod() {
  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(periods).withDefault("all")
  );

  return {
    period: period as LeaderboardPeriod,
    setPeriod: setPeriod as (p: LeaderboardPeriod) => void,
  };
}
