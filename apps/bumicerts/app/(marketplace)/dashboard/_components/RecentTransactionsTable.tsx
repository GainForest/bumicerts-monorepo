"use client";

import { ExternalLinkIcon, ClockIcon } from "lucide-react";
import { blockExplorerUrl } from "../_utils/aggregations";
import type { TransactionRow } from "../_utils/aggregations";
import { UserChip } from "@/components/ui/user-chip";
import { links } from "@/lib/links";
import Link from "next/link";

interface RecentTransactionsTableProps {
  rows: TransactionRow[];
}

function formatWalletAddress(address: string): string {
  const truncated = address.length > 12
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : address;
  return `Anonymous (${truncated})`;
}

/**
 * Extracts bumicert did and rkey from an activity AT URI.
 * Format: at://did:plc:xxx/org.hypercerts.claim.activity/rkey
 */
function parseBumicertUri(uri: string): { did: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/(did:[^/]+)\/[^/]+\/(.+)$/);
  if (!match) return null;
  return { did: match[1], rkey: match[2] };
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
                    {!row.donorId ? (
                      <span className="text-xs text-foreground">Anonymous</span>
                    ) : row.donorType === "wallet" ? (
                      <span className="text-xs text-foreground" title={row.donorId}>
                        {formatWalletAddress(row.donorId)}
                      </span>
                    ) : (
                      <UserChip 
                        did={row.donorId}
                        avatarSize={18}
                        showCopyButton="hover"
                        linkMode="user-page"
                        className="border !border-transparent hover:!border-border"
                      />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-foreground tabular-nums font-medium whitespace-nowrap">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(row.amount)}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground font-mono text-xs">
                    {(() => {
                      if (!row.bumicertUri) return "—";
                      const parsed = parseBumicertUri(row.bumicertUri);
                      if (!parsed) return "—";
                      return (
                        <Link
                          href={links.bumicert.view(parsed.did, parsed.rkey)}
                          className="text-primary hover:underline"
                          title="View bumicert"
                        >
                          {parsed.rkey}
                        </Link>
                      );
                    })()}
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
