"use client";

import { useState } from "react";
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, ExternalLinkIcon, BuildingIcon } from "lucide-react";
import { links } from "@/lib/links";
import type { OrgRow } from "../_utils/aggregations";

interface OrganizationsTableProps {
  rows: OrgRow[];
}

type SortKey = "totalRaised" | "bumicertCount" | "donorCount";
type SortDir = "asc" | "desc";

function truncateDid(did: string): string {
  const parts = did.split(":");
  const last = parts[parts.length - 1] ?? "";
  return `${parts.slice(0, 2).join(":")}:…${last.slice(-8)}`;
}

interface SortIconProps {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
}

function SortIcon({ col, sortKey, sortDir }: SortIconProps) {
  if (col !== sortKey) return <ChevronsUpDownIcon className="h-3 w-3 opacity-40" />;
  return sortDir === "asc"
    ? <ChevronUpIcon className="h-3 w-3" />
    : <ChevronDownIcon className="h-3 w-3" />;
}

interface ColProps {
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
  children: React.ReactNode;
}

function SortableCol({ col, sortKey, sortDir, onSort, children }: ColProps) {
  return (
    <th
      className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

export function OrganizationsTable({ rows }: OrganizationsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalRaised");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "totalRaised") cmp = a.totalRaised - b.totalRaised;
    else if (sortKey === "bumicertCount") cmp = a.bumicertCount - b.bumicertCount;
    else if (sortKey === "donorCount") cmp = a.donorCount - b.donorCount;
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center gap-2">
        <BuildingIcon className="h-4 w-4 text-primary" />
        <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          By Organization
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">No donations yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Organization
                </th>
                <SortableCol col="totalRaised" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Total Raised
                </SortableCol>
                <SortableCol col="bumicertCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Bumicerts
                </SortableCol>
                <SortableCol col="donorCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort}>
                  Donors
                </SortableCol>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.orgDid}
                  className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <a
                      href={links.account.byDid(row.orgDid)}
                      className="inline-flex items-center gap-1 font-mono text-xs text-foreground hover:text-primary transition-colors"
                      title={row.orgDid}
                    >
                      {truncateDid(row.orgDid)}
                      <ExternalLinkIcon className="h-3 w-3 opacity-60" />
                    </a>
                  </td>
                  <td className="py-2.5 px-3 text-foreground tabular-nums">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(row.totalRaised)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                    {row.bumicertCount}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground tabular-nums">
                    {row.donorCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
