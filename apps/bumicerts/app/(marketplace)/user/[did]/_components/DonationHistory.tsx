"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { HeartIcon, ExternalLinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { indexerTrpc } from "@/lib/trpc/indexer/client";
import { clientEnv } from "@/lib/env/client";
import Link from "next/link";
import { links } from "@/lib/links";
import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";

interface DonationHistoryProps {
  userDid: string;
}

/**
 * Extracts the AT-URI from a StrongRef object or returns null.
 */
function extractUriFromStrongRef(strongRef: unknown): string | null {
  if (!strongRef || typeof strongRef !== "object") return null;
  const ref = strongRef as Record<string, unknown>;
  return typeof ref.uri === "string" ? ref.uri : null;
}

/**
 * Extracts bumicert did and rkey from an activity URI.
 * at://did:plc:xxx/org.hypercerts.claim.activity/rkey → { did, rkey }
 */
function extractBumicertInfo(uri: string): { did: string; rkey: string } | null {
  // Format: at://did:plc:xxx/org.hypercerts.claim.activity/rkey
  const match = uri.match(/^at:\/\/(did:[^/]+)\/[^/]+\/(.+)$/);
  if (!match) return null;
  return { did: match[1], rkey: match[2] };
}

function DonationCard({
  item,
  index,
}: {
  item: FundingReceiptItem;
  index: number;
}) {
  const amount = parseFloat(item.record?.amount ?? "0");
  const txId = item.record?.transactionId;
  const occurredAt = item.record?.occurredAt ?? item.record?.createdAt;
  const forUri = extractUriFromStrongRef(item.record?.for);
  const bumicertInfo = forUri ? extractBumicertInfo(forUri) : null;

  const relativeTime = useMemo(() => {
    if (!occurredAt) return null;
    try {
      return formatDistanceToNow(new Date(occurredAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [occurredAt]);

  const baseScanUrl = txId ? `https://basescan.org/tx/${txId}` : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: 0.2,
        delay: index * 0.03,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
    >
      {/* Heart icon */}
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <HeartIcon className="h-3 w-3 text-primary" />
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            ${amount.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          {bumicertInfo ? (
            <Link
              href={links.bumicert.view(bumicertInfo.did, bumicertInfo.rkey)}
              className="text-xs text-primary hover:underline truncate"
            >
              View bumicert
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground truncate">
              Unknown bumicert
            </span>
          )}
        </div>
        {relativeTime && (
          <p className="text-xs text-muted-foreground">{relativeTime}</p>
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
          <ExternalLinkIcon className="h-3 w-3" />
        </a>
      )}
    </motion.div>
  );
}

function DonationsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-7 w-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-3 w-3 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DonationHistory({ userDid }: DonationHistoryProps) {
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";

  // Fetch all funding receipts from the facilitator
  const { data: allReceipts, isLoading } = indexerTrpc.funding.receipts.useQuery(
    { did: facilitatorDid },
    { enabled: !!facilitatorDid }
  );

  // Filter receipts where from.did matches the user's DID
  const userDonations = useMemo(() => {
    if (!allReceipts) return [];
    return (allReceipts as FundingReceiptItem[]).filter((receipt: FundingReceiptItem) => {
      const from = receipt.record?.from;
      if (!from || typeof from !== "object" || Array.isArray(from)) return false;
      const obj = from as Record<string, unknown>;
      return obj.$type === "app.certified.defs#did" && obj.did === userDid;
    });
  }, [allReceipts, userDid]);

  const totalDonated = useMemo(() => {
    return userDonations.reduce((sum: number, receipt: FundingReceiptItem) => {
      const amount = parseFloat(receipt.record?.amount ?? "0");
      return sum + amount;
    }, 0);
  }, [userDonations]);

  if (isLoading) {
    return (
      <div className="w-full space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Donation History
        </h2>
        <DonationsSkeleton />
      </div>
    );
  }

  if (userDonations.length === 0) {
    return (
      <div className="w-full space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Donation History
        </h2>
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No donations yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Donation History
        </h2>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Total Donated</p>
            <p className="text-xl font-bold text-foreground">
              ${totalDonated.toFixed(2)}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground mb-1">Donations</p>
            <p className="text-xl font-bold text-foreground">
              {userDonations.length}
            </p>
          </div>
        </div>

        {/* Donations list */}
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="divide-y divide-border">
            {userDonations.map((item: FundingReceiptItem, index: number) => (
              <DonationCard key={item.metadata?.uri ?? index} item={item} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
