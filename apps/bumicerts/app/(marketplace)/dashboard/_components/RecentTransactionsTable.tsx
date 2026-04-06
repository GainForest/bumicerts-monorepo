"use client";

import { ExternalLinkIcon, ClockIcon } from "lucide-react";
import { blockExplorerUrl } from "../_utils/aggregations";
import type { TransactionRow } from "../_utils/aggregations";

interface RecentTransactionsTableProps {
  rows: TransactionRow[];
}

function truncateId(id: string): string {
  if (id.startsWith("did:")) {
    const parts = id.split(":");
    const last = parts[parts.length - 1] ?? "";
    return `${parts.slice(0, 2).join(":")}:…${last.slice(-6)}`;
  }
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

function formatDonorLabel(donorId: string | null, donorType: "did" | "wallet" | null): string {
  if (!donorId) return "Anonymous";
  
  const truncated = truncateId(donorId);
  if (donorType === "wallet") {
    return `Anonymous (${truncated})`;
  }
  return truncated;
}

function truncateBumicertUri(uri: string): string {
  // at://did:plc:xxx/org.hypercerts.claim.activity/rkey → last segment
  const parts = uri.split("/");
  return parts[parts.length - 1] ?? uri;
}

export function RecentTransactionsTable({ rows }: RecentTransactionsTableProps) {
  return (
    <div className="rounded-2xl border border-border bg-background overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-primary" />
            <span className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
              Recent Transactions
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            All time · {rows.length} donation{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground/50 shrink-0 mt-1">
          showing latest 50
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-border">
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Date
                </th>
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Donor
                </th>
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Amount
                </th>
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Bumicert
                </th>
                <th className="py-2 px-3 text-left text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
                  Tx Hash
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.uri}
                  className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                >
                  <td className="py-2.5 px-3 text-muted-foreground text-xs whitespace-nowrap">
                    {row.date
                      ? new Date(row.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="text-xs text-foreground"
                      title={row.donorId ?? undefined}
                    >
                      {formatDonorLabel(row.donorId, row.donorType)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-foreground tabular-nums font-medium whitespace-nowrap">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(row.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                    {row.bumicertUri ? (
                      <span title={row.bumicertUri}>
                        {truncateBumicertUri(row.bumicertUri)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {(() => {
                      const url = blockExplorerUrl(row.txHash, row.paymentNetwork);
                      return url && row.txHash ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                          title={row.txHash}
                        >
                          {`${row.txHash.slice(0, 8)}…${row.txHash.slice(-6)}`}
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      );
                    })()}
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
