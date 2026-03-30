"use client";

import { useMemo, useState } from "react";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";
import {
  filterByPeriod,
  computeKPIs,
  computeTimeSeries,
  computeTopDonors,
  computePerOrg,
  computeRecentTransactions,
  type TimeGranularity,
} from "../_utils/aggregations";
import { DashboardShell } from "./DashboardShell";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { PeriodFilter, useDashboardPeriod } from "./PeriodFilter";
import { KPISummary } from "./KPISummary";
import { DonationsChart } from "./DonationsChart";
import { TopDonorsTable } from "./TopDonorsTable";
import { OrganizationsTable } from "./OrganizationsTable";
import { RecentTransactionsTable } from "./RecentTransactionsTable";

export function DashboardClient() {
  const { period, setPeriod } = useDashboardPeriod();
  const [granularity, setGranularity] = useState<TimeGranularity>("day");

  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";

  const { data: rawReceipts, isLoading } = indexerTrpc.funding.receipts.useQuery(
    { did: facilitatorDid },
    { enabled: !!facilitatorDid },
  );

  const receipts = useMemo(
    () => (rawReceipts ?? []) as FundingReceiptItem[],
    [rawReceipts],
  );
  const periodFiltered = useMemo(() => filterByPeriod(receipts, period), [receipts, period]);

  const kpis = useMemo(() => computeKPIs(periodFiltered), [periodFiltered]);
  const timeSeries = useMemo(
    () => computeTimeSeries(periodFiltered, granularity),
    [periodFiltered, granularity],
  );
  const topDonors = useMemo(() => computeTopDonors(periodFiltered, 50), [periodFiltered]);
  const perOrg = useMemo(() => computePerOrg(periodFiltered), [periodFiltered]);
  // Recent transactions always show across all-time, regardless of period filter
  const recentTx = useMemo(() => computeRecentTransactions(receipts, 50), [receipts]);

  return (
    <DashboardShell
      animate={false}
      periodFilter={
        <PeriodFilter period={period} onPeriodChange={setPeriod} />
      }
    >
      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="flex flex-col gap-12">
          {/* KPIs */}
          <KPISummary kpis={kpis} />

          {/* Chart */}
          <DonationsChart
            data={timeSeries}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />

          {/* Donors + Orgs side by side on wider screens */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <TopDonorsTable rows={topDonors} />
            <OrganizationsTable rows={perOrg} />
          </div>

          {/* Recent transactions */}
          <RecentTransactionsTable rows={recentTx} />
        </div>
      )}
    </DashboardShell>
  );
}
