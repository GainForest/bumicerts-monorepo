"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { HeartIcon, ExternalLinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import type { BumicertData } from "@/lib/types";
import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildActivityUri(bumicert: BumicertData): string {
  return `at://${bumicert.organizationDid}/org.hypercerts.claim.activity/${bumicert.rkey}`;
}

/**
 * Extracts a human-readable donor label from a funding receipt.
 *
 * - If anonymous: checks `notes` for "Anonymous donor wallet: 0x..." and
 *   returns a truncated version. Falls back to "Anonymous".
 * - If identified: the `from` field is { did: "did:..." }. Return a
 *   truncated form of the DID.
 */
function resolveDonorLabel(item: FundingReceiptItem): string {
  const notes = item.record?.notes;
  const from = item.record?.from as { did?: string } | null | undefined;

  // Anonymous path: wallet address is in notes
  if (notes) {
    const walletMatch = notes.match(/Anonymous donor wallet:\s*(0x[a-fA-F0-9]+)/i);
    if (walletMatch) {
      const addr = walletMatch[1];
      return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
    }
  }

  // Identified donor: DID in `from.did`
  if (from && typeof from === "object" && from.did) {
    const did = from.did;
    // Truncate long DIDs: show method:network:first8…last6
    const parts = did.split(":");
    if (parts.length >= 3) {
      const id = parts.slice(2).join(":");
      if (id.length > 18) {
        return `${parts[0]}:${parts[1]}:${id.slice(0, 8)}…${id.slice(-6)}`;
      }
    }
    return did;
  }

  return "Anonymous";
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DonationCard({
  item,
  index,
}: {
  item: FundingReceiptItem;
  index: number;
}) {
  const donor = resolveDonorLabel(item);
  const amount = parseFloat(item.record?.amount ?? "0");
  const currency = item.record?.currency ?? "USD";
  const txId = item.record?.transactionId;
  const occurredAt = item.record?.occurredAt ?? item.record?.createdAt;

  const relativeTime = useMemo(() => {
    if (!occurredAt) return null;
    try {
      return formatDistanceToNow(new Date(occurredAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [occurredAt]);

  const baseScanUrl = txId
    ? `https://basescan.org/tx/${txId}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex items-center gap-4 py-3 border-b border-border/60 last:border-0"
    >
      {/* Heart icon */}
      <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <HeartIcon className="h-3.5 w-3.5 text-primary" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            ${amount.toFixed(2)}{" "}
            <span className="font-normal text-muted-foreground">{currency}</span>
          </span>
          <span className="text-xs text-muted-foreground">from</span>
          <span className="text-xs font-mono text-foreground/70 truncate max-w-[140px]">
            {donor}
          </span>
        </div>
        {relativeTime && (
          <p className="text-xs text-muted-foreground mt-0.5">{relativeTime}</p>
        )}
      </div>

      {/* BaseScan link */}
      {baseScanUrl && (
        <a
          href={baseScanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
          title="View on BaseScan"
        >
          <ExternalLinkIcon className="h-3.5 w-3.5" />
        </a>
      )}
    </motion.div>
  );
}

function DonationsSkeleton() {
  return (
    <div className="space-y-1">
      {/* Total skeleton */}
      <Skeleton className="h-12 w-40 rounded-lg mb-4" />
      {/* Card skeletons */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 py-3 border-b border-border/60 last:border-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3.5 w-3.5 shrink-0" />
        </div>
      ))}
    </div>
  );
}

function TotalRaised({ receipts }: { receipts: FundingReceiptItem[] }) {
  const total = useMemo(() => {
    return receipts.reduce((sum, r) => sum + parseFloat(r.record?.amount ?? "0"), 0);
  }, [receipts]);

  return (
    <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 inline-flex flex-col">
      <span className="text-xs uppercase tracking-[0.12em] text-primary/70 font-medium">
        Total Raised
      </span>
      <span className="text-2xl font-bold text-primary mt-0.5">
        ${total.toFixed(2)}{" "}
        <span className="text-base font-normal text-primary/70">USD</span>
      </span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface DonationsSectionProps {
  bumicert: BumicertData;
}

export function DonationsSection({ bumicert }: DonationsSectionProps) {
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";
  const activityUri = buildActivityUri(bumicert);

  // When facilitatorDid is empty the module's `enabled()` returns false — query is skipped.
  const { data: allReceipts, isLoading } = indexerTrpc.funding.receipts.useQuery(
    { did: facilitatorDid },
    { enabled: !!facilitatorDid }
  );

  // Filter receipts to only those `for` this bumicert's AT-URI
  const receipts = useMemo(() => {
    if (!allReceipts) return [];
    return (allReceipts as FundingReceiptItem[]).filter((r) => r.record?.for === activityUri);
  }, [allReceipts, activityUri]);

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <DonationsSkeleton />;
  }

  // ── No facilitator DID configured ───────────────────────────────────────────

  if (!facilitatorDid) {
    return (
      <p className="text-sm text-muted-foreground">
        Donation history unavailable.
      </p>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────────

  if (receipts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
        <HeartIcon className="h-8 w-8 opacity-25" />
        <p className="text-sm font-medium">No donations yet</p>
        <p className="text-xs">Be the first to support this project!</p>
      </div>
    );
  }

  // ── Populated ────────────────────────────────────────────────────────────────

  return (
    <div>
      <TotalRaised receipts={receipts} />
      <div>
        {receipts.map((item, i) => (
          <DonationCard
            key={item.metadata?.uri ?? i}
            item={item}
            index={i}
          />
        ))}
      </div>
    </div>
  );
}
