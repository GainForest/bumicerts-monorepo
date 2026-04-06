"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUpIcon } from "lucide-react";
import type { TimeGranularity, TimeSeriesPoint } from "../_utils/aggregations";

interface DonationsChartProps {
  data: TimeSeriesPoint[];
  onGranularityChange: (g: TimeGranularity) => void;
  granularity: TimeGranularity;
}

const GRANULARITIES: { value: TimeGranularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
];

function formatDate(date: string, granularity: TimeGranularity): string {
  const d = new Date(date);
  if (granularity === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  if (granularity === "week") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: { value?: number; payload?: TimeSeriesPoint }[];
  label?: string;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const amount: number = payload[0]?.value ?? 0;
  const count: number = payload[0]?.payload?.count ?? 0;
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2 shadow-sm text-xs">
      <p className="font-medium text-foreground">{label}</p>
      <p className="text-muted-foreground mt-0.5">
        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)}
      </p>
      <p className="text-muted-foreground">
        {count} donation{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

export function DonationsChart({
  data,
  granularity,
  onGranularityChange,
}: DonationsChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: formatDate(d.date, granularity),
  }));

  return (
    <div className="rounded-2xl border border-border bg-background p-5">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Donation Volume Over Time
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            USD raised per {granularity}
          </p>
        </div>
        {/* Granularity toggle */}
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 p-1">
          {GRANULARITIES.map((g) => {
            const active = granularity === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => onGranularityChange(g.value)}
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          No donation data for this period.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={formatted} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="donationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
              }
              width={48}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="url(#donationGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
