/**
 * Leaderboard aggregation utilities.
 *
 * These helpers aggregate raw funding receipts into a ranked leaderboard.
 * They run client-side after fetching receipts via trpc.funding.receipts.
 */

import type { FundingReceiptItem } from "@/lib/graphql-dev/queries/fundingReceipts";
import { extractDonor as extractDonorFromReceipt } from "./extract-donor";

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * USD-pegged currencies accepted by the platform.
 * All are treated as equivalent to USD for display purposes.
 */
const USD_CURRENCIES: ReadonlyArray<string> = ["USD", "USDC"];

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
  const cutoff =
    period === "week"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
 * Aggregates funding receipts into a leaderboard result.
 *
 * Only USD-pegged currencies are counted. Donors are identified from
 * `record.from` as either DID-backed or wallet-backed donors.
 */
export function aggregateToLeaderboard(
  receipts: FundingReceiptItem[],
  period: Period = "all",
  limit: number = 100,
  includeAnonymous: boolean = true
): LeaderboardResult {
  // 1. Filter by period
  const filtered = filterByPeriod(receipts, period);

  // 2. Filter USD-pegged currencies only
  const usdOnly = filtered.filter((r) => {
    const currency = r.record?.currency?.toUpperCase();
    return currency ? USD_CURRENCIES.includes(currency) : false;
  });

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

  for (const receipt of usdOnly) {
    const donor = extractDonor(receipt);
    if (!donor) continue;

    // Filter anonymous donations if includeAnonymous is false
    if (!includeAnonymous && donor.type === "wallet") continue;

    const amount = parseFloat(receipt.record?.amount ?? "0");
    const dateStr = receipt.record?.occurredAt ?? receipt.record?.createdAt ?? null;

    const existing = donorMap.get(donor.id);
    if (existing) {
      existing.totalAmount += amount;
      existing.donationCount += 1;
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

  // Calculate total from entries that were actually aggregated
  const totalAmountSum = Array.from(donorMap.values()).reduce(
    (sum, data) => sum + data.totalAmount,
    0
  );

  return {
    entries,
    totalDonorsCount: donorMap.size,
    totalAmountSum,
  };
}
