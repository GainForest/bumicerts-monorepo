import { DollarSignIcon, HashIcon, UsersIcon, TrendingUpIcon, LayoutGridIcon } from "lucide-react";
import type { DashboardKPIs } from "../_utils/aggregations";

interface KPISummaryProps {
  kpis: DashboardKPIs;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-primary">{icon}</span>
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p
        className="text-3xl md:text-4xl font-light tracking-[-0.02em] leading-none text-foreground"
        style={{ fontFamily: "var(--font-garamond-var)" }}
      >
        {value}
      </p>
      {sub !== undefined && (
        <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function KPISummary({ kpis }: KPISummaryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        icon={<DollarSignIcon className="h-4 w-4" />}
        label="Total Raised"
        value={formatUSD(kpis.totalRaised)}
        sub="All USD donations"
      />
      <StatCard
        icon={<HashIcon className="h-4 w-4" />}
        label="Total Donations"
        value={formatCount(kpis.totalDonations)}
        sub="Receipts recorded"
      />
      <StatCard
        icon={<UsersIcon className="h-4 w-4" />}
        label="Unique Donors"
        value={formatCount(kpis.uniqueDonors)}
        sub="By DID or wallet"
      />
      <StatCard
        icon={<TrendingUpIcon className="h-4 w-4" />}
        label="Avg Donation"
        value={formatUSD(kpis.avgDonation)}
        sub="Per transaction"
      />
      <StatCard
        icon={<LayoutGridIcon className="h-4 w-4" />}
        label="Active Bumicerts"
        value={formatCount(kpis.activeBumicerts)}
        sub="Have received funds"
      />
    </div>
  );
}
