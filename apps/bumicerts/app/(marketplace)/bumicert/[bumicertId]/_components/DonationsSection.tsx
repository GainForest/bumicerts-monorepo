"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { HeartIcon, ExternalLinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { UserChip } from "@/components/ui/user-chip";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import type { BumicertData } from "@/lib/types";
import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";
import { extractDonor } from "@/lib/utils/extract-donor";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildActivityUri(bumicert: BumicertData): string {
  return `at://${bumicert.organizationDid}/org.hypercerts.claim.activity/${bumicert.rkey}`;
}

/**
 * Extracts the AT-URI from a StrongRef object or returns null.
 * The `for` field is now a StrongRef: { uri: string, cid: string }
 */
function extractUriFromStrongRef(strongRef: unknown): string | null {
  if (!strongRef || typeof strongRef !== "object") return null;
  const ref = strongRef as Record<string, unknown>;
  return typeof ref.uri === "string" ? ref.uri : null;
}

/**
 * Extracts donor info from a funding receipt.
 * Returns { type: "did", did: string } or { type: "wallet", label: string }
 */
function resolveDonorInfo(item: FundingReceiptItem): 
  | { type: "did"; did: string }
  | { type: "wallet"; label: string } {
  const donor = extractDonor(item.record?.from);

  if (!donor) {
    return { type: "wallet", label: "Anonymous" };
  }

  if (donor.type === "did") {
    return { type: "did", did: donor.id };
  }

  // Anonymous donor with wallet address
  const addr = donor.id;
  return { type: "wallet", label: `Anonymous (${addr.slice(0, 6)}…${addr.slice(-4)})` };
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DonationCard({
  item,
  index,
}: {
  item: FundingReceiptItem;
  index: number;
}) {
  const donorInfo = resolveDonorInfo(item);
  const amount = parseFloat(item.record?.amount ?? "0");
  const rawCurrency = item.record?.currency ?? "USD";
  const currency = ["USD", "USDC"].includes(rawCurrency.toUpperCase()) ? "USD" : rawCurrency;
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            ${amount.toFixed(2)}{" "}
            <span className="font-normal text-muted-foreground">{currency}</span>
          </span>
          <span className="text-xs text-muted-foreground">from</span>
          {donorInfo.type === "did" ? (
            <UserChip 
              did={donorInfo.did}
              showCopyButton="hover"
              linkMode="user-page"
              className="border !border-transparent hover:!border-border"
            />
          ) : (
            <span className="text-xs font-mono text-foreground/70 truncate max-w-[140px]">
              {donorInfo.label}
            </span>
          )}
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
    return (allReceipts as FundingReceiptItem[]).filter((r) => {
      const forUri = extractUriFromStrongRef(r.record?.for);
      return forUri === activityUri;
    });
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
