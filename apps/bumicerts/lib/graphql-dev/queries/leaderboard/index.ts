/**
 * Leaderboard query module.
 *
 * Aggregates funding receipts from the facilitator DID into a ranked
 * leaderboard of donors. All aggregation happens client-side — no
 * additional indexer queries are required.
 *
 * Filters:
 *   - Only USDC donations are counted
 *   - Period filter: "all" | "month" | "week"
 *
 * Donor identification:
 *   - Identified donors: `record.from.did`
 *   - Anonymous donors: wallet address extracted from `record.notes`
 *
 * Leaf: queries.leaderboard
 */

import { clientEnv } from "@/lib/env/client";
import * as fundingReceipts from "../fundingReceipts";
import type { FundingReceiptItem } from "../fundingReceipts";
import type { QueryModule } from "@/lib/graphql-dev/create-query";
import { extractDonor as extractDonorFromReceipt } from "@/lib/utils/extract-donor";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Period = "all" | "month" | "week";

export interface LeaderboardEntry {
  rank: number;
  donorId: string;
  donorType: "did" | "wallet";
  totalAmount: number;
  donationCount: number;
  lastDonatedAt: string | null;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  totalDonorsCount: number;
  totalAmountSum: number;
}

export interface Params {
  period?: Period;
  limit?: number;
}

export type Result = LeaderboardResult;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts donor identifier from a funding receipt.
 * Returns { id, type } where type is "did" or "wallet".
 */
function extractDonor(item: FundingReceiptItem): { id: string; type: "did" | "wallet" } | null {
  return extractDonorFromReceipt(item.record?.from);
}

/**
 * Filters receipts by time period.
 */
function filterByPeriod(receipts: FundingReceiptItem[], period: Period): FundingReceiptItem[] {
  if (period === "all") return receipts;

  const now = new Date();
  let cutoff: Date;

  if (period === "week") {
    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else {
    // month
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return receipts.filter((r) => {
    const dateStr = r.record?.occurredAt ?? r.record?.createdAt;
    if (!dateStr) return false;
    try {
      return new Date(dateStr) >= cutoff;
    } catch {
      return false;
    }
  });
}

/**
 * Aggregates receipts into leaderboard entries.
 */
function aggregateToLeaderboard(
  receipts: FundingReceiptItem[],
  period: Period,
  limit: number
): LeaderboardResult {
  // 1. Filter by period
  const filtered = filterByPeriod(receipts, period);

  // 2. Filter USDC only
  const usdcOnly = filtered.filter((r) => r.record?.currency === "USDC");

  // 3. Group by donor
  const donorMap = new Map<
    string,
    {
      type: "did" | "wallet";
      totalAmount: number;
      donationCount: number;
      lastDonatedAt: string | null;
    }
  >();

  for (const receipt of usdcOnly) {
    const donor = extractDonor(receipt);
    if (!donor) continue;

    const amount = parseFloat(receipt.record?.amount ?? "0");
    const dateStr = receipt.record?.occurredAt ?? receipt.record?.createdAt ?? null;

    const existing = donorMap.get(donor.id);
    if (existing) {
      existing.totalAmount += amount;
      existing.donationCount += 1;
      // Keep the most recent date
      if (dateStr && (!existing.lastDonatedAt || dateStr > existing.lastDonatedAt)) {
        existing.lastDonatedAt = dateStr;
      }
    } else {
      donorMap.set(donor.id, {
        type: donor.type,
        totalAmount: amount,
        donationCount: 1,
        lastDonatedAt: dateStr,
      });
    }
  }

  // 4. Convert to array and sort by totalAmount DESC
  const sorted = Array.from(donorMap.entries())
    .map(([donorId, data]) => ({
      donorId,
      donorType: data.type,
      totalAmount: data.totalAmount,
      donationCount: data.donationCount,
      lastDonatedAt: data.lastDonatedAt,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // 5. Apply limit and add ranks
  const entries: LeaderboardEntry[] = sorted.slice(0, limit).map((entry, index) => ({
    rank: index + 1,
    ...entry,
  }));

  // 6. Calculate totals
  const totalDonorsCount = donorMap.size;
  const totalAmountSum = sorted.reduce((sum, e) => sum + e.totalAmount, 0);

  return {
    entries,
    totalDonorsCount,
    totalAmountSum,
  };
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function fetch(params: Params): Promise<Result> {
  const facilitatorDid = clientEnv.NEXT_PUBLIC_FACILITATOR_DID ?? "";
  if (!facilitatorDid) {
    return { entries: [], totalDonorsCount: 0, totalAmountSum: 0 };
  }

  const receipts = await fundingReceipts.fetch({ did: facilitatorDid });
  return aggregateToLeaderboard(
    receipts,
    params.period ?? "all",
    params.limit ?? 100
  );
}

// ── Default options ───────────────────────────────────────────────────────────

export const defaultOptions = {
  staleTime: 60 * 1_000, // 1 minute — leaderboard can be slightly stale
} satisfies QueryModule<Params, Result>["defaultOptions"];
