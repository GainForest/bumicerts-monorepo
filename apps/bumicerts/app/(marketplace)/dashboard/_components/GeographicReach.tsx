import { GlobeIcon } from "lucide-react";
import type { GeoStats } from "../_utils/geo-aggregations";

interface GeographicReachProps {
  stats: GeoStats;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function GeographicReach({ stats }: GeographicReachProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
      {/* Countries stat card */}
      <div className="rounded-2xl border border-border bg-background p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <GlobeIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Geographic Reach
          </span>
        </div>
        <p
          className="text-3xl md:text-4xl font-light tracking-[-0.02em] leading-none text-foreground"
          style={{ fontFamily: "var(--font-garamond-var)" }}
        >
          {formatCount(stats.countriesRepresented)}
        </p>
        <p className="text-xs text-muted-foreground">
          Countries represented
        </p>
      </div>

      {/* Top countries list */}
      <div className="rounded-2xl border border-border bg-background overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center gap-2">
          <GlobeIcon className="h-4 w-4 text-primary" />
          <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Top Countries
          </span>
        </div>

        {stats.topCountries.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No geographic data available.
          </p>
        ) : (
          <ul className="px-5 pb-5 space-y-2">
            {stats.topCountries.map((country, i) => (
              <li
                key={country.countryCode}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-xs tabular-nums text-muted-foreground/50 w-4 text-right">
                    {i + 1}
                  </span>
                  <span>{country.emoji}</span>
                  <span>{country.name}</span>
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {country.orgCount} organization{country.orgCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
